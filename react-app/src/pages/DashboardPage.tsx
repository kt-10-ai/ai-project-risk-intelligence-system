import { useRef } from 'react';
import Layout from '../components/Layout';
import RiskBadge, { levelFromScore } from '../components/RiskBadge';
import RiskBar from '../components/RiskBar';
import { simulate } from '../api/meridianApi';
import type { SimulationMutation } from '../api/meridianApi';
import { useNavigate } from 'react-router-dom';
import { useRisk } from '../context/RiskContext';
import { useState } from 'react';

const CIRC = 2 * Math.PI * 70;

function getRiskHex(score: number): string {
    if (score >= 0.8) return '#ef4444';
    if (score >= 0.6) return '#f97316';
    if (score >= 0.4) return '#eab308';
    return '#22c55e';
}

const AGENT_ROUTES: Record<string, string> = {
    dependency_agent: '/dependency', workload_agent: '/workload',
    scope_agent: '/scope', delay_agent: '/delay', comms_agent: '/comms',
};
const AGENT_LABELS: Record<string, string> = {
    dependency_agent: 'Dependency', workload_agent: 'Workload',
    scope_agent: 'Scope', delay_agent: 'Delay', comms_agent: 'Comms',
};

const SIM_CARDS = [
    { label: 'Add 2 Senior Devs', mutType: 'add_developers' as const, param: { count: 2 }, id: 'delta1' },
    { label: 'Extend Deadline +2w', mutType: 'extend_deadline' as const, param: { days: 14 }, id: 'delta2' },
    { label: "Remove 'Cart' Scope", mutType: 'remove_scope' as const, param: { task_count: 1 }, id: 'delta3' },
    { label: 'Close Open PRs Now', mutType: 'close_prs' as const, param: { pr_count: 5 }, id: 'delta4' },
];

