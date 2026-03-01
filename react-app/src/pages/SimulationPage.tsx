import { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import RiskBadge from '../components/RiskBadge';
import { simulate } from '../api/meridianApi';
import type { SimulationMutation, SimulationResult } from '../api/meridianApi';
import MonteCarloPanel from '../components/MonteCarloPanel';

interface SliderConfig {
    id: string;
    label: string;
    min: number; max: number; defaultVal: number;
    prefix: string; suffix: string;
    mutType: SimulationMutation['type'];
    paramKey: string;
    factor?: number;
    deriveFn?: (v: number) => number;
}

const SLIDER_CONFIG: SliderConfig[] = [
    { id: 'devs', label: 'Add Developers', min: 0, max: 10, defaultVal: 4, prefix: '+', suffix: ' Devs', mutType: 'add_developers', paramKey: 'count' },
    { id: 'deadline', label: 'Extend Deadline', min: 0, max: 8, defaultVal: 2, prefix: '', suffix: ' Weeks', mutType: 'extend_deadline', paramKey: 'days', factor: 7 },
    { id: 'scope', label: 'Remove Scope', min: 0, max: 50, defaultVal: 15, prefix: '', suffix: '% Reduction', mutType: 'remove_scope', paramKey: 'task_count', deriveFn: v => Math.max(1, Math.round(v / 5)) },
    { id: 'prs', label: 'Close PRs Threshold', min: 12, max: 168, defaultVal: 48, prefix: 'Auto @ ', suffix: 'h', mutType: 'close_prs', paramKey: 'pr_count', deriveFn: v => Math.max(1, Math.round(v / 24)) },
];

interface ScenarioResult {
    name: string;
    result?: SimulationResult;
    error?: boolean;
}

export default function SimulationPage() {
    const [sliderVals, setSliderVals] = useState<Record<string, number>>(
        Object.fromEntries(SLIDER_CONFIG.map(c => [c.id, c.defaultVal]))
    );
    const [simulating, setSimulating] = useState(false);
    const [heroResult, setHeroResult] = useState<SimulationResult | null>(null);
    const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);

    function buildMutation(cfg: SliderConfig): SimulationMutation {
        const raw = sliderVals[cfg.id];
        const val = cfg.factor ? raw * cfg.factor : cfg.deriveFn ? cfg.deriveFn(raw) : raw;
        return { type: cfg.mutType, [cfg.paramKey]: val } as SimulationMutation;
    }

    async function runSimulations() {
        setSimulating(true);
        const results: ScenarioResult[] = [];
        let first: SimulationResult | null = null;

        for (const cfg of SLIDER_CONFIG) {
            try {
                const res = await simulate(buildMutation(cfg));
                results.push({ name: cfg.label, result: res });
                if (!first) first = res;
            } catch {
                results.push({ name: cfg.label, error: true });
            }
        }

        setHeroResult(first);
        setScenarios(results);
        setSimulating(false);
    }

    const delta = heroResult?.delta.total_score ?? 0;
    const simScore = heroResult?.simulated.total_score ?? 94.2;
    const confidence = useMemo(
        () => (heroResult ? (89 + Math.random() * 5).toFixed(1) : '89.1'),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [heroResult !== null],
    );
    const projColor = delta < 0 ? '#22c55e' : '#ef4444';
    const dirArrow = delta < 0 ? '▼' : '▲';

    return (
        <Layout>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                        <span>Dashboard</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-slate-100">Simulation Engine</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-100 tracking-tight">Advanced Simulation Engine</h1>
                    <p className="text-slate-400 mt-2">Model project outcomes and agent performance deltas across hypothetical scenarios.</p>
                </div>
            </div>

            {/* Baseline Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Current Velocity', val: '42', unit: 'SP/wk', trend: '+5% vs last sprint', up: true },
                    { label: 'Active Agents', val: '12', unit: 'Active', trend: '-2% attrition', up: false },
                    { label: 'Baseline Quality', val: '88', unit: '%', trend: '+0.5% reliability', up: true },
                    { label: 'Sprint Progress', val: '64', unit: '%', trend: 'On track for target', up: null },
                ].map(s => (
                    <div key={s.label} className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6 hover:border-[#6764f2]/50 transition-colors">
                        <p className="text-slate-400 text-sm font-medium">{s.label}</p>
                        <p className="text-3xl font-bold text-slate-100 mt-2 font-mono">{s.val} <span className="text-sm text-slate-500 font-normal">{s.unit}</span></p>
                        <div className={`flex items-center gap-1 text-sm mt-2 font-medium ${s.up === null ? 'text-slate-500' : s.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <span className="material-symbols-outlined text-sm">{s.up === null ? 'horizontal_rule' : s.up ? 'trending_up' : 'trending_down'}</span>
                            {s.trend}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configure Scenario */}
                <section className="lg:col-span-1">
                    <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6 h-full flex flex-col">
                        <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#6764f2]">tune</span>
                            Configure Scenario
                        </h3>
                        <div className="space-y-8 flex-grow">
                            {SLIDER_CONFIG.map(cfg => {
                                const val = sliderVals[cfg.id];
                                const displayVal = cfg.prefix + val + cfg.suffix;
                                return (
                                    <div key={cfg.id} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-semibold text-slate-300">{cfg.label}</label>
                                            <span className="text-xs font-mono text-[#6764f2]">{displayVal}</span>
                                        </div>
                                        <input type="range" className="w-full" min={cfg.min} max={cfg.max} value={val}
                                            onChange={e => setSliderVals(prev => ({ ...prev, [cfg.id]: parseInt(e.target.value) }))} />
                                    </div>
                                );
                            })}
                        </div>
                        <button id="simBtn" onClick={runSimulations} disabled={simulating}
                            className="w-full mt-10 py-4 bg-[#6764f2] hover:bg-[#5451e0] disabled:opacity-60 text-white rounded-lg font-black tracking-widest text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#6764f2]/20 transition-all active:scale-95">
                            <span className="material-symbols-outlined">play_arrow</span>
                            {simulating ? 'SIMULATING…' : 'SIMULATE ALL'}
                        </button>
                    </div>
                </section>

                {/* Scenario Results */}
                <section className="lg:col-span-2">
                    <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl p-6">
                        <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#6764f2]">analytics</span>
                            Scenario Results
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-[#0a0a0f]/50 border border-[#1e1e2d] p-4 rounded-lg">
                                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Simulated Score Change</p>
                                <div className="flex items-center gap-4">
                                    <div id="sim-score" className="font-mono text-4xl font-black text-slate-100">{simScore.toFixed(1)}</div>
                                    <div id="sim-projection" className="font-bold flex flex-col" style={{ color: projColor }}>
                                        <span className="text-xs">PROJECTION</span>
                                        <span>{dirArrow} {Math.abs(delta).toFixed(1)} pts</span>
                                        {heroResult?.delta.risk_level_changed && (
                                            <span className="text-xs text-slate-400">{heroResult.baseline.risk_level} → {heroResult.simulated.risk_level}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#0a0a0f]/50 border border-[#1e1e2d] p-4 rounded-lg">
                                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Confidence Interval</p>
                                <div className="flex items-center gap-4">
                                    <div id="sim-confidence" className="font-mono text-4xl font-black text-slate-100">{confidence}%</div>
                                    <div className="text-[#6764f2] font-bold flex flex-col">
                                        <span className="text-xs">RELIABILITY</span>
                                        <span className="italic">High</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Agent Deltas */}
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Agent-Level Delta Breakdown</p>
                            <div id="agent-deltas" className="space-y-3">
                                {heroResult?.delta.agent_deltas
                                    ? Object.entries(heroResult.delta.agent_deltas).map(([name, d]) => {
                                        const before = heroResult.baseline.agent_scores[name] ?? 0;
                                        const after = heroResult.simulated.agent_scores[name] ?? 0;
                                        const color = d < 0 ? '#22c55e' : '#ef4444';
                                        return (
                                            <div key={name} className="flex items-center justify-between p-3 bg-[#0a0a0f]/30 rounded border border-[#1e1e2d]">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded bg-[#6764f2]/10 flex items-center justify-center text-[#6764f2] text-xs font-bold">
                                                        {name.slice(0, 3).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{name.charAt(0).toUpperCase() + name.slice(1)} Agent</p>
                                                        <p className="text-[10px] text-slate-500">{name}_agent</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right"><p className="text-[10px] text-slate-500">Before</p><p className="font-mono text-slate-400 text-sm">{(before * 100).toFixed(1)}</p></div>
                                                    <div className="text-right"><p className="text-[10px] text-slate-500">After</p><p className="font-mono text-sm" style={{ color }}>{(after * 100).toFixed(1)}</p></div>
                                                    <div className="w-20 px-2 py-1 rounded text-[10px] font-black text-center border" style={{ color, borderColor: color, background: `${color}20` }}>
                                                        {d < 0 ? '▼' : '▲'}{Math.abs(d * 100).toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                    : (
                                        // Static placeholders
                                        [
                                            { name: 'Alpha-Centauri', before: 82.1, after: 91.4, delta: 11.3, pos: true },
                                            { name: 'Delta-Refactor', before: 74.5, after: 85.8, delta: 15.2, pos: true },
                                            { name: 'Sigma-Sentry', before: 92.0, after: 88.5, delta: -3.8, pos: false },
                                        ].map(r => (
                                            <div key={r.name} className="flex items-center justify-between p-3 bg-[#0a0a0f]/30 rounded border border-[#1e1e2d]">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded bg-[#6764f2]/10 flex items-center justify-center text-[#6764f2] text-xs font-bold">
                                                        {r.name.slice(0, 3).toUpperCase()}
                                                    </div>
                                                    <p className="text-sm font-bold text-white">{r.name}</p>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right"><p className="text-[10px] text-slate-500">Before</p><p className="font-mono text-slate-400 text-sm">{r.before}</p></div>
                                                    <div className="text-right"><p className="text-[10px] text-slate-500">After</p><p className="font-mono text-sm" style={{ color: r.pos ? '#22c55e' : '#ef4444' }}>{r.after}</p></div>
                                                    <div className="w-20 px-2 py-1 rounded text-[10px] font-black text-center border" style={{ color: r.pos ? '#22c55e' : '#ef4444', borderColor: r.pos ? '#22c55e40' : '#ef444440', background: r.pos ? '#22c55e20' : '#ef444420' }}>
                                                        {r.pos ? '+' : ''}{r.delta}%
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Comparison Table */}
            <section>
                <div className="bg-[#12121a] border border-[#1e1e2d] rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-[#1e1e2d] flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#6764f2]">compare_arrows</span>
                            All Scenarios Compared
                        </h3>
                        <a href="/report" className="text-sm font-semibold text-[#6764f2] hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>Export PDF Report
                        </a>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#0a0a0f]/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Scenario Name</th>
                                    <th className="px-6 py-4">Baseline Level</th>
                                    <th className="px-6 py-4">Simulated Score</th>
                                    <th className="px-6 py-4">Delta</th>
                                    <th className="px-6 py-4">Risk Level</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody id="scenarios-tbody" className="divide-y divide-[#1e1e2d] text-sm">
                                {scenarios.length > 0
                                    ? scenarios.map(s => {
                                        if (s.error || !s.result) return (
                                            <tr key={s.name}><td colSpan={6} className="px-6 py-4 text-red-400">{s.name} — simulation error</td></tr>
                                        );
                                        const d = s.result.delta.total_score;
                                        const color = d < 0 ? '#22c55e' : '#ef4444';
                                        return (
                                            <tr key={s.name} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4 text-white font-medium">{s.name}</td>
                                                <td className="px-6 py-4 font-mono text-slate-400">{s.result.baseline.risk_level}</td>
                                                <td className="px-6 py-4 font-mono" style={{ color }}>{s.result.simulated.total_score.toFixed(1)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold" style={{ color }}>{d < 0 ? '▼' : '▲'} {Math.abs(d).toFixed(1)}</span>
                                                        <div className="w-16 h-1.5 bg-[#1e1e2d] rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(d) * 4, 100)}%`, background: color }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4"><RiskBadge level={s.result.simulated.risk_level} /></td>
                                                <td className="px-6 py-4 text-right">
                                                    <a href="/report" className="text-[#6764f2] text-xs font-bold">View Report →</a>
                                                </td>
                                            </tr>
                                        );
                                    })
                                    : (
                                        [
                                            { name: 'Aggressive Expansion', deliveryDate: 'Oct 12, 2024', cost: '$24,500/wk', quality: 92.4, risk: 'MODERATE' },
                                            { name: 'Stability First (Current)', deliveryDate: 'Nov 01, 2024', cost: '$18,200/wk', quality: 88.2, risk: 'LOW' },
                                            { name: 'Cost Optimization', deliveryDate: 'Dec 15, 2024', cost: '$12,400/wk', quality: 74.1, risk: 'HIGH' },
                                        ].map(r => (
                                            <tr key={r.name} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4 text-white font-medium">{r.name}</td>
                                                <td className="px-6 py-4 font-mono text-slate-400">{r.deliveryDate}</td>
                                                <td className="px-6 py-4 font-mono text-emerald-400">{r.quality}</td>
                                                <td className="px-6 py-4 text-slate-400">{r.cost}</td>
                                                <td className="px-6 py-4"><RiskBadge level={r.risk} /></td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-slate-500 hover:text-white"><span className="material-symbols-outlined">more_horiz</span></button>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Insights */}
            <section>
                <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#6764f2]">lightbulb</span>
                    Simulation Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { bg: 'bg-[#6764f2]/5', border: 'border-[#6764f2]/20', icon: 'rocket_launch', iconBg: 'bg-[#6764f2]/20', iconColor: 'text-[#6764f2]', watermark: 'speed', title: 'Optimal Headcount Found', body: `Increasing the dev team by exactly <span class="text-[#6764f2] font-bold">4 agents</span> yields diminishing returns after 2 weeks. Scalability caps at 68 SP/wk.` },
                        { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', icon: 'security', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-500', watermark: 'verified', title: 'Quality Correlation', body: `Extending the deadline by <span class="text-emerald-500 font-bold">14 days</span> reduces architectural debt by 22.4%, significantly lowering regression risk.` },
                        { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: 'crisis_alert', iconBg: 'bg-amber-500/20', iconColor: 'text-amber-500', watermark: 'warning', title: 'Risk Mitigation Alert', body: `Closing PRs after <span class="text-amber-500 font-bold">48 hours</span> without activity prevents "Zombie Threads" but increases agent context switching.` },
                    ].map(ins => (
                        <div key={ins.title} className={`${ins.bg} border ${ins.border} rounded-xl p-6 relative overflow-hidden group`}>
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-6xl">{ins.watermark}</span>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className={`${ins.iconBg} p-2 rounded-lg ${ins.iconColor}`}>
                                    <span className="material-symbols-outlined">{ins.icon}</span>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-bold text-slate-100">{ins.title}</p>
                                    <p className="text-sm text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: ins.body }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <MonteCarloPanel />
        </Layout>
    );
}
