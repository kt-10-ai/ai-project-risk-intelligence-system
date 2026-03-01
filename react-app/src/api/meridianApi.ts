// Meridian API Client — TypeScript port of meridian-api.js
// Backend: REST http://localhost:8000 | WS ws://localhost:8000/ws/analysis

const BASE = '/api';
const WS_URL = `ws://${window.location.hostname}:8000/ws/analysis`;

// ── Types ─────────────────────────────────────────────────────────────────

export interface MonteCarloData {
    n_simulations: number;
    mean_score: number;
    median_score: number;
    std_deviation: number;
    percentile_5: number;
    percentile_95: number;
    confidence_interval: { lower: number; upper: number };
    risk_level_distribution: Record<string, number>;
    probability_critical: number;
    probability_above_current: number;
    current_score: number;
    verdict: string;
}

export interface SignalValue {
    value: number;
    score: number;
}

export interface AgentResult {
    agent: string;
    risk_contribution: number;
    confidence: number;
    top_risks: string[];
    evidence: string[];
    reasoning: string;
    signal_refs: string[];
}

export interface RiskAnalysis {
    risk_score: number;
    risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
    agent_scores: Record<string, number>;
    dominant_risk: string;
    interaction_penalty: number;
    agents: AgentResult[];
    signals: { signals: Record<string, SignalValue>; metadata: Record<string, string> };
    timestamp: string;
    formula_version: string;
    monte_carlo?: MonteCarloData;
}

export interface SimulationMutation {
    type: 'add_developers' | 'extend_deadline' | 'remove_scope' | 'close_prs';
    count?: number;
    days?: number;
    task_count?: number;
    pr_count?: number;
}

export interface SimulationResult {
    baseline: { total_score: number; risk_level: string; agent_scores: Record<string, number> };
    simulated: { total_score: number; risk_level: string; agent_scores: Record<string, number> };
    delta: {
        total_score: number;
        risk_level_changed: boolean;
        agent_deltas: Record<string, number>;
    };
}

export type WebSocketCallbacks = {
    onConnected?: () => void;
    onSignalsReady?: (signals: unknown) => void;
    onAgentStart?: (agent: string) => void;
    onAgentComplete?: (agent: string, data: AgentResult) => void;
    onRiskScoreReady?: (data: RiskAnalysis) => void;
    onComplete?: () => void;
    onError?: (msg: string) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────

export function riskColor(score: number): 'critical' | 'warning' | 'success' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'warning';
    return 'success';
}

export function riskHex(score: number): string {
    if (score >= 75) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    return '#22c55e';
}

export function toDisplayScore(raw: number): number {
    return Math.round(raw * 100);
}

export function toTitle(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const AGENT_LABELS: Record<string, string> = {
    dependency: 'Dependency',
    workload: 'Workload',
    scope: 'Scope',
    delay: 'Delay',
    comms: 'Comms',
};

export const SIGNAL_META: Record<string, { label: string; unit: string; group: string }> = {
    blocked_task_ratio: { label: 'Blocked Task Ratio', unit: '', group: 'dependency' },
    critical_path_depth: { label: 'Critical Path Depth', unit: '', group: 'dependency' },
    dependency_centrality_max: { label: 'Dependency Centrality', unit: '', group: 'dependency' },
    overloaded_dev_ratio: { label: 'Overloaded Dev Ratio', unit: '', group: 'workload' },
    task_concentration_index: { label: 'Task Concentration', unit: '', group: 'workload' },
    unassigned_task_ratio: { label: 'Unassigned Task Ratio', unit: '', group: 'workload' },
    mid_sprint_task_additions: { label: 'Mid-Sprint Additions', unit: ' tasks', group: 'scope' },
    scope_growth_rate: { label: 'Scope Growth Rate', unit: '', group: 'scope' },
    out_of_scope_pr_count: { label: 'Orphan PR Count', unit: ' PRs', group: 'scope' },
    overdue_task_ratio: { label: 'Overdue Task Ratio', unit: '', group: 'delay' },
    stale_task_ratio: { label: 'Stale PR Ratio', unit: '', group: 'delay' },
    avg_pr_age_days: { label: 'Avg PR Age', unit: 'd', group: 'delay' },
    silent_dev_ratio: { label: 'Silent Developer Count', unit: '', group: 'comms' },
    unanswered_thread_ratio: { label: 'Unanswered Thread Ratio', unit: '', group: 'comms' },
    escalation_keyword_count: { label: 'Escalation Keywords', unit: '', group: 'comms' },
};

// ── REST Calls ────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string }> {
    const r = await fetch(`${BASE}/health`);
    return r.json();
}

export async function getAnalysis(): Promise<RiskAnalysis> {
    const r = await fetch(`${BASE}/analysis`);
    if (!r.ok) throw new Error(`Analysis fetch failed: ${r.status}`);
    return r.json();
}

export async function simulate(mutation: SimulationMutation): Promise<SimulationResult> {
    const r = await fetch(`${BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mutation),
    });
    if (!r.ok) throw new Error(`Simulation failed: ${r.status}`);
    return r.json();
}

export async function fetchMonteCarlo(): Promise<MonteCarloData> {
    const response = await fetch(`${BASE}/monte-carlo`);
    if (!response.ok) throw new Error('Monte Carlo fetch failed');
    return response.json();
}

// ── WebSocket ─────────────────────────────────────────────────────────────

let _ws: WebSocket | null = null;

export function connectWebSocket(callbacks: WebSocketCallbacks = {}): WebSocket {
    if (_ws && _ws.readyState < 2) _ws.close();
    _ws = new WebSocket(WS_URL);
    _ws.onopen = () => { };
    _ws.onmessage = (e) => {
        let msg: { event: string; agent?: string; data?: unknown; message?: string };
        try { msg = JSON.parse(e.data); } catch { return; }
        switch (msg.event) {
            case 'connected': callbacks.onConnected?.(); break;
            case 'signals_ready': callbacks.onSignalsReady?.(msg.data); break;
            case 'agent_start': callbacks.onAgentStart?.(msg.agent!); break;
            case 'agent_complete': callbacks.onAgentComplete?.(msg.agent!, msg.data as AgentResult); break;
            case 'risk_score_ready': callbacks.onRiskScoreReady?.(msg.data as RiskAnalysis); break;
            case 'complete': callbacks.onComplete?.(); break;
            case 'error': callbacks.onError?.(msg.message!); break;
        }
    };
    _ws.onerror = () => callbacks.onError?.('WebSocket connection failed');
    _ws.onclose = () => { };
    return _ws;
}

export function closeWebSocket(): void {
    if (_ws) _ws.close();
}

const MeridianAPI = {
    getHealth, getAnalysis, simulate,
    connectWebSocket, closeWebSocket,
    riskColor, riskHex, toDisplayScore, toTitle,
    AGENT_LABELS, SIGNAL_META,
};

export default MeridianAPI;
