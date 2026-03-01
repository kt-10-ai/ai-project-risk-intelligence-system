import { useState } from 'react';
import { fetchMonteCarlo } from '../api/meridianApi';

interface MonteCarloResult {
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

const LEVEL_COLORS: Record<string, string> = {
    LOW: '#22c55e',
    MODERATE: '#eab308',
    HIGH: '#f97316',
    CRITICAL: '#ef4444',
};

export default function MonteCarloPanel() {
    const [result, setResult] = useState<MonteCarloResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function runSimulation() {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchMonteCarlo();
            setResult(data);
        } catch {
            setError('Failed to run simulation — check backend');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ background: '#12121a', border: '1px solid #1e1e2d', borderRadius: 12, padding: 24, marginTop: 24 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h3 style={{ color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
                        Monte Carlo Risk Simulation
                    </h3>
                    <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>
                        10,000 simulations with signal uncertainty modeling
                    </p>
                </div>
                <button
                    onClick={runSimulation}
                    disabled={loading}
                    style={{
                        background: loading ? '#1e1e2d' : '#6366f1',
                        color: 'white', border: 'none', padding: '10px 20px',
                        borderRadius: 8, fontSize: 12, fontWeight: 700,
                        cursor: loading ? 'wait' : 'pointer', letterSpacing: 1
                    }}
                >
                    {loading ? 'Running 10,000 simulations...' : '⚡ RUN 10,000 SIMULATIONS'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace', padding: 12, background: '#0a0a0f', borderRadius: 8 }}>
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div>

                    {/* Verdict */}
                    <div style={{ background: '#0a0a0f', border: '1px solid #1e1e2d', borderLeft: '4px solid #ef4444', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                        <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, fontFamily: 'monospace', marginBottom: 4 }}>
                            SIMULATION VERDICT — {result.n_simulations.toLocaleString()} RUNS
                        </div>
                        <div style={{ color: 'white', fontSize: 14, lineHeight: 1.5 }}>{result.verdict}</div>
                    </div>

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                        {[
                            { label: 'MEAN SCORE', value: result.mean_score.toFixed(1), color: 'white' },
                            { label: 'STD DEVIATION', value: result.std_deviation.toFixed(2), color: '#6366f1' },
                            { label: 'BEST CASE (P5)', value: result.percentile_5.toFixed(1), color: '#22c55e' },
                            { label: 'WORST CASE (P95)', value: result.percentile_95.toFixed(1), color: '#ef4444' },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: '#0a0a0f', border: '1px solid #1e1e2d', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                                <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', marginBottom: 8 }}>{label}</div>
                                <div style={{ color, fontSize: 28, fontWeight: 800, fontFamily: 'monospace' }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Confidence interval */}
                    <div style={{ background: '#0a0a0f', border: '1px solid #1e1e2d', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                        <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', marginBottom: 8 }}>95% CONFIDENCE INTERVAL</div>
                        <div style={{ color: 'white', fontSize: 18, fontFamily: 'monospace', fontWeight: 700 }}>
                            [{result.confidence_interval.lower.toFixed(1)}, {result.confidence_interval.upper.toFixed(1)}]
                        </div>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                            There is a 95% probability the true risk score falls within this range
                        </div>
                    </div>

                    {/* Risk level distribution */}
                    <div style={{ background: '#0a0a0f', border: '1px solid #1e1e2d', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                        <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', marginBottom: 16 }}>RISK LEVEL DISTRIBUTION</div>
                        {Object.entries(result.risk_level_distribution).map(([level, pct]) => (
                            <div key={level} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ color: LEVEL_COLORS[level], fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{level}</span>
                                    <span style={{ color: LEVEL_COLORS[level], fontSize: 12, fontFamily: 'monospace' }}>{pct.toFixed(1)}%</span>
                                </div>
                                <div style={{ background: '#1e1e2d', height: 8, borderRadius: 4 }}>
                                    <div style={{
                                        width: `${pct}%`, height: 8,
                                        background: LEVEL_COLORS[level],
                                        borderRadius: 4,
                                        transition: 'width 0.7s ease'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Probability critical */}
                    <div style={{ background: '#0a0a0f', border: '1px solid #ef4444', borderRadius: 8, padding: 16 }}>
                        <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', marginBottom: 8 }}>PROBABILITY OF CRITICAL STATUS</div>
                        <div style={{ color: '#ef4444', fontSize: 40, fontWeight: 800, fontFamily: 'monospace' }}>
                            {(result.probability_critical * 100).toFixed(1)}%
                        </div>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                            {result.n_simulations.toLocaleString()} simulations run · Current deterministic score: {result.current_score}
                        </div>
                    </div>

                </div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
                <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontFamily: 'monospace', fontSize: 12 }}>
                    Click RUN to simulate 10,000 risk scenarios with uncertainty modeling
                </div>
            )}

        </div>
    );
}
