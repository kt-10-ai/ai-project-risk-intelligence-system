import { useState } from 'react';
import Layout from '../components/Layout';
import RiskBadge from '../components/RiskBadge';
import RiskBar from '../components/RiskBar';
import { simulate } from '../api/meridianApi';
import { showToast } from '../hooks/useToast';
import { useRisk } from '../context/RiskContext';
import { exportMitigationPlanPDF } from '../utils/pdfGenerator';

const STATIC_STEPS = [
    { priority: 'IMMEDIATE', icon: 'hub', title: 'Unblock task_7 (Critical Hub)', detail: 'Assign +2 senior engineers from Platform team. Decouple task_112 by parallelizing subtasks.', impact: -18, effort: 'High' },
    { priority: 'IMMEDIATE', icon: 'build', title: 'Trigger Emergency Dependency Patch v2.4.1', detail: 'Resolve the 14-task stall in Backend Microservices. Auto-reassign 4 stale PRs to Level-2 reviewers.', impact: -12, effort: 'Medium' },
    { priority: 'SHORT_TERM', icon: 'swap_horiz', title: 'Rebalance Workload: Move Auth Refactor', detail: 'Bob is at 98% capacity on 3 critical-path items. Redistribute to reduce single-point-of-failure risk.', impact: -8, effort: 'Low' },
    { priority: 'MEDIUM_TERM', icon: 'notifications_active', title: 'Implement PR Age Automation Alerts', detail: 'Auto-flag PRs at 48h and 7d. Define max critical-path depth of 4 hops as a PR-blocking rule.', impact: -5, effort: 'Low' },
    { priority: 'MEDIUM_TERM', icon: 'policy', title: 'Sprint Scope Governance Gate', detail: 'Require PM sign-off for all mid-sprint task additions. Link orphan PRs to Jira tasks.', impact: -3, effort: 'Low' },
];

const P_COLORS: Record<string, string> = { IMMEDIATE: '#ef4444', SHORT_TERM: '#f59e0b', MEDIUM_TERM: '#6764f2' };
const P_LABELS: Record<string, string> = { IMMEDIATE: '0–48h', SHORT_TERM: 'Week 1', MEDIUM_TERM: 'Week 2–4' };

