import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MeridianLogo from '../components/MeridianLogo';
import { getAnalysis } from '../api/meridianApi';

const INIT_STEPS = [
    { icon: 'hub', label: 'Connecting to Agent Network', delay: 400 },
    { icon: 'monitoring', label: 'Fetching Dependency Intelligence', delay: 900 },
    { icon: 'schedule', label: 'Loading Delay Risk Signals', delay: 1400 },
    { icon: 'group', label: 'Analyzing Workload Distribution', delay: 1900 },
    { icon: 'track_changes', label: 'Scanning Scope Boundaries', delay: 2400 },
    { icon: 'forum', label: 'Processing Communication Patterns', delay: 2900 },
    { icon: 'auto_awesome', label: 'Synthesizing Composite Risk Score', delay: 3400 },
];

export default function InitPage() {
    const navigate = useNavigate();
    const [active, setActive] = useState(-1);
    const [done, setDone] = useState<boolean[]>(new Array(INIT_STEPS.length).fill(false));
    const [score, setScore] = useState<number | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        // Start steps animations
        INIT_STEPS.forEach((step, i) => {
            setTimeout(() => setActive(i), step.delay);
            setTimeout(() => setDone(prev => { const n = [...prev]; n[i] = true; return n; }), step.delay + 380);
        });

        // Fetch real data in background
        getAnalysis()
            .then(data => setScore(data.risk_score ?? null))
            .catch(() => setError(true));

        // Navigate to dashboard after all steps complete + small pause
        const totalDuration = INIT_STEPS[INIT_STEPS.length - 1].delay + 900;
        const timer = setTimeout(() => navigate('/dashboard', { replace: true }), totalDuration);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background grid */}
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(103,100,242,0.08) 1px, transparent 0)', backgroundSize: '28px 28px' }} />

            {/* Glow orb */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 rounded-full bg-[#6764f2]/5 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-sm px-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-4">
                    <div className="size-16 text-[#6764f2] animate-pulse">
                        <MeridianLogo />
                    </div>
                    <div className="text-center">
                        <h1 className="text-white text-2xl font-black tracking-tight">MERIDIAN</h1>
                        <p className="text-slate-500 text-xs font-mono mt-1 tracking-widest uppercase">Intelligence Engine v4.2.0</p>
                    </div>
                </div>

                {/* Steps */}
                <div className="w-full space-y-2">
                    {INIT_STEPS.map((step, i) => {
                        const isActive = active === i && !done[i];
                        const isDone = done[i];
                        return (
                            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${isDone ? 'bg-[#6764f2]/5 border border-[#6764f2]/15' : isActive ? 'bg-[#6764f2]/10 border border-[#6764f2]/30' : 'border border-transparent'}`}>
                                <div className={`size-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'bg-[#22c55e]/15' : isActive ? 'bg-[#6764f2]/20' : 'bg-[#1e1e2d]'}`}>
                                    {isDone
                                        ? <span className="material-symbols-outlined text-[#22c55e] text-[14px]">check</span>
                                        : isActive
                                            ? <span className="material-symbols-outlined text-[#6764f2] text-[14px] animate-spin" style={{ animationDuration: '1.2s' }}>refresh</span>
                                            : <span className="material-symbols-outlined text-slate-600 text-[14px]">{step.icon}</span>
                                    }
                                </div>
                                <span className={`text-xs font-mono transition-colors ${isDone ? 'text-slate-400' : isActive ? 'text-white' : 'text-slate-600'}`}>
                                    {step.label}
                                </span>
                                {isDone && <span className="ml-auto text-[10px] font-mono text-[#22c55e]">DONE</span>}
                                {isActive && <span className="ml-auto text-[10px] font-mono text-[#6764f2] animate-pulse">RUNNING</span>}
                            </div>
                        );
                    })}
                </div>

                {/* Score preview */}
                {score !== null && (
                    <div className="flex flex-col items-center gap-1 animate-fade-in">
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Composite Risk Score</p>
                        <p className="text-4xl font-black font-mono" style={{ color: score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : '#22c55e' }}>
                            {score.toFixed(1)}
                        </p>
                    </div>
                )}

                {error && (
                    <p className="text-[#f59e0b] text-xs font-mono text-center">
                        ⚠ Backend unavailable — loading with demo data
                    </p>
                )}

                {/* Progress bar */}
                <div className="w-full h-px bg-[#1e1e2d] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#6764f2] to-[#a5b4fc] rounded-full transition-all ease-linear"
                        style={{ width: `${done.filter(Boolean).length / INIT_STEPS.length * 100}%`, transitionDuration: '400ms' }}
                    />
                </div>

                <p className="text-slate-600 text-[10px] font-mono tracking-widest uppercase">
                    {done.filter(Boolean).length} / {INIT_STEPS.length} modules loaded
                </p>
            </div>
        </div>
    );
}
