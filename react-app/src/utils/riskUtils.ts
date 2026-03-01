// Shared risk score utility functions, extracted to avoid fast-refresh violations.

export type Level = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'WARNING' | 'LOW' | 'HEALTHY' | 'STABLE' | 'OPTIMAL';

export function levelFromScore(score100: number): Level {
    if (score100 >= 75) return 'CRITICAL';
    if (score100 >= 50) return 'WARNING';
    if (score100 >= 25) return 'MODERATE';
    return 'HEALTHY';
}

export function hexFromScore(score100: number): string {
    if (score100 >= 75) return '#ef4444';
    if (score100 >= 50) return '#f59e0b';
    if (score100 >= 25) return '#eab308';
    return '#22c55e';
}
