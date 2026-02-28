import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import RiskBadge, { levelFromScore, hexFromScore } from '../components/RiskBadge';
import RiskBar from '../components/RiskBar';
import { useRisk } from '../context/RiskContext';
import type { AgentResult } from '../api/meridianApi';

const AGENT_CONFIG = [
    { key: 'dependency', label: 'Dependency Agent', id: 'dependency_agent', icon: 'account_tree', href: '/dependency', desc: 'Scans inter-module dependencies, blocking tasks, and critical path bottlenecks.' },
    { key: 'delay', label: 'Delay Agent', id: 'delay_agent', icon: 'schedule', href: '/delay', desc: 'Tracks task overrun, milestone drift, and timeline compression.' },
    { key: 'workload', label: 'Workload Agent', id: 'workload_agent', icon: 'group', href: '/workload', desc: 'Monitors team capacity, sprint load distribution, and overallocated personnel.' },
    { key: 'scope', label: 'Scope Agent', id: 'scope_agent', icon: 'track_changes', href: '/scope', desc: 'Detects scope creep via unplanned tasks, requirement changes, and feature expansion.' },
    { key: 'comms', label: 'Comms Agent', id: 'comms_agent', icon: 'forum', href: '/comms', desc: 'Evaluates communication patterns, PR review delays, and async bottlenecks.' },
];

export default function AgentsPage() {
    const { analysis, loading, backendOnline } = useRisk();

    function agentData(agentId: string): AgentResult | undefined {
        return analysis?.agents?.find(a => a.agent === agentId);
    }

    const stats = analysis?.agents ? (() => {
        let critical = 0, warning = 0, healthy = 0;
        analysis.agents.forEach(a => {
            const s = Math.round(a.risk_contribution * 100);
            if (s >= 75) critical++; else if (s >= 50) warning++; else healthy++;
        });
        return { critical, warning, healthy };
    })() : { critical: 2, warning: 1, healthy: 2 };

    return (
        <Layout>
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-[#6764f2] text-3xl">smart_toy</span>
                    <h2 className="text-white text-3xl font-black tracking-tight uppercase">Agent Intelligence Hub</h2>
                </div>
                <p className="text-slate-400 text-base">Five specialized AI agents continuously monitor your project's risk dimensions. Click any agent to explore its full analysis.</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                {[
                    { label: 'Active Agents', val: '5 / 5', color: 'text-white' },
                    { label: 'Critical Alerts', val: stats.critical, color: 'text-[#ef4444]' },
                    { label: 'Warnings', val: stats.warning, color: 'text-[#f59e0b]' },
                    { label: 'Healthy', val: stats.healthy, color: 'text-[#22c55e]' },
                    { label: 'Status', val: loading ? '…' : backendOnline ? 'LIVE' : 'OFFLINE', color: backendOnline ? 'text-[#22c55e]' : 'text-[#ef4444]' },
                ].map(s => (
                    <div key={s.label} className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-4 text-center">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{s.label}</p>
                        <p className={`text-2xl font-black font-mono ${s.color}`}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Agent Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {AGENT_CONFIG.map(cfg => {
                    const d = agentData(cfg.id);
                    const score100 = d ? Math.round(d.risk_contribution * 100) : 0;
                    const level = levelFromScore(score100);
                    const hex = hexFromScore(score100);

                    return (
                        <Link key={cfg.key} to={cfg.href}
                            className="agent-card block bg-[#12121a] border border-[#1e1e2d] rounded-2xl p-6 group cursor-pointer no-underline"
                            style={{ ['--hover-border' as string]: hex }}>
                            <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="size-12 rounded-xl flex items-center justify-center transition-colors"
                                        style={{ background: `${hex}18`, border: `1px solid ${hex}33` }}>
                                        <span className="material-symbols-outlined text-2xl" style={{ color: hex }}>{cfg.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg leading-tight">{cfg.label}</h3>
                                        <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">{cfg.id}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <RiskBadge level={level} />
                                    <span className="text-slate-500 text-[10px] font-mono">{backendOnline ? 'Live' : 'Offline'}</span>
                                </div>
                            </div>

                            <p className="text-slate-400 text-sm mb-5 leading-relaxed">{d?.top_risks?.[0] ?? cfg.desc}</p>

                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-slate-500 text-xs font-bold uppercase">Risk Score</span>
                                    <span className="text-sm font-black font-mono" style={{ color: hex }}>{score100} / 100</span>
                                </div>
                                <RiskBar score100={score100} className="h-2" />
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2d]">
                                <span className="text-slate-500 text-xs">{d ? 'Live data' : loading ? 'Loading…' : 'No data'}</span>
                                <span className="text-[#6764f2] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                    View Details <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </span>
                            </div>
                        </Link>
                    );
                })}

                {/* Simulation Launch Card */}
                <Link to="/simulation"
                    className="agent-card block bg-[#0a0a14] border border-dashed border-[#6764f2]/30 hover:border-[#6764f2]/70 rounded-2xl p-6 group cursor-pointer no-underline flex flex-col items-center justify-center text-center min-h-[320px]">
                    <div className="size-16 rounded-2xl bg-[#6764f2]/10 border border-[#6764f2]/20 flex items-center justify-center mb-4 group-hover:bg-[#6764f2]/20 transition-colors">
                        <span className="material-symbols-outlined text-[#6764f2] text-3xl">science</span>
                    </div>
                    <h3 className="text-slate-300 font-bold text-lg mb-2">Run What-If Simulation</h3>
                    <p className="text-slate-500 text-sm mb-6 max-w-xs leading-relaxed">Model the impact of adding developers, extending deadlines, or removing scope items in real-time.</p>
                    <span className="text-[#6764f2] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Open Simulator <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                </Link>
            </div>
        </Layout>
    );
}
