import { useState } from 'react';
import Layout from '../components/Layout';
import RiskBadge, { levelFromScore, hexFromScore } from '../components/RiskBadge';
import RiskBar from '../components/RiskBar';
import { SIGNAL_META, toTitle } from '../api/meridianApi';
import { useRisk } from '../context/RiskContext';

export default function ReportPage() {
    const { analysis } = useRisk();
    const [generating, setGenerating] = useState(false);
    const [generated, setGenerated] = useState(false);

    const score100 = analysis?.risk_score ?? 78.8;
    const level = analysis?.risk_level ?? 'CRITICAL';
    const hex = hexFromScore(score100);
    const signals = analysis?.signals?.signals ?? {};

    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    function handleGenerate() {
        setGenerating(true);
        setTimeout(() => { setGenerating(false); setGenerated(true); }, 1800);
    }

    function handleExport() {
        const blob = new Blob([
            `MERIDIAN RISK INTELLIGENCE REPORT\n${date}\n\nRisk Score: ${score100.toFixed(1)}\nRisk Level: ${level}\n\n${analysis?.agents?.map(a =>
                `${a.agent}: ${(a.risk_contribution * 100).toFixed(1)} — ${a.reasoning}`
            ).join('\n') ?? ''}`
        ], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `meridian-report-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
    }

    return (
        <Layout>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                        <span>Dashboard</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-slate-100">Intelligence Report</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Intelligence Report</h1>
                    <p className="text-slate-400 text-sm mt-1">Generated: {date} · Meridian v4.2.0</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button onClick={handleGenerate}
                        className="px-4 py-2 border border-[#6764f2]/50 bg-[#6764f2]/10 text-[#6764f2] text-sm font-bold rounded-lg hover:bg-[#6764f2]/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        disabled={generating}>
                        <span className="material-symbols-outlined text-[18px]">{generating ? 'hourglass_top' : 'auto_awesome'}</span>
                        {generating ? 'Generating…' : 'Gen AI Report'}
                    </button>
                    <button onClick={handleExport}
                        className="px-4 py-2 border border-[#1e1e2d] bg-[#12121a] text-white text-sm font-bold rounded-lg hover:bg-[#1e1e2d] transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Export
                    </button>
                </div>
            </div>

            {generated && (
                <div className="bg-[#6764f2]/10 border border-[#6764f2]/30 rounded-xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#6764f2]">auto_awesome</span>
                    <div>
                        <p className="text-[#a5b4fc] font-bold text-sm">AI Report Generated</p>
                        <p className="text-slate-300 text-sm mt-1">
                            Meridian AI has summarized the key risk findings: <strong className="text-white">Delay Agent</strong> is the dominant risk driver at {(analysis?.agents?.find(a => a.agent === 'delay_agent')?.risk_contribution ?? 0.92 * 100).toFixed(1)} risk score, primarily due to stale PRs and overdue tasks. Recommend immediate sprint rebalancing and PR cleanup.
                        </p>
                    </div>
                </div>
            )}

            {/* Executive Summary */}
            <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-[#1e1e2d]">
                    <h2 className="text-lg font-bold text-white">Executive Risk Summary</h2>
                    <RiskBadge level={level} className="text-sm px-3 py-1" />
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            The Meridian AI risk engine has completed a full analysis of your project. The composite risk score is{' '}
                            <span className="font-bold font-mono" style={{ color: hex }}>{score100.toFixed(1)} / 100</span>, classified as{' '}
                            <span className="font-bold" style={{ color: hex }}>{level}</span>. The primary risk driver is the{' '}
                            <span className="font-bold text-white">{toTitle(analysis?.dominant_risk ?? 'delay')}</span> dimension, with an interaction penalty of{' '}
                            <span className="text-[#f59e0b] font-mono font-bold">+{(analysis?.interaction_penalty ?? 0.09).toFixed(2)}</span> applied across correlated risk factors.
                        </p>
                        <div className="text-xs text-slate-500 font-mono">
                            Formula: v{analysis?.formula_version ?? '4.1'} · Timestamp: {analysis?.timestamp?.replace('T', ' ').slice(0, 19) ?? 'N/A'}
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-[#0a0a0f] rounded-lg p-6">
                        <div className="text-6xl font-black font-mono" style={{ color: hex }}>{score100.toFixed(1)}</div>
                        <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-wide">Composite Score</p>
                    </div>
                </div>
            </div>

            {/* Agent Results */}
            <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl overflow-hidden">
                <div className="p-6 border-b border-[#1e1e2d]">
                    <h2 className="text-lg font-bold text-white">Agent Analysis Breakdown</h2>
                </div>
                <div className="divide-y divide-[#1e1e2d]">
                    {analysis?.agents?.length
                        ? analysis.agents.map(agent => {
                            const s100 = Math.round(agent.risk_contribution * 100);
                            const agHex = hexFromScore(s100);
                            const agLevel = levelFromScore(s100);
                            return (
                                <div key={agent.agent} className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: `${agHex}18`, color: agHex }}>
                                                {agent.agent.slice(0, 3).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold">{toTitle(agent.agent.replace('_agent', ''))}</h3>
                                                <p className="text-slate-500 text-xs font-mono">{agent.agent}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <RiskBar score100={s100} className="w-32" />
                                            <span className="font-mono font-black text-lg" style={{ color: agHex }}>{s100}</span>
                                            <RiskBadge level={agLevel} />
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed mb-3">{agent.reasoning}</p>
                                    {agent.top_risks?.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {agent.top_risks.slice(0, 2).map((r, i) => (
                                                <span key={i} className="text-xs text-slate-300 bg-[#1e1e2d] px-2 py-1 rounded">{r}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                        : (
                            <div className="p-6">
                                {[
                                    { name: 'Dependency', score: 45, level: 'STABLE' },
                                    { name: 'Delay', score: 92, level: 'CRITICAL' },
                                    { name: 'Workload', score: 63, level: 'WARNING' },
                                    { name: 'Scope', score: 30, level: 'HEALTHY' },
                                    { name: 'Comms', score: 28, level: 'OPTIMAL' },
                                ].map(a => (
                                    <div key={a.name} className="flex items-center justify-between py-3 border-b border-[#1e1e2d] last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded bg-[#6764f2]/10 flex items-center justify-center text-[#6764f2] font-bold text-xs">
                                                {a.name.slice(0, 3).toUpperCase()}
                                            </div>
                                            <span className="text-white font-medium">{a.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <RiskBar score100={a.score} className="w-24" />
                                            <RiskBadge level={a.level} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div>
            </div>

            {/* Signal Summary Table */}
            <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl overflow-hidden">
                <div className="p-6 border-b border-[#1e1e2d]">
                    <h2 className="text-lg font-bold text-white">Signal Summary (15 Dimensions)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase font-bold tracking-widest bg-[#0a0a0f]/50">
                            <tr>
                                <th className="px-6 py-3">Signal</th>
                                <th className="px-6 py-3">Group</th>
                                <th className="px-6 py-3">Raw Value</th>
                                <th className="px-6 py-3">Risk Score</th>
                                <th className="px-6 py-3 w-32">Bar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e1e2d]">
                            {Object.entries(SIGNAL_META).map(([key, meta]) => {
                                const sig = signals[key];
                                const s100 = sig ? Math.round(sig.score * 100) : 0;
                                const sigHex = hexFromScore(s100);
                                const rawVal = sig?.value;
                                const displayVal = rawVal !== undefined
                                    ? (typeof rawVal === 'number' && rawVal > 0 && rawVal < 1 && !Number.isInteger(rawVal)
                                        ? (rawVal * 100).toFixed(1) + '%' : rawVal + meta.unit)
                                    : '—';
                                return (
                                    <tr key={key} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-3 text-slate-200 font-medium">{meta.label}</td>
                                        <td className="px-6 py-3 text-slate-500 uppercase text-xs">{meta.group}</td>
                                        <td className="px-6 py-3 font-mono text-slate-300">{displayVal}</td>
                                        <td className="px-6 py-3 font-mono font-bold" style={{ color: sigHex }}>{s100}</td>
                                        <td className="px-6 py-3"><RiskBar score100={s100} className="h-1.5" /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