export default function DashboardPage() {
    const navigate = useNavigate();
    const { analysis, liveFeed, lastUpdated, loading, error, refresh, backendOnline } = useRisk();
    const feedRef = useRef<HTMLDivElement>(null);
    const [simResults, setSimResults] = useState<Record<string, { score: string; delta: string; color: string }>>({});

    async function runSimulation(card: typeof SIM_CARDS[0]) {
        const mutation: SimulationMutation = { type: card.mutType, ...card.param };
        try {
            const res = await simulate(mutation);
            const delta = res.delta.total_score;
            const after = res.simulated.total_score;
            const color = delta < 0 ? '#22c55e' : '#ef4444';
            const dir = delta < 0 ? '▼' : '▲';
            setSimResults(prev => ({
                ...prev,
                [card.id]: {
                    score: after.toFixed(1),
                    delta: `${dir} ${Math.abs(delta).toFixed(1)} pts`,
                    color,
                },
            }));
        } catch { /* ignore */ }
    }

    const score100 = analysis ? analysis.risk_score : 0;
    const gaugeOffset = CIRC - (score100 / 100) * CIRC;
    const gaugeColor = analysis ? getRiskHex(analysis.risk_score / 100) : '#1e1e2d';
    const riskLevel = analysis?.risk_level ?? 'PENDING';

    const agentScoresMap = analysis?.agent_scores ?? { dependency: 0, workload: 0, scope: 0, delay: 0, comms: 0 };
    const agentOrder = ['dependency', 'workload', 'scope', 'delay', 'comms'];

    return (
        <Layout lastUpdated={lastUpdated} onRunAnalysis={refresh}>

            {/* Backend error banner */}
            {error && (
                <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-500/40 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-400">warning</span>
                    <span className="text-red-300 text-sm">{error}</span>
                </div>
            )}

            {/* Loading pulse */}
            {loading && (
                <div className="mb-4 px-4 py-3 bg-[#6764f2]/10 border border-[#6764f2]/30 rounded-lg flex items-center gap-3">
                    <span className="animate-spin material-symbols-outlined text-[#6764f2]">sync</span>
                    <span className="text-[#a5b4fc] text-sm">Connecting to Meridian agents…</span>
                </div>
            )}

            {/* Row 1: Composite Risk & Agent Matrix */}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[400px] transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {/* Risk Gauge */}
                <div className="lg:col-span-4 bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6764f2]/5 to-transparent pointer-events-none" />
                    <h3 className="text-slate-400 text-sm font-bold tracking-wider mb-6 z-10 uppercase">Composite Risk Score</h3>
                    <div className="relative size-[220px] flex items-center justify-center z-10">
                        <svg className="size-full -rotate-90" viewBox="0 0 160 160">
                            <circle cx="80" cy="80" fill="none" r="70" stroke="#282839" strokeWidth="12" />
                            <circle className="gauge-arc" cx="80" cy="80" fill="none" r="70"
                                stroke={gaugeColor} strokeLinecap="round" strokeWidth="12"
                                style={{ strokeDasharray: CIRC, strokeDashoffset: gaugeOffset }} />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-[64px] font-bold text-white leading-none tracking-tighter">{score100.toFixed(1)}</span>
                            <span className="text-xs font-mono text-slate-400 mt-2">
                                {backendOnline ? '● LIVE' : 'last known'}
                            </span>
                        </div>
                    </div>
                    <div className={`mt-6 px-4 py-1.5 rounded border text-sm font-bold tracking-widest z-10`}
                        style={{ color: gaugeColor, borderColor: gaugeColor, background: `${gaugeColor}15` }}>
                        {riskLevel} STATUS
                    </div>
                </div>

                {/* Agent Activity Matrix */}
                <div className="lg:col-span-8 bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-slate-400 text-sm font-bold tracking-wider uppercase">Agent Activity Matrix</h3>
                        <button className="text-[#6764f2] text-xs font-bold hover:underline" onClick={() => navigate('/report')}>VIEW DETAILED REPORT</button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs text-slate-500 border-b border-[#1e1e2d]">
                                    <th className="pb-3 font-medium pl-2">AGENT</th>
                                    <th className="pb-3 font-medium">IMPACT SCORE</th>
                                    <th className="pb-3 font-medium w-1/3">TREND ANALYSIS</th>
                                    <th className="pb-3 font-medium text-right pr-2">STATUS</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {analysis?.agents?.map(agent => {
                                    const score100 = Math.round(agent.risk_contribution * 100);
                                    const hex = getRiskHex(agent.risk_contribution);
                                    const label = levelFromScore(score100);
                                    const isDominant = agent.agent === `${analysis.dominant_risk}_agent`;
                                    const route = AGENT_ROUTES[agent.agent] ?? '/agents';
                                    return (
                                        <tr key={agent.agent}
                                            onClick={() => navigate(route)}
                                            className="group hover:bg-white/5 transition-colors border-b border-[#1e1e2d]/50 cursor-pointer"
                                            style={isDominant ? { borderLeft: `2px solid ${hex}` } : {}}>
                                            <td className="py-4 pl-2 font-medium text-white">
                                                {AGENT_LABELS[agent.agent] ?? agent.agent}
                                                {isDominant && <span className="ml-1 material-symbols-outlined text-[16px] text-red-400 animate-pulse">warning</span>}
                                            </td>
                                            <td className="py-4 font-mono" style={{ color: hex }}>{(agent.risk_contribution * 100).toFixed(1)}</td>
                                            <td className="py-4"><RiskBar score100={score100} /></td>
                                            <td className="py-4 text-right pr-2"><RiskBadge level={label} /></td>
                                        </tr>
                                    );
                                }) ?? (
                                        // Static placeholders if no data yet
                                        [['Dependency', '0.0', 'PENDING', '/dependency'], ['Workload', '0.0', 'PENDING', '/workload'], ['Scope', '0.0', 'PENDING', '/scope'],
                                        ['Delay', '0.0', 'PENDING', '/delay'], ['Comms', '0.0', 'PENDING', '/comms']].map(([name, score, status, path]) => (
                                            <tr key={name} onClick={() => navigate(path as string)}
                                                className="group hover:bg-white/5 transition-colors border-b border-[#1e1e2d]/50 cursor-pointer">
                                                <td className="py-4 pl-2 font-medium text-white">{name}</td>
                                                <td className="py-4 font-mono text-slate-500">{score}</td>
                                                <td className="py-4"><RiskBar score100={parseFloat(score as string)} /></td>
                                                <td className="py-4 text-right pr-2"><RiskBadge level={status as string} /></td>
                                            </tr>
                                        ))
                                    )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Row 2: Live Feed, Cascade Chart, Penalties */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Live Intelligence Feed */}
                <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6 flex flex-col h-96">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6764f2] opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6764f2]" />
                        </span>
                        <h3 className="text-slate-400 text-sm font-bold tracking-wider uppercase">Live Agent Intelligence</h3>
                    </div>
                    <div ref={feedRef} className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                        {liveFeed.length === 0 ? (
                            <div className="text-[#6764f2] text-xs font-mono">● {loading ? 'CONNECTING…' : 'WAITING FOR NEXT CYCLE…'}</div>
                        ) : liveFeed.map((item, i) => (
                            <div key={i} className="p-3 bg-[#1e1e2d]/30 rounded-r" style={{ borderLeft: `2px solid ${item.color}` }}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-mono font-bold" style={{ color: item.color }}>AGENT: {item.name}</span>
                                    <span className="text-[10px] text-slate-500">{item.time}</span>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Risk Cascade Chart */}
                <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6 flex flex-col h-96">
                    <h3 className="text-slate-400 text-sm font-bold tracking-wider uppercase mb-6">Risk Contribution Cascade</h3>
                    <div className="flex-1 flex items-end justify-between gap-2 px-2">
                        {agentOrder.map(name => {
                            const score = (agentScoresMap[name] ?? 0);
                            const hex = getRiskHex(score);
                            const heightPct = Math.round(score * 100);
                            const pxHeight = Math.round(score * 200);
                            return (
                                <div key={name} className="w-full flex flex-col items-center justify-end gap-2 group h-full">
                                    <div className="w-full relative" style={{ height: `${pxHeight}px`, minHeight: '4px', background: hex, borderRadius: '3px 3px 0 0', transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)', alignSelf: 'flex-end' }}>
                                        {score > 0 && <div className="absolute -top-6 w-full text-center text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity font-bold">{heightPct}%</div>}
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase">{name.slice(0, 3).toUpperCase()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Interaction Penalties */}
                <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6 flex flex-col h-96">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-400 text-sm font-bold tracking-wider uppercase">Interaction Penalties</h3>
                        <div className="px-2 py-1 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded text-[#ef4444] font-mono font-bold text-xs">
                            +{(analysis?.interaction_penalty ?? 0.00).toFixed(2)} PENALTY
                        </div>
                    </div>
                    <div className="space-y-3 overflow-auto">
                        {analysis ? [
                            { title: 'DEPENDENCY × DELAY', desc: 'High coupling detected between stalled payments module and critical path tasks.', color: '#ef4444', pct: 80 },
                            { title: 'WORKLOAD × COMMS', desc: 'High workload on Tech Lead causing communication bottlenecks in PR reviews.', color: '#f59e0b', pct: 45 },
                            { title: 'SCOPE × DELAY', desc: 'Scope creep detected, but currently mitigated by buffer time.', color: '#475569', pct: 20 },
                        ].map(p => (
                            <div key={p.title} className="bg-[#1a1a24] border border-[#1e1e2d] rounded-lg p-3" style={{ borderLeftColor: p.color, borderLeftWidth: 2 }}>
                                <div className="text-xs font-bold text-slate-300 mb-1">{p.title}</div>
                                <p className="text-[11px] text-slate-500 leading-normal">{p.desc}</p>
                                <div className="mt-2 w-full h-1 bg-[#1e1e2d] rounded-full">
                                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} />
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-10 text-center gap-3">
                                <span className="material-symbols-outlined text-3xl opacity-50">account_tree</span>
                                <p>Run analysis to detect high-risk structural interactions</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: What-If Simulator */}
            <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-[#1e1e2d] pb-4">
                    <span className="material-symbols-outlined text-[#6764f2]">tune</span>
                    <h3 className="text-white text-base font-bold tracking-tight">What-If Risk Projection Simulator</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {SIM_CARDS.map(card => {
                        const res = simResults[card.id];
                        return (
                            <div key={card.id}
                                className="bg-[#0a0a0f] border border-[#1e1e2d] rounded-lg p-4 flex flex-col gap-3 group hover:border-[#6764f2]/50 transition-colors cursor-pointer"
                                onClick={() => runSimulation(card)}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-300">{card.label}</span>
                                    <button type="button"
                                        className="size-4 rounded-full border border-slate-500 group-hover:border-[#6764f2] group-hover:bg-[#6764f2] transition-colors" />
                                </div>
                                <div className="flex items-end justify-between mt-auto">
                                    <span className="text-xs text-slate-500">Projected Risk</span>
                                    {res ? (
                                        <span className="text-lg font-bold" style={{ color: res.color }}>
                                            {res.score} <span className="text-xs font-normal">{res.delta}</span>
                                        </span>
                                    ) : (
                                        <span className="text-lg font-bold text-slate-400">Click to simulate</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Row 4: Mitigation Strategy */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-full mb-2">
                    <h3 className="text-white text-base font-bold tracking-tight">Prioritized Mitigation Strategy</h3>
                </div>
                {[
                    { priority: 1, title: 'Address Release Delay', desc: 'Immediate resource allocation required for auth-service. Consider descoping non-critical bug fixes.', color: '#ef4444', action: 'Assign Action Item', path: '/delay' },
                    { priority: 2, title: 'Reduce Workload Saturation', desc: "Rebalance tickets from overloaded developers. Current saturation prevents effective code review.", color: '#f59e0b', action: 'View Team Capacity', path: '/workload' },
                    { priority: 3, title: 'Dependency Audit', desc: 'Schedule review of payments-v2 API changes with external vendor to prevent breaking changes.', color: '#6764f2', action: 'Schedule Meeting', path: '/dependency' },
                ].map(s => (
                    <div key={s.priority}
                        className="bg-[#12121a] border border-[#1e1e2d] rounded-lg p-5"
                        style={{ borderTopColor: s.color, borderTopWidth: 4 }}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="px-2 py-0.5 rounded bg-[#1e1e2d] text-xs font-mono text-slate-300">PRIORITY {s.priority}</div>
                            <span className="material-symbols-outlined text-slate-500">more_horiz</span>
                        </div>
                        <h4 className="text-white font-bold mb-2">{s.title}</h4>
                        <p className="text-sm text-slate-400 mb-4">{s.desc}</p>
                        <button
                            onClick={() => navigate(s.path)}
                            className="w-full py-2 bg-[#1e1e2d] hover:bg-slate-700 transition-colors rounded text-sm font-medium text-white">
                            {s.action}
                        </button>
                    </div>
                ))}
            </div>
        </Layout>
    );
}