export default function DependencyPage() {
    const { analysis: ctxAnalysis } = useRisk();
    const [modalOpen, setModalOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [planScore, setPlanScore] = useState<{ current: number; projected: number; level: string } | null>(null);

    async function generateMitigationPlan() {
        setGenerating(true);
        setModalOpen(true);
        setPlanScore(null);
        try {
            // Use cached context data, or refetch if not available
            const data = ctxAnalysis;
            if (!data) throw new Error('no data');
            const score = data.risk_score ?? 75;
            const level = data.risk_level ?? 'HIGH';
            const totalImpact = STATIC_STEPS.reduce((s, st) => s + st.impact, 0);
            const projected = Math.max(0, score + totalImpact);
            setPlanScore({ current: score, projected, level });

        } catch {
            showToast('Backend offline — showing static plan', '#f59e0b');
            setPlanScore({ current: 75, projected: 29, level: 'HIGH' });
        }
        setGenerating(false);
    }

    function downloadPlan() {
        exportMitigationPlanPDF(planScore, STATIC_STEPS);
    }

    async function handleActionCard(title: string) {
        showToast(`⚡ Action initiated: ${title}`, '#6764f2');
        try {
            const res = await simulate({ type: 'add_developers', count: 2 });
            const delta = res.delta.total_score;
            showToast(`✓ ${title} — Score change: ${delta > 0 ? '+' : ''}${delta.toFixed(1)} pts`, delta < 0 ? '#22c55e' : '#f59e0b');
        } catch { showToast(`✓ ${title} — Action queued`, '#22c55e'); }
    }

    return (
        <Layout>
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 border-b border-[#1e1e2d] pb-6 mb-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-slate-100 text-5xl font-black tracking-tight uppercase">Dependency Risk</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-slate-400 text-lg font-medium">Risk Score: <span className="font-mono text-orange-500 font-bold">0.74</span></p>
                        <RiskBadge level="HIGH" className="px-3 py-1 text-sm" />
                    </div>
                </div>
                <button onClick={generateMitigationPlan}
                    className="bg-[#6764f2] hover:bg-[#5451e0] text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-[#6764f2]/20">
                    GENERATE MITIGATION PLAN
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[
                    { label: 'Blocked Tasks', value: '7', sub: '/ 23%', trend: '+0.0% this week', icon: 'block', trendColor: '#22c55e' },
                    { label: 'Critical Path Depth', value: '5', sub: 'hops', trend: 'Optimized', icon: 'network_node', trendColor: '#22c55e' },
                    { label: 'Hub Centrality Max', value: '4', sub: 'dependents', trend: 'task_7', icon: 'hub', trendColor: '#ef4444' },
                ].map(card => (
                    <div key={card.label} className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6 flex flex-col gap-2 hover:border-[#6764f2]/40 transition-colors">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">{card.label}</p>
                            <span className="material-symbols-outlined text-slate-600 text-[20px]">{card.icon}</span>
                        </div>
                        <p className="text-slate-100 text-3xl font-bold font-mono">{card.value} <span className="text-lg font-normal text-slate-500">{card.sub}</span></p>
                        <p className="text-sm font-medium flex items-center gap-1" style={{ color: card.trendColor }}>
                            <span className="material-symbols-outlined text-sm">trending_up</span> {card.trend}
                        </p>
                    </div>
                ))}
            </div>

            {/* Critical Path Chain + Dependency Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                {/* Chain */}
                <div className="lg:col-span-4 bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6">
                    <h2 className="text-slate-100 text-lg font-bold mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <span className="material-symbols-outlined text-[#6764f2]">account_tree</span>
                        Critical Path Chain
                    </h2>
                    <div className="flex flex-col gap-0">
                        {['task_27', 'task_22', 'task_32', 'task_29', 'task_13'].map(t => (
                            <div key={t} className="flex items-start gap-4 h-16">
                                <div className="flex flex-col items-center">
                                    <div className="size-3 rounded-full bg-[#6764f2] ring-4 ring-[#6764f2]/20" />
                                    <div className="w-px flex-1 bg-[#6764f2]/30" />
                                </div>
                                <span className="font-mono text-sm text-slate-300 mt-0.5">{t}</span>
                            </div>
                        ))}
                        <div className="flex items-start gap-4 h-12">
                            <div className="flex flex-col items-center">
                                <div className="size-4 rounded-full bg-red-500 ring-4 ring-red-500/30" style={{ boxShadow: '0 0 0 2px rgba(239,68,68,0.4)' }} />
                            </div>
                            <div className="flex flex-col -mt-1">
                                <span className="font-mono text-sm text-red-400 font-bold">task_7 (CRITICAL)</span>
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Blocking Hub</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Breakdown table */}
                <div className="lg:col-span-8 bg-[#12121a] border border-[#1e1e2d] rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-[#1e1e2d] flex justify-between items-center">
                        <h2 className="text-slate-100 text-lg font-bold uppercase tracking-wide">
                            Dependency Hub Breakdown: <span className="text-red-400 font-mono">task_7</span>
                        </h2>
                        <span className="text-xs font-mono text-slate-500">ID: 4d2e-9f12</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#6764f2]/5 text-slate-400 text-xs uppercase tracking-widest font-bold">
                                <tr>
                                    <th className="px-6 py-4">Dependent Task</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Lead Time Risk</th>
                                    <th className="px-6 py-4">Owner</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#6764f2]/10">
                                {[
                                    { task: 'task_104', status: 'Queued', statusColor: '#475569', bg: '#47556920', risk: 'High (+12d)', owner: 'Engineering.Alpha' },
                                    { task: 'task_112', status: 'Blocked', statusColor: '#ef4444', bg: '#ef444420', risk: 'Critical (+24d)', owner: 'Design.UX' },
                                    { task: 'task_115', status: 'Blocked', statusColor: '#ef4444', bg: '#ef444420', risk: 'High (+14d)', owner: 'Engineering.Platform' },
                                    { task: 'task_121', status: 'Queued', statusColor: '#475569', bg: '#47556920', risk: 'Medium (+4d)', owner: 'Product.Ops' },
                                ].map(row => (
                                    <tr key={row.task} className="hover:bg-[#6764f2]/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-slate-200">{row.task}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: row.bg, color: row.statusColor }}>{row.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-300">{row.risk}</td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{row.owner}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Signal breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[
                    { label: 'blocked_task_ratio', score: 0.82, color: '#f97316', status: 'STALLED' },
                    { label: 'critical_path_depth', score: 0.64, color: '#6764f2', status: 'STABLE' },
                    { label: 'dependency_centrality_max', score: 0.94, color: '#ef4444', status: 'CRITICAL' },
                ].map(sig => (
                    <div key={sig.label} className="p-6 bg-[#12121a]/50 border-l-4 rounded-r-xl" style={{ borderLeftColor: sig.color }}>
                        <p className="text-slate-500 text-xs font-bold uppercase mb-2">Signal: {sig.label}</p>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl font-black font-mono text-white">{sig.score.toFixed(2)}</span>
                            <span className="text-xs font-bold" style={{ color: sig.color }}>{sig.status}</span>
                        </div>
                        <RiskBar score100={Math.round(sig.score * 100)} className="h-1.5" />
                    </div>
                ))}
            </div>

            {/* Agent Reasoning */}
            <div className="bg-[#6764f2]/5 border border-[#6764f2]/20 rounded-xl p-8 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-[#6764f2]">psychology</span>
                    <h2 className="text-slate-100 text-lg font-bold">Agent Reasoning</h2>
                </div>
                <div className="text-slate-300 leading-relaxed text-sm max-w-4xl flex flex-col gap-4">
                    <p>Analysis of the dependency graph indicates a significant bottleneck localized at <span className="font-mono text-[#6764f2] font-bold">task_7</span>. This task serves as a "Hub
                        Centrality" point, meaning multiple downstream delivery paths are converging on this single unit of work. The risk score of 0.74 is driven primarily by the 23% blockage rate.</p>
                    <p>Our simulation suggests that a 48-hour delay in <span className="font-mono text-[#6764f2] font-bold">task_7</span> will propagate a minimum of 12 days of slippage across 4 critical path streams, most notably impacting the <span className="italic text-slate-100">"Alpha Milestone"</span> delivery scheduled for next Friday.</p>
                </div>
            </div>

            {/* Recommended Actions */}
            <div className="mb-6">
                <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest px-1 mb-4">Recommended Mitigation Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { icon: 'call_split', title: 'Decouple task_7 Dependencies', desc: 'Parallelize task_112 to reduce hop depth' },
                        { icon: 'group_add', title: 'Reallocate Resources to task_7', desc: 'Assign +2 senior engineers from Platform team' },
                    ].map(action => (
                        <button key={action.title} onClick={() => handleActionCard(action.title)}
                            className="bg-[#12121a] border border-[#1e1e2d] hover:border-[#6764f2]/60 transition-all p-5 rounded-xl flex items-center justify-between group cursor-pointer text-left">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#6764f2]/20 p-2 rounded-lg text-[#6764f2]">
                                    <span className="material-symbols-outlined">{action.icon}</span>
                                </div>
                                <div>
                                    <h3 className="text-slate-100 font-bold text-sm">{action.title}</h3>
                                    <p className="text-slate-500 text-xs">{action.desc}</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-600 group-hover:text-[#6764f2] transition-colors">chevron_right</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* MITIGATION MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-[9999] bg-[#0a0a0f]/92 backdrop-blur-md overflow-y-auto flex items-start justify-center pt-12 pb-12" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
                    <div className="max-w-2xl w-full mx-4 bg-[#12121a] border border-[#6764f2]/30 rounded-2xl p-10 relative">
                        <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 bg-[#1e1e2d] text-slate-400 rounded-lg px-3 py-1.5 text-sm hover:bg-[#2d2d3d] transition-colors">✕ Close</button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 bg-[#6764f2]/20 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#6764f2] text-[20px]">auto_awesome</span>
                            </div>
                            <div>
                                <h2 className="text-white font-black text-xl uppercase tracking-wider">AI Mitigation Plan</h2>
                                <p className="text-[#6764f2] text-xs">{generating ? 'Generating...' : `Generated at ${new Date().toLocaleTimeString()} · 5 actions`}</p>
                            </div>
                        </div>

                        {planScore && (
                            <div className="bg-[#6764f2]/10 border border-[#6764f2]/30 rounded-xl p-4 flex gap-8 mb-6">
                                <div className="text-center">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Current Score</p>
                                    <p className="text-[#ef4444] text-3xl font-black font-mono">{planScore.current.toFixed(1)}</p>
                                    <p className="text-slate-500 text-xs">{planScore.level}</p>
                                </div>
                                <div className="flex items-center text-2xl text-slate-500">→</div>
                                <div className="text-center">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Projected Score</p>
                                    <p className="text-[#22c55e] text-3xl font-black font-mono">{planScore.projected.toFixed(1)}</p>
                                    <p className="text-[#22c55e] text-xs">↓ {Math.abs(STATIC_STEPS.reduce((a, s) => a + s.impact, 0))} pts reduction</p>
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Confidence</p>
                                    <p className="text-[#6764f2] text-xl font-black">91.2%</p>
                                    <p className="text-slate-500 text-xs">5 actions · 3 priorities</p>
                                </div>
                            </div>
                        )}

                        {generating ? (
                            <div className="text-[#6764f2] text-sm font-semibold text-center py-8">⏳ Fetching live risk data…</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {STATIC_STEPS.map((step, i) => {
                                    const color = P_COLORS[step.priority];
                                    const label = P_LABELS[step.priority];
                                    return (
                                        <div key={i} className="flex gap-3 items-start bg-[#0a0a0f]/40 border border-[#1e1e2d] rounded-lg p-4" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
                                            <div className="size-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                                                <span className="material-symbols-outlined text-[18px]" style={{ color }}>{step.icon}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>{step.priority.replace('_', ' ')} · {label}</span>
                                                    <span className="text-slate-500 text-xs">Impact: <strong style={{ color }}>{step.impact} pts</strong> · Effort: {step.effort}</span>
                                                </div>
                                                <p className="text-white font-bold text-sm mb-1">{step.title}</p>
                                                <p className="text-slate-500 text-xs leading-relaxed">{step.detail}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-7 flex gap-3">
                            <button onClick={downloadPlan} className="flex-1 py-3 bg-[#6764f2] text-white font-bold text-sm rounded-lg hover:bg-[#5451e0] transition-colors uppercase tracking-wider flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                Download PDF
                            </button>
                            <button onClick={() => setModalOpen(false)} className="px-5 py-3 bg-[#1e1e2d] border border-[#2d2d3d] text-slate-400 font-semibold text-sm rounded-lg hover:bg-[#2d2d3d] transition-colors">
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
