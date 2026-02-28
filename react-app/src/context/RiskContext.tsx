// RiskContext — shared live analysis data across all pages.
// Uses WebSocket for real-time updates, falls back to REST GET /api/analysis.

import {
    createContext, useContext, useEffect, useState, useCallback, useRef,
    type ReactNode,
} from 'react';
import {
    getAnalysis, connectWebSocket, closeWebSocket,
    type RiskAnalysis, type AgentResult,
} from '../api/meridianApi';

interface LiveFeedItem {
    color: string;
    name: string;
    time: string;
    text: string;
}

interface RiskContextValue {
    analysis: RiskAnalysis | null;
    loading: boolean;
    error: string | null;
    liveFeed: LiveFeedItem[];
    lastUpdated: string;
    refresh: () => void;
    backendOnline: boolean;
}

const RiskContext = createContext<RiskContextValue>({
    analysis: null,
    loading: true,
    error: null,
    liveFeed: [],
    lastUpdated: 'Loading…',
    refresh: () => { },
    backendOnline: false,
});

function getRiskHex(score: number): string {
    if (score >= 0.8) return '#ef4444';
    if (score >= 0.6) return '#f97316';
    if (score >= 0.4) return '#eab308';
    return '#22c55e';
}

export function RiskProvider({ children }: { children: ReactNode }) {
    const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);
    const [lastUpdated, setLastUpdated] = useState('Loading…');
    const [backendOnline, setBackendOnline] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const applyAnalysis = useCallback((d: RiskAnalysis) => {
        setAnalysis(d);
        setBackendOnline(true);
        setError(null);
        setLastUpdated(
            d.timestamp
                ? d.timestamp.replace('T', ' ').slice(0, 19) + ' UTC'
                : new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        );
        setLoading(false);
    }, []);

    const connect = useCallback(() => {
        setLoading(true);
        setLiveFeed([]);
        setLastUpdated('Running Analysis…');
        // Close previous socket
        if (wsRef.current && wsRef.current.readyState < 2) wsRef.current.close();

        const ws = connectWebSocket({
            onConnected: () => setBackendOnline(true),
            onAgentComplete: (_agent: string, agentData: AgentResult) => {
                const color = getRiskHex(agentData.risk_contribution);
                const name = agentData.agent.replace('_agent', '').toUpperCase();
                setLiveFeed(prev => [
                    { color, name, time: new Date().toTimeString().slice(0, 8), text: agentData.reasoning },
                    ...prev.slice(0, 9),
                ]);
            },
            onRiskScoreReady: applyAnalysis,
            onComplete: () => setLoading(false),
            onError: () => {
                // WS failed — fall back to REST
                getAnalysis()
                    .then(applyAnalysis)
                    .catch(err => {
                        setLoading(false);
                        setBackendOnline(false);
                        setError('Backend unavailable — start the FastAPI server on port 8000.');
                        console.error(err);
                    });
            },
        });

        wsRef.current = ws;
    }, [applyAnalysis]);

    useEffect(() => {
        // Do not auto-run analysis here. Start empty and wait for user to click "RUN ANALYSIS"
        return () => closeWebSocket();
    }, []);

    return (
        <RiskContext.Provider
            value={{ analysis, loading, error, liveFeed, lastUpdated, refresh: connect, backendOnline }}
        >
            {children}
        </RiskContext.Provider>
    );
}

export function useRisk() {
    return useContext(RiskContext);
}
