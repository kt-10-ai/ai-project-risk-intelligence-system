import { useState } from 'react';
import Layout from '../components/Layout';
import RiskBar from '../components/RiskBar';
import { simulate } from '../api/meridianApi';
import { showToast } from '../hooks/useToast';

const MITIGATION_MAP = [
    { label: 'Auto-reassign 4 stale PRs to Level 2 Reviewers', mutation: { type: 'close_prs', pr_count: 4 } as const },
    { label: 'Trigger Emergency Dependency Patch (v2.4.1)', mutation: { type: 'close_prs', pr_count: 8 } as const },
    { label: 'Initiate Sprint Scope Reduction protocol', mutation: { type: 'remove_scope', task_count: 5 } as const },
];

export default function DelayPage() {
    const [checked, setChecked] = useState<boolean[]>([true, true, false]);
    const [applying, setApplying] = useState(false);
    const [result, setResult] = useState<{ baseline: number; simulated: number; delta: number; levelBefore: string; levelAfter: string } | null>(null);

    function toggleCheck(i: number) {
        setChecked(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
    }

    async function applyMitigations() {
        const selected = MITIGATION_MAP.filter((_, i) => checked[i]);
        if (selected.length === 0) { showToast('Select at least one mitigation action before applying.', '#f59e0b'); return; }
        setApplying(true);
        setResult(null);
        try {
            const res = await simulate(selected[0].mutation);
            setResult({
                baseline: res.baseline.total_score,
                simulated: res.simulated.total_score,
                delta: res.delta.total_score,
                levelBefore: res.baseline.risk_level,
                levelAfter: res.simulated.risk_level,
            });
            showToast(`✓ Mitigation applied — ${res.delta.total_score.toFixed(1)} pts change`, res.delta.total_score < 0 ? '#22c55e' : '#ef4444');
        } catch {
            showToast('Backend unavailable. Cannot simulate mitigations.', '#ef4444');
        }
        setApplying(false);
    }

    const improved = result ? result.delta < 0 : false;
    const rColor = improved ? '#22c55e' : '#ef4444';

    return (
        <Layout>
            {/* Hero header */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#1e1e2d] mb-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tighter uppercase text-white">Delay Risk</h1>
                    <p className="text-slate-400 font-medium">Critical system bottlenecks detected across 4 core repositories.</p>
                </div>
                <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 border-2 border-red-500" style={{ boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}>
                    <span className="material-symbols-outlined text-red-500 animate-pulse">report</span>
                    <span className="text-red-500 font-black tracking-widest text-xl">CRITICAL</span>
                </div>
            </section>

            {/* Stat Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[
                    { label: 'Overdue Tasks', value: '73%', trend: '+15.2% vs LW', icon: 'running_with_errors', bar: 73 },
                    { label: 'Stale Tasks', value: '87%', trend: '+22.1% vs LW', icon: 'timer_off', bar: 87 },
                    { label: 'Avg PR Age', value: '13.1d', trend: '+4.2d vs LW', icon: 'hourglass_top', bar: 65 },
                ].map(card => (
                    <div key={card.label} className="p-6 rounded-xl border border-red-500/30 bg-red-500/5 space-y-4">
                        <div className="flex items-center justify-between text-red-500">
                            <span className="text-sm font-bold uppercase tracking-wider">{card.label}</span>
                            <span className="material-symbols-outlined">{card.icon}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-mono font-bold text-white">{card.value}</span>
                            <span className="text-red-500 text-sm font-bold">{card.trend}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full rounded-full" style={{ width: `${card.bar}%` }} />
                        </div>
                    </div>
                ))}
            </section>

            {/* Breakdown charts */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="p-6 rounded-xl border border-[#1e1e2d] bg-slate-900/50 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Overdue Task Breakdown</h3>
                    <div className="h-48 flex items-end gap-3 justify-around">
                        {[{ label: 'Frontend', h: '40%', opacity: 'opacity-30' }, { label: 'Backend', h: '90%', opacity: '' }, { label: 'DevOps', h: '65%', opacity: 'opacity-60' }, { label: 'Mobile', h: '25%', opacity: 'opacity-40' }].map(bar => (
                            <div key={bar.label} className="flex flex-col items-center gap-2 w-full">
                                <div className={`w-full bg-red-500 ${bar.opacity} rounded-t`} style={{ height: bar.h }} />
                                <span className="text-[10px] font-mono text-slate-500 uppercase">{bar.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 rounded-xl border border-[#1e1e2d] bg-slate-900/50 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Open PR Age Breakdown</h3>
                    <div className="space-y-4 pt-4">
                        {[
                            { label: 'Critical (>14d)', count: '42 PRs', color: '#ef4444', pct: 70 },
                            { label: 'High (7-14d)', count: '18 PRs', color: '#f59e0b', pct: 40 },
                            { label: 'Medium (<7d)', count: '12 PRs', color: '#6764f2', pct: 25 },
                        ].map(row => (
                            <div key={row.label} className="space-y-2">
                                <div className="flex justify-between text-xs font-mono uppercase tracking-tight">
                                    <span className="text-slate-300">{row.label}</span>
                                    <span className="font-bold" style={{ color: row.color }}>{row.count}</span>
                                </div>
                                <div className="w-full h-4 bg-slate-800 rounded-sm overflow-hidden flex">
                                    <div className="h-full" style={{ width: `${row.pct}%`, background: row.color }} />
                                    <div className="h-full flex-1" style={{ background: `${row.color}30` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Task Activity */}
            <section className="p-6 rounded-xl border border-[#1e1e2d] bg-slate-900/50 mb-6">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Task Activity Breakdown</h3>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-red-500" /><span className="text-xs font-mono uppercase">26 Stale</span></div>
                        <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#6764f2]" /><span className="text-xs font-mono uppercase">4 Active</span></div>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-1 h-12">
                    {Array.from({ length: 14 }, (_, i) => (
                        <div key={i} className="h-full flex-1 bg-red-500 rounded-l-lg" style={{ opacity: `${1 - i * 0.05}` }} />
                    ))}
                    {[50, 70, 90, 100].map((o, i) => (
                        <div key={`p${i}`} className={`h-full flex-1 bg-[#6764f2] ${i === 3 ? 'rounded-r-lg' : ''}`} style={{ opacity: `${o / 100}` }} />
                    ))}
                </div>
            </section>

            {/* Signal Breakdown */}
            <section className="space-y-4 mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Signal Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Dependency Lock', count: '14 Events', icon: 'emergency', color: '#ef4444' },
                        { label: 'Reviewer Block', count: '09 Events', icon: 'block', color: '#ef4444' },
                        { label: 'Merge Conflict', count: '06 Events', icon: 'sync_problem', color: '#f59e0b' },
                        { label: 'Scope Creep', count: '03 Events', icon: 'warning', color: '#f59e0b' },
                    ].map(sig => (
                        <div key={sig.label} className="p-4 rounded-lg flex gap-4 items-start" style={{ background: `${sig.color}10`, border: `1px solid ${sig.color}20` }}>
                            <div className="p-2 rounded text-white" style={{ background: sig.color }}>
                                <span className="material-symbols-outlined text-sm">{sig.icon}</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase" style={{ color: sig.color }}>{sig.label}</p>
                                <p className="text-lg font-mono font-bold text-white">{sig.count}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* LLM Reasoning + Mitigation Actions */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-8 rounded-xl border border-[#6764f2]/20 bg-[#6764f2]/5 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <span className="material-symbols-outlined text-8xl">psychology</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#6764f2]">
                        <span className="material-symbols-outlined">auto_awesome</span>
                        <h3 className="text-sm font-bold uppercase tracking-wider">LLM Reasoning</h3>
                    </div>
                    <div className="space-y-4 text-slate-300 leading-relaxed max-w-2xl">
                        <p>The current delay score of <span className="text-red-500 font-mono font-bold">0.96</span> is primarily driven by a systemic bottleneck in the <span className="font-bold text-white">Backend Microservices</span> repository. AI analysis detects a recursive dependency issue where 14 critical tasks are awaiting a shared library update that has been stale for 9 days.</p>
                        <p>The <span className="text-white underline decoration-red-500 underline-offset-4 font-semibold">"Overdue"</span> trend is accelerating. Based on current velocity, Milestone 4 delivery risk has increased from 15% to 68% in the last 72 hours. Corrective action is required immediately to prevent downstream cascading failures.</p>
                    </div>
                </div>

                <div className="p-8 rounded-xl border border-[#1e1e2d] bg-slate-900/50 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Mitigation Actions</h3>
                    <ul className="space-y-4">
                        {MITIGATION_MAP.map((m, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <button
                                    onClick={() => toggleCheck(i)}
                                    className="shrink-0 size-6 rounded flex items-center justify-center transition-all"
                                    style={{ border: `2px solid ${checked[i] ? '#6764f2' : '#374151'}`, color: checked[i] ? '#6764f2' : 'transparent', background: checked[i] ? '#6764f210' : 'transparent' }}>
                                    {checked[i] && <span className="material-symbols-outlined text-xs">check</span>}
                                </button>
                                <span className={`text-sm font-medium ${!checked[i] ? 'text-slate-400' : 'text-white'}`}>{m.label}</span>
                            </li>
                        ))}
                    </ul>

                    <button onClick={applyMitigations} disabled={applying}
                        className="w-full py-3 rounded-lg bg-[#6764f2] text-white font-bold text-sm shadow-lg shadow-[#6764f2]/20 hover:brightness-110 transition-all uppercase tracking-widest disabled:opacity-60">
                        {applying ? 'Applying…' : 'Apply Mitigations'}
                    </button>

                    {result && (
                        <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: `${rColor}30`, background: `${rColor}08` }}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-[20px]" style={{ color: rColor }}>{improved ? 'check_circle' : 'warning'}</span>
                                <span className="text-white font-bold text-sm">Mitigation {improved ? 'Applied Successfully' : 'Applied — Risk Increased'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center bg-[#0a0a0f]/40 border border-[#1e1e2d] rounded-lg p-3">
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">Before</p>
                                    <p className="text-red-500 text-2xl font-black font-mono">{result.baseline.toFixed(1)}</p>
                                    <p className="text-slate-500 text-xs">{result.levelBefore}</p>
                                </div>
                                <div className="flex items-center justify-center text-2xl" style={{ color: rColor }}>{improved ? '▼' : '▲'}</div>
                                <div className="text-center bg-[#0a0a0f]/40 rounded-lg p-3" style={{ border: `1px solid ${rColor}40` }}>
                                    <p className="text-slate-500 text-[10px] uppercase mb-1">After</p>
                                    <p className="text-2xl font-black font-mono" style={{ color: rColor }}>{result.simulated.toFixed(1)}</p>
                                    <p className="text-xs" style={{ color: rColor }}>{result.levelAfter}</p>
                                </div>
                            </div>
                            <div className="mt-3">
                                <RiskBar score100={Math.round(Math.abs(result.delta) * 3)} className="h-1.5 mb-1" />
                                <p className="text-xs font-bold" style={{ color: rColor }}>{improved ? '▼' : '▲'} {Math.abs(result.delta).toFixed(1)} pts {improved ? 'reduction' : 'increase'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
