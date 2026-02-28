import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import RiskBadge, { levelFromScore, hexFromScore } from '../components/RiskBadge';
import RiskBar from '../components/RiskBar';
import { SIGNAL_META } from '../api/meridianApi';
import type { AgentResult } from '../api/meridianApi';
import { useRisk } from '../context/RiskContext';

interface AgentDetailPageProps {
    agentId: string;
    agentLabel: string;
    icon: string;
    description: string;
    signals: string[];
    mitigationTitle: string;
    mitigationActions: string[];
}

export function AgentDetailPage({
    agentId, agentLabel, icon, description, signals, mitigationTitle, mitigationActions,
}: AgentDetailPageProps) {
    const { analysis } = useRisk();

    const agent: AgentResult | undefined = analysis?.agents?.find(a => a.agent === agentId);
    const score100 = agent ? Math.round(agent.risk_contribution * 100) : 0;
    const level = levelFromScore(score100);
    const hex = hexFromScore(score100);
    const agentSignals = analysis?.signals?.signals ?? {};

    return (
        <Layout>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Link to="/agents" className="hover:text-[#6764f2] transition-colors">Agent Hub</Link>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-slate-100">{agentLabel}</span>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="size-14 rounded-xl flex items-center justify-center" style={{ background: `${hex}18`, border: `1px solid ${hex}33` }}>
                        <span className="material-symbols-outlined text-3xl" style={{ color: hex }}>{icon}</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">{agentLabel}</h1>
                        <p className="text-slate-400 text-sm">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl px-6 py-3 text-center">
                        <p className="text-slate-500 text-xs uppercase font-bold mb-1">Risk Score</p>
                        <p className="text-3xl font-black font-mono" style={{ color: hex }}>{score100}</p>
                    </div>
                    <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl px-6 py-3 text-center">
                        <p className="text-slate-500 text-xs uppercase font-bold mb-1">Status</p>
                        <RiskBadge level={level} className="text-sm px-3 py-1" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Signals Panel */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6">
                        <h3 className="text-slate-100 text-base font-bold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#6764f2]">sensors</span>
                            Signal Readings
                        </h3>
                        <div className="space-y-4">
                            {signals.map(sigKey => {
                                const meta = SIGNAL_META[sigKey];
                                const sig = agentSignals[sigKey];
                                if (!meta) return null;
                                const sigScore100 = sig ? Math.round(sig.score * 100) : 0;
                                const sigHex = hexFromScore(sigScore100);
                                return (
                                    <div key={sigKey} className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-300">{meta.label}</span>
                                            <span className="font-mono text-sm font-bold" style={{ color: sigHex }}>
                                                {sig ? (typeof sig.value === 'number' && sig.value < 1 && !Number.isInteger(sig.value)
                                                    ? (sig.value * 100).toFixed(1) + '%'
                                                    : sig.value + meta.unit) : '—'}
                                            </span>
                                        </div>
                                        <RiskBar score100={sigScore100} />
                                    </div>
                                );
                            })}
                            {signals.length === 0 && (
                                <p className="text-slate-500 text-sm">No signals configured for this agent.</p>
                            )}
                        </div>
                    </div>

                    {/* Top Risks */}
                    {agent?.top_risks?.length ? (
                        <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6">
                            <h3 className="text-slate-100 text-base font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#ef4444]">warning</span>
                                Top Risk Findings
                            </h3>
                            <ul className="space-y-3">
                                {agent.top_risks.map((r, i) => (
                                    <li key={i} className="flex items-start gap-3 p-3 bg-[#1a1a24] border border-[#1e1e2d] rounded-lg">
                                        <span className="material-symbols-outlined text-[#ef4444] text-[18px] mt-0.5">error</span>
                                        <p className="text-sm text-slate-300 leading-relaxed">{r}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>

                {/* Reasoning & Mitigation */}
                <div className="space-y-4">
                    {/* Reasoning */}
                    {agent?.reasoning && (
                        <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6">
                            <h3 className="text-slate-100 text-base font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#6764f2]">psychology</span>
                                Agent Reasoning
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{agent.reasoning}</p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-slate-500 text-xs">Confidence</span>
                                <span className="text-[#6764f2] font-mono font-bold text-sm">
                                    {agent.confidence ? `${Math.round(agent.confidence * 100)}%` : 'N/A'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Mitigation */}
                    <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6">
                        <h3 className="text-slate-100 text-base font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#22c55e]">shield</span>
                            {mitigationTitle}
                        </h3>
                        <div className="space-y-3">
                            {mitigationActions.map((action, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-lg">
                                    <span className="material-symbols-outlined text-[#22c55e] text-[18px] mt-0.5">check_circle</span>
                                    <p className="text-sm text-slate-300 leading-relaxed">{action}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
