import { hexFromScore } from './RiskBadge';

interface RiskBarProps {
    score100: number;
    className?: string;
}

export default function RiskBar({ score100, className = '' }: RiskBarProps) {
    const color = hexFromScore(score100);
    return (
        <div className={`w-full h-2 bg-[#1e1e2d] rounded-full overflow-hidden ${className}`}>
            <div
                className="risk-bar-fill h-full rounded-full"
                style={{ width: `${Math.min(100, score100)}%`, background: color }}
            />
        </div>
    );
}
