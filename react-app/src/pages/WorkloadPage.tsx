import { useState } from 'react';
import Layout from '../components/Layout';

import { showToast } from '../hooks/useToast';
import { useRisk } from '../context/RiskContext';

const DEVS = [
    { name: 'Alice', pct: 85, color: '#6764f2', critical: false },
    { name: 'Bob (Critical)', pct: 98, color: '#ef4444', critical: true },
    { name: 'Charlie', pct: 45, color: '#6764f2', critical: false },
    { name: 'Diana (Overloaded)', pct: 92, color: '#ef4444', critical: true },
    { name: 'Eve', pct: 62, color: '#6764f2', critical: false },
    { name: 'Frank', pct: 30, color: '#6764f2', critical: false },
];

export default function WorkloadPage() {
    const { analysis } = useRisk();
    const [recalibrating, setRecalibrating] = useState(false);
    const [heroScore, setHeroScore] = useState('0.50');
    const [stats, setStats] = useState({ overloaded: '2 of 6', concentration: '22%', unassigned: '3' });

    async function recalibrate() {
        setRecalibrating(true);
        try {
            const data = analysis;
            if (!data) throw new Error('no data');
            const agents = data.agents || [];
            const wl = agents.find(a => a.agent === 'workload_agent');
            const sigs = (data.signals?.signals as Record<string, { value?: number; score: number }>) || {};
            const overloadedRatio = sigs.overloaded_dev_ratio?.value ?? 0.33;
            const concIndex = sigs.task_concentration_index?.value ?? 0.22;
            const unassignedRatio = sigs.unassigned_task_ratio?.value ?? 0.05;
            const totalScore = Math.round((wl?.risk_contribution ?? 0.58) * 100);
            setHeroScore((totalScore / 100).toFixed(2));
            setStats({
                overloaded: `${Math.round(overloadedRatio * 6)} of 6`,
                concentration: `${Math.round(concIndex * 100)}%`,
                unassigned: `${Math.round(unassignedRatio * 60)}`,
            });
            showToast(`✓ Recalibration Complete · Score: ${(totalScore / 100).toFixed(2)}`, '#22c55e');
        } catch {
            showToast('Backend unavailable — data unchanged', '#ef4444');
        }
        setRecalibrating(false);
    }

    return (
        <Layout>
            <div className="space-y-4 mb-6">
                <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
                    <span>Workload</span>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <span className="text-slate-200">Agent Detail</span>
                </nav>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Workload Risk</h1>
                        <p className="text-slate-500 font-medium mt-1">System Health: <span className="font-mono text-yellow-500">{heroScore}</span> Score</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-bold tracking-widest">MODERATE RISK</span>
                        <button onClick={recalibrate} disabled={recalibrating}
                            className="bg-[#6764f2] hover:bg-[#5451e0] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-[#6764f2]/20 disabled:opacity-60">
                            {recalibrating ? 'RECALIBRATING…' : 'RECALIBRATE'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[
                    { label: 'Overloaded Developers', value: stats.overloaded, trend: '+10%', up: true },
                    { label: 'Task Concentration', value: stats.concentration, trend: '+2%', up: true },
                    { label: 'Unassigned Tasks', value: stats.unassigned + ' tasks', trend: '-5%', up: false },
                ].map(card => (
                    <div key={card.label} className="bg-slate-900/50 border border-[#1e1e2d] p-6 rounded-xl space-y-2">
                        <p className="text-slate-400 text-sm font-medium">{card.label}</p>
                        <p className="text-3xl font-bold text-white font-mono">{card.value}</p>
                        <p className={`text-sm font-bold flex items-center gap-1 ${card.up ? 'text-emerald-500' : 'text-orange-500'}`}>
                            <span className="material-symbols-outlined text-sm">{card.up ? 'trending_up' : 'trending_down'}</span> {card.trend}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-900/50 border border-[#1e1e2d] p-6 rounded-xl">
                    <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Developer Task Distribution</h3>
                    <div className="space-y-4">
                        {DEVS.map(dev => (
                            <div key={dev.name} className="space-y-1">
                                <div className={`flex justify-between text-xs font-mono mb-1 ${dev.critical ? 'text-red-500' : 'text-slate-300'}`}>
                                    <span>{dev.name}</span><span>{dev.pct}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${dev.pct}%`, background: dev.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-[#1e1e2d] p-6 rounded-xl flex flex-col items-center">
                    <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider self-start">Workload Concentration</h3>
                    <div className="relative size-44">
                        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                            <circle className="stroke-slate-800" cx="18" cy="18" fill="none" r="16" strokeWidth="3" />
                            <circle cx="18" cy="18" fill="none" r="16" stroke="#6764f2" strokeDasharray="78, 100" strokeLinecap="round" strokeWidth="3" />
                            <circle cx="18" cy="18" fill="none" r="16" stroke="#f59e0b" strokeDasharray="22, 100" strokeDashoffset="-78" strokeLinecap="round" strokeWidth="3" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white font-mono">22%</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Skew Index</span>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2">
                        <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#6764f2]" /><span className="text-xs text-slate-400">Normal Dist.</span></div>
                        <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-yellow-500" /><span className="text-xs text-slate-400">Concentrated</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-[#1e1e2d] rounded-xl overflow-hidden mb-6">
                <div className="p-6 border-b border-[#1e1e2d]">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider">Signals Breakdown</h3>
                </div>
                <div className="divide-y divide-[#1e1e2d]">
                    {[
                        { icon: 'warning', color: '#ef4444', name: 'overloaded_dev_ratio', desc: 'Percentage of developers exceeding 90% capacity', value: '0.33', level: 'HIGH', bg: '#ef444415' },
                        { icon: 'sensors', color: '#f59e0b', name: 'task_concentration_index', desc: 'Gini coefficient applied to task point distribution', value: '0.22', level: 'MEDIUM', bg: '#f59e0b15' },
                        { icon: 'check_circle', color: '#22c55e', name: 'unassigned_task_ratio', desc: 'Backlog items vs active sprint items', value: '0.05', level: 'LOW', bg: '#22c55e15' },
                    ].map(sig => (
                        <div key={sig.name} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined" style={{ color: sig.color }}>{sig.icon}</span>
                                <div>
                                    <p className="text-sm font-bold text-white font-mono">{sig.name}</p>
                                    <p className="text-xs text-slate-500">{sig.desc}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-white font-mono">{sig.value}</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: sig.bg, color: sig.color }}>{sig.level}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-[#6764f2]/5 border border-[#6764f2]/20 p-6 rounded-xl mb-6 space-y-4">
                <div className="flex items-center gap-2 text-[#6764f2]">
                    <span className="material-symbols-outlined">psychology</span>
                    <h3 className="font-bold text-sm uppercase tracking-wider">Agent Reasoning</h3>
                </div>
                <div className="text-slate-400 leading-relaxed text-sm space-y-2">
                    <p>Analysis of current sprint <span className="text-[#6764f2] font-mono">v2.4.0</span> indicates a <span className="text-yellow-500 font-bold italic underline">Moderate Risk</span> profile. While the overall system throughput remains stable, the risk is driven by excessive concentration of high-priority tickets on two senior engineers (<span className="text-slate-200">Bob</span> and <span className="text-slate-200">Diana</span>).</p>
                    <p>Bob is currently assigned to 3 critical path items simultaneously. Diana's workload includes 15 points of complex refactoring which may bleed into the next cycle. The issue is not capacity, but <span className="text-[#6764f2] font-bold">allocation strategy</span>.</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider">Recommended Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => showToast("✓ Bob's Auth Service Refactor reassigned to Charlie", '#22c55e')}
                        className="flex items-center justify-between p-4 bg-slate-900/50 border border-[#1e1e2d] rounded-xl hover:border-[#6764f2] transition-all group text-left">
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-lg bg-[#6764f2]/10 flex items-center justify-center text-[#6764f2] group-hover:bg-[#6764f2] group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined">rebase_edit</span>
                            </div>
                            <div>
                                <p className="font-bold text-sm text-white">Redistribute Bob's Tasks</p>
                                <p className="text-xs text-slate-500">Move 'Auth Service Refactor' to Charlie</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-[#6764f2]">arrow_forward</span>
                    </button>
                    <button onClick={() => showToast("✓ Legacy DB Migration deferred — Diana's schedule updated", '#22c55e')}
                        className="flex items-center justify-between p-4 bg-slate-900/50 border border-[#1e1e2d] rounded-xl hover:border-[#6764f2] transition-all group text-left">
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-lg bg-[#6764f2]/10 flex items-center justify-center text-[#6764f2] group-hover:bg-[#6764f2] group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined">schedule_send</span>
                            </div>
                            <div>
                                <p className="font-bold text-sm text-white">Defer Diana's Tech Debt</p>
                                <p className="text-xs text-slate-500">Postpone 'Legacy DB Migration' by 1 week</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-[#6764f2]">arrow_forward</span>
                    </button>
                </div>
            </div>
        </Layout>
    );
}
