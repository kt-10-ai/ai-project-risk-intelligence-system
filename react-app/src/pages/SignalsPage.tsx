import { useState } from 'react';
import Layout from '../components/Layout';
import RiskBar from '../components/RiskBar';
import { SIGNAL_META } from '../api/meridianApi';
import { hexFromScore } from '../components/RiskBadge';
import { useRisk } from '../context/RiskContext';

const GROUP_LABELS: Record<string, string> = {
    dependency: 'Dependency', workload: 'Workload',
    scope: 'Scope', delay: 'Delay', comms: 'Comms',
};

const GROUPS = ['dependency', 'workload', 'scope', 'delay', 'comms'];

export default function SignalsPage() {
    const { analysis } = useRisk();
    const [activeGroup, setActiveGroup] = useState<string | null>(null);

    const signals = analysis?.signals?.signals ?? {};

    const filteredSignals = Object.entries(SIGNAL_META).filter(
        ([key]) => !activeGroup || SIGNAL_META[key]?.group === activeGroup
    );

    const totalSignals = Object.keys(SIGNAL_META).length;
    const highRisk = Object.values(signals).filter(s => s.score >= 0.75).length;
    const moderate = Object.values(signals).filter(s => s.score >= 0.5 && s.score < 0.75).length;
    const healthy = Object.values(signals).filter(s => s.score < 0.5).length;

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                        <span>Dashboard</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-slate-100">Signal Inspector</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Signal Inspector</h1>
                    <p className="text-slate-400 mt-2">Deep-dive into the 15 raw signals powering the risk engine.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Signals', val: totalSignals, color: 'text-white' },
                    { label: 'High Risk', val: highRisk, color: 'text-[#ef4444]' },
                    { label: 'Moderate', val: moderate, color: 'text-[#f59e0b]' },
                    { label: 'Healthy', val: healthy, color: 'text-[#22c55e]' },
                ].map(s => (
                    <div key={s.label} className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-4 text-center">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{s.label}</p>
                        <p className={`text-2xl font-black font-mono ${s.color}`}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={() => setActiveGroup(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${!activeGroup ? 'bg-[#6764f2]/20 border-[#6764f2]/50 text-[#6764f2]' : 'bg-[#1e1e2d]/50 border-[#1e1e2d] text-white hover:border-[#6764f2]/50'}`}>
                    All Signals
                </button>
                {GROUPS.map(g => (
                    <button key={g} onClick={() => setActiveGroup(g)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${activeGroup === g ? 'bg-[#6764f2]/20 border-[#6764f2]/50 text-[#6764f2]' : 'bg-[#1e1e2d]/50 border-[#1e1e2d] text-white hover:border-[#6764f2]/50'}`}>
                        {GROUP_LABELS[g]}
                    </button>
                ))}
            </div>

            {/* Signal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredSignals.map(([key, meta]) => {
                    const sig = signals[key];
                    const score100 = sig ? Math.round(sig.score * 100) : 0;
                    const hex = hexFromScore(score100);
                    const rawVal = sig?.value;
                    const displayVal = rawVal !== undefined
                        ? (typeof rawVal === 'number' && rawVal > 0 && rawVal < 1 && !Number.isInteger(rawVal)
                            ? (rawVal * 100).toFixed(1) + '%'
                            : rawVal + meta.unit)
                        : '—';

                    return (
                        <div key={key} className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-5 hover:border-[#6764f2]/30 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-white font-semibold text-sm">{meta.label}</p>
                                    <p className="text-slate-500 text-[10px] font-mono uppercase mt-0.5">{key}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono font-black text-lg" style={{ color: hex }}>{score100}</p>
                                    <p className="text-slate-500 text-[10px]">/ 100</p>
                                </div>
                            </div>
                            <RiskBar score100={score100} className="mb-3" />
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-xs">Raw value</span>
                                <span className="font-mono text-xs text-slate-300">{displayVal}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Layout>
    );
}
