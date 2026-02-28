import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MeridianLogo from './MeridianLogo';

interface HeaderProps {
    lastUpdated?: string;
    onRunAnalysis?: () => void;
}

export default function Header({ lastUpdated, onRunAnalysis }: HeaderProps) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    function handleSignOut() {
        logout();
        navigate('/login');
    }

    return (
        <header className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-[#1e1e2d] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <Link to="/dashboard" className="flex items-center gap-3 group text-[#6764f2]">
                    <MeridianLogo className="size-8 transition-transform group-hover:scale-110" />
                    <h1 className="text-white text-xl font-bold tracking-tight hover:text-[#6764f2] transition-colors">
                        Meridian
                    </h1>
                </Link>
                <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20">
                    <div className="size-2 rounded-full bg-[#22c55e] animate-pulse" />
                    <span className="text-xs font-mono font-bold text-[#22c55e] tracking-wide">SYSTEM ACTIVE</span>
                </div>
                {lastUpdated && (
                    <div className="hidden lg:block text-xs font-mono text-slate-400">
                        LAST UPDATE: <span className="text-white">{lastUpdated}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4">
                {onRunAnalysis && (
                    <button
                        onClick={onRunAnalysis}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6764f2] hover:bg-[#5451e0] transition-colors text-white text-sm font-bold rounded-lg shadow-lg shadow-[#6764f2]/20"
                    >
                        <span className="material-symbols-outlined text-[20px]">bolt</span>
                        RUN ANALYSIS
                    </button>
                )}
                <button
                    onClick={handleSignOut}
                    className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
                >
                    SIGN OUT
                </button>
                <div className="size-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-[#1e1e2d] overflow-hidden">
                    <img
                        alt="User"
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAR3e5Ham_pvPFGH9rT-Z0jAgCuzdX0ExhEE56lUwbo4RM9oialiNZMG33uj2956D3SntG0uG7bUzWcz1lSgyE4oYnnImZ5GMxZoZb2oA08aZKDcRVew7j6Z31cJ7caEVqanSDmXZWDU2H_yPz-ymLM0sW65RQhmGaJIBOcaqlONrJ2u7sQFqEzqWqa4QTTZUB293iO7mqkIBbc7ytgVFngEyzJ0NsDjlfAexZorC_mK1zsWjofurIHdbECjN5KrvxDtYvBC4u7oLQ"
                    />
                </div>
            </div>
        </header>
    );
}
