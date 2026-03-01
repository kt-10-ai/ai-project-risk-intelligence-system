type Level = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'WARNING' | 'LOW' | 'HEALTHY' | 'STABLE' | 'OPTIMAL';

const STYLES: Record<string, string> = {
    CRITICAL: 'bg-red-500/10 text-red-400 border border-red-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    MODERATE: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    WARNING: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    LOW: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    HEALTHY: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    STABLE: 'bg-slate-700/50 text-slate-300',
    OPTIMAL: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

// eslint-disable-next-line react-refresh/only-export-components
export function levelFromScore(score100: number): Level {
    if (score100 >= 75) return 'CRITICAL';
    if (score100 >= 50) return 'WARNING';
    if (score100 >= 25) return 'MODERATE';
    return 'HEALTHY';
}

// eslint-disable-next-line react-refresh/only-export-components
export function hexFromScore(score100: number): string {
    if (score100 >= 75) return '#ef4444';
    if (score100 >= 50) return '#f59e0b';
    if (score100 >= 25) return '#eab308';
    return '#22c55e';
}

export default function RiskBadge({ level, className = '' }: { level: string; className?: string }) {
    const style = STYLES[level?.toUpperCase()] ?? STYLES.STABLE;
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${style} ${className}`}>
            {level}
        </span>
    );
}
