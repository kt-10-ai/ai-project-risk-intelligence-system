import { useState } from 'react';
import Layout from '../components/Layout';
import { showToast } from '../hooks/useToast';
import { useRisk } from '../context/RiskContext';

type StepState = 'pending' | 'running' | 'done';

const REM_STEPS = [
    { icon: 'notifications', label: 'Ping Silent Devs', detail: 'Sending automated check-in to Alex Murphy & James Lim', duration: 1200 },
    { icon: 'forum', label: 'Escalate Threads', detail: 'Escalating 5 unanswered high-priority threads to PM', duration: 1600 },
    { icon: 'close_small', label: 'Resolve Stale PRs', detail: 'Auto-routing 4 stale PRs to Level-2 reviewers', duration: 1400 },
    { icon: 'admin_panel_settings', label: 'Notify Project Manager', detail: 'Generating Meridian alert digest to project leads', duration: 900 },
];

export default function CommsPage() {
    const { analysis } = useRisk();
    const [remOpen, setRemOpen] = useState(false);
    const [stepStates, setStepStates] = useState<StepState[]>(REM_STEPS.map(() => 'pending'));
    const [panelStatus, setPanelStatus] = useState<'idle' | 'running' | 'complete'>('idle');
    const [remResult, setRemResult] = useState<{ composite: string; commsScore: number | null } | null>(null);
    const [remRunning, setRemRunning] = useState(false);

    async function triggerRemediation() {
        if (remRunning) return;
        setRemRunning(true);
        setRemOpen(true);
        setRemResult(null);
        setStepStates(REM_STEPS.map(() => 'pending'));
        setPanelStatus('running');

        for (let i = 0; i < REM_STEPS.length; i++) {
            setStepStates(prev => { const n = [...prev]; n[i] = 'running'; return n; });
            await new Promise(r => setTimeout(r, REM_STEPS[i].duration));
            setStepStates(prev => { const n = [...prev]; n[i] = 'done'; return n; });
        }

        setPanelStatus('complete');
        try {
            const data = analysis;
            if (!data) throw new Error('no data');
            const commsAgent = (data.agents || []).find(a => a.agent === 'comms_agent');
            const newScore = commsAgent ? Math.round(commsAgent.risk_contribution * 100) : null;
            const composite = data.risk_score?.toFixed(1) ?? '—';
            setRemResult({ composite, commsScore: newScore });
            showToast('✓ Remediation complete — Comms agents updated', '#22c55e');
        } catch {
            setRemResult({ composite: '—', commsScore: null });
        }
        setRemRunning(false);
    }

    async function exportAnalysis() {
        showToast('Exporting analysis data…', '#6764f2');
        try {
            const data = analysis;
            if (!data) throw new Error('no data');
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'meridian-comms-analysis.json'; a.click();
            URL.revokeObjectURL(url);
            showToast('✓ Analysis exported as JSON', '#22c55e');
        } catch {
            showToast('Backend offline — cannot export', '#ef4444');
        }
    }

    function viewAllDevs() {
        showToast('Showing all tracked developers', '#6764f2');
    }

    return (
        <Layout>
            {/* Hero section */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#1e1e2d] mb-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                        <span>Agents</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-[#6764f2]">Comms Agent Detail</span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        <h1 className="text-4xl font-black tracking-tight text-white">COMMS RISK</h1>
                        <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold tracking-widest uppercase flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">warning</span> WARNING
                        </span>
                    </div>
                    <div className="flex items-center gap-6 mt-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Agent Score</span>
                            <span className="text-yellow-500 font-mono text-xl font-bold">0.56 — MODERATE</span>
                        </div>
                        <div className="w-px h-8 bg-[#1e1e2d]" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Confidence</span>
                            <span className="text-slate-200 font-mono text-xl font-bold">0.75</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportAnalysis}
                        className="px-4 py-2 rounded-lg border border-[#1e1e2d] text-slate-300 font-semibold text-sm hover:bg-white/5 transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">download</span> Export Analysis
                    </button>
                    <button onClick={triggerRemediation} disabled={remRunning}
                        className="px-4 py-2 rounded-lg bg-[#6764f2] text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-60">
                        <span className="material-symbols-outlined text-lg">bolt</span> Trigger Remediation
                    </button>
                </div>
            </section>

            {/* Stat cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[
                    { label: 'Silent Developers', icon: 'group_off', value: '2 of 6', badge: '-10% vs LW', badgeColor: '#ef4444', desc: 'Developers with zero slack/github activity in >48h' },
                    { label: 'Unanswered Threads', icon: 'forum', value: '5 of 20', badge: '+5% recovery', badgeColor: '#22c55e', desc: 'High-priority threads without external dev response' },
                    { label: 'Escalation Keywords', icon: 'priority_high', value: '4', badge: '0% change', badgeColor: '#64748b', desc: 'Detected in internal/external communications' },
                ].map(card => (
                    <div key={card.label} className="bg-[#6764f2]/5 p-6 rounded-xl border border-[#6764f2]/20 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">{card.label}</p>
                            <span className="material-symbols-outlined text-slate-400">{card.icon}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-white font-mono">{card.value}</p>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${card.badgeColor}20`, color: card.badgeColor }}>{card.badge}</span>
                        </div>
                        <p className="text-slate-400 text-xs mt-4">{card.desc}</p>
                    </div>
                ))}
            </section>

            {/* Dev status + Escalation Signals */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#6764f2]">analytics</span> Developer Communication Status
                    </h3>
                    <div className="bg-[#6764f2]/5 border border-[#6764f2]/20 rounded-xl overflow-hidden">
                        <div className="divide-y divide-[#6764f2]/10">
                            {[
                                { initials: 'AM', name: 'Alex Murphy', team: 'Core Engine Team', lastSeen: 'Last seen: 52h ago', status: 'SILENT', statusColor: '#ef4444', bg: '#ef444410' },
                                { initials: 'ST', name: 'Sarah Taggart', team: 'Infrastructure', lastSeen: 'Last seen: 4h ago', status: 'ACTIVE', statusColor: '#22c55e', bg: '#22c55e10' },
                                { initials: 'JL', name: 'James Lim', team: 'Frontend', lastSeen: 'Last seen: 49h ago', status: 'SILENT', statusColor: '#ef4444', bg: '#ef444410' },
                            ].map(dev => (
                                <div key={dev.name} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-[#6764f2]/20 flex items-center justify-center font-bold text-xs text-white">{dev.initials}</div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{dev.name}</p>
                                            <p className="text-[10px] text-slate-500">{dev.team}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-mono text-slate-400">{dev.lastSeen}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: dev.bg, color: dev.statusColor }}>{dev.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={viewAllDevs}
                            className="w-full py-3 bg-[#6764f2]/10 text-xs font-bold text-[#6764f2] hover:bg-[#6764f2]/20 transition-colors uppercase tracking-widest">
                            View All Developers
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-500">campaign</span> Escalation Signals (Last 72h)
                    </h3>
                    <div className="space-y-3">
                        {[
                            { platform: 'Slack — #dev-ops-critical', time: '14:32:01 UTC', borderColor: '#f59e0b', text: '"The production cluster is starting to ', highlight1: 'lag significantly', text2: '. We might need to ', highlight2: 'roll back', text3: ' the last deploy if this continues..."', tags: 'Triggers: Performance, Regression' },
                            { platform: 'GitHub — Issue #4402', time: 'Yesterday', borderColor: '#ef4444', text: '"This is a ', highlight1: 'blocker', text2: ' for our Q3 delivery. We\'ve been ', highlight2: 'waiting for feedback', text3: ' since Monday."', tags: 'Triggers: Delivery Risk, Sentiment' },
                        ].map((sig, i) => (
                            <div key={i} className="bg-[#12121a] p-4 rounded-xl border border-[#1e1e2d] space-y-3" style={{ borderLeftWidth: 4, borderLeftColor: sig.borderColor }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sig.platform}</span>
                                    <span className="text-[10px] font-mono text-slate-500">{sig.time}</span>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed italic">
                                    {sig.text}<span className="px-1 rounded font-bold" style={{ background: `${sig.borderColor}20`, color: sig.borderColor }}>{sig.highlight1}</span>{sig.text2}<span className="px-1 rounded font-bold" style={{ background: `${sig.borderColor}20`, color: sig.borderColor }}>{sig.highlight2}</span>{sig.text3}
                                </p>
                                <div className="flex gap-2">
                                    <span className="text-[9px] px-1.5 py-0.5 bg-[#6764f2]/10 rounded text-slate-500">{sig.tags}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Unanswered Threads breakdown */}
            <section className="space-y-4 mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#6764f2]">assignment_late</span> Unanswered Thread Breakdown
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'External-Facing', value: '03', desc: 'Threads visible to partners', dot: '#ef4444' },
                        { label: 'Internal Sync', value: '02', desc: 'Internal coordination blocks', dot: '#f59e0b' },
                        { label: 'Avg Response Delay', value: '14.2h', desc: '+2.1h from median', icon: 'schedule' },
                        { label: 'Sentiment Score', value: '0.42', desc: "Trending towards 'Frustrated'", icon: 'sentiment_dissatisfied' },
                    ].map(t => (
                        <div key={t.label} className="bg-[#6764f2]/5 p-4 rounded-xl border border-[#6764f2]/20 flex flex-col justify-between h-32">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.label}</span>
                                {'dot' in t && t.dot ? <span className="size-2 rounded-full" style={{ background: t.dot }} /> : <span className="material-symbols-outlined text-slate-500 text-sm">{t.icon}</span>}
                            </div>
                            <p className="text-2xl font-black text-white font-mono">{t.value}</p>
                            <p className="text-[10px] text-slate-500">{t.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* LLM Reasoning + Signal Breakdown */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#6764f2]">psychology</span> LLM Reasoning & Mitigation
                    </h3>
                    <div className="bg-[#6764f2]/5 border border-[#6764f2]/20 rounded-xl p-6 space-y-6">
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-[#6764f2]">Reasoning Chain</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                The agent identified a strong correlation between the <span className="text-slate-100 font-bold">52-hour silence</span> of core developer Alex Murphy and the sudden accumulation of <span className="text-slate-100 font-bold">Unanswered Threads</span> in #dev-ops-critical.
                                Linguistic analysis shows a <span className="bg-[#6764f2]/10 px-1 border-b border-[#6764f2]/40 italic">22% increase in urgent sentiment</span> compared to the 24h average. Cross-referencing GitHub shows a PR deadlock on #4402.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#6764f2]/10 p-4 rounded-lg border border-[#6764f2]/20">
                                <h5 className="text-[10px] font-black uppercase mb-2 text-[#6764f2]">Recommended Action</h5>
                                <p className="text-xs text-slate-300">Assign secondary reviewer to PR #4402 immediately to unblock Alex Murphy.</p>
                            </div>
                            <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                                <h5 className="text-[10px] font-black uppercase mb-2 text-green-500">Success Probability</h5>
                                <p className="text-xs text-slate-300">88% likely to reduce thread accumulation by EOD if implemented.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#6764f2]">query_stats</span> Signal Breakdown
                    </h3>
                    <div className="bg-[#6764f2]/5 border border-[#6764f2]/20 rounded-xl p-4 space-y-4">
                        {[
                            { label: 'Linguistic Tension', pct: 78, color: '#6764f2' },
                            { label: 'Activity Gap', pct: 64, color: '#f59e0b' },
                            { label: 'Resolution Lag', pct: 45, color: '#64748b' },
                        ].map(sig => (
                            <div key={sig.label} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                    <span>{sig.label}</span><span>{sig.pct}%</span>
                                </div>
                                <div className="w-full bg-[#6764f2]/10 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${sig.pct}%`, background: sig.color }} />
                                </div>
                            </div>
                        ))}
                        <div className="pt-4 border-t border-[#6764f2]/10">
                            <div className="flex items-start gap-2 bg-[#0a0a0f]/50 p-3 rounded-lg">
                                <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
                                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                                    Confidence note: Signal derivation is based on 0.75 historical reliability score for this agent type. Analysis window: last 72 hours.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* REMEDIATION PANEL (bottom slide-in) */}
            {remOpen && (
                <div className="fixed bottom-0 left-0 right-0 z-[9000] bg-[#0a0a0f] border-t border-[#6764f2]/25 p-6">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#6764f2] text-xl">bolt</span>
                                <span className="text-white font-black text-sm uppercase tracking-widest">Remediation Engine</span>
                                <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{
                                    background: panelStatus === 'complete' ? '#22c55e20' : panelStatus === 'running' ? '#f59e0b20' : '#6764f220',
                                    color: panelStatus === 'complete' ? '#22c55e' : panelStatus === 'running' ? '#f59e0b' : '#6764f2',
                                    border: `1px solid ${panelStatus === 'complete' ? '#22c55e40' : panelStatus === 'running' ? '#f59e0b40' : '#6764f240'}`,
                                }}>
                                    {panelStatus.toUpperCase()}
                                </span>
                            </div>
                            <button onClick={() => setRemOpen(false)} className="bg-[#1e1e2d] border-none text-slate-400 px-3 py-1.5 rounded text-xs hover:bg-[#2d2d3d] transition-colors">✕ Close</button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {REM_STEPS.map((step, i) => {
                                const state = stepStates[i];
                                return (
                                    <div key={i} className="bg-[#12121a] rounded-xl p-4 transition-all" style={{
                                        border: `1px solid ${state === 'done' ? '#22c55e40' : state === 'running' ? '#6764f2' : '#1e1e2d'}`,
                                    }}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="size-7 rounded flex items-center justify-center transition-all" style={{ background: state === 'done' ? '#22c55e20' : state === 'running' ? '#6764f220' : '#1e1e2d' }}>
                                                <span className="material-symbols-outlined text-sm" style={{ color: state === 'done' ? '#22c55e' : state === 'running' ? '#6764f2' : '#64748b' }}>
                                                    {state === 'done' ? 'check_circle' : step.icon}
                                                </span>
                                            </div>
                                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: state === 'done' ? '#22c55e20' : state === 'running' ? '#6764f220' : '#1e1e2d', color: state === 'done' ? '#22c55e' : state === 'running' ? '#6764f2' : '#64748b' }}>
                                                {state.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-white font-bold text-xs mb-1">{step.label}</p>
                                        <p className="text-slate-500 text-[10px] leading-snug">{step.detail}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {remResult && (
                            <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/5 flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-green-500 text-xl">verified</span>
                                    <div>
                                        <p className="text-white font-black text-sm">Remediation Complete — 4/4 Actions Executed</p>
                                        <p className="text-slate-500 text-xs">Comms risk recalculated · Composite score: <strong className="text-white">{remResult.composite}</strong></p>
                                    </div>
                                </div>
                                {remResult.commsScore !== null && (
                                    <div className="text-center">
                                        <p className="text-slate-500 text-[10px] uppercase">New Comms Score</p>
                                        <p className="text-green-500 text-2xl font-black font-mono">{remResult.commsScore}<span className="text-sm text-slate-500">/100</span></p>
                                    </div>
                                )}
                                <a href="/report" className="bg-[#6764f2] text-white px-4 py-2 rounded-lg font-bold text-xs">View Full Report →</a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
}
