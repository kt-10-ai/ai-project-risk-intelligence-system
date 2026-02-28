import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MeridianLogo from '../components/MeridianLogo';

const STAGES = [
    { at: 0, label: 'Creating Account' },
    { at: 20, label: 'Provisioning Workspace' },
    { at: 45, label: 'Initializing Agents' },
    { at: 70, label: 'Securing Connection' },
    { at: 90, label: 'Almost Ready' },
];

export default function SignupPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusLabel, setStatusLabel] = useState('Creating Account');

    const CIRC = 2 * Math.PI * 68;

    function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!name || !email || !password) { setError('All fields are required.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        localStorage.setItem('meridian_user', JSON.stringify({ email, password, name }));

        setLoading(true);
        let pct = 0;
        const interval = setInterval(() => {
            const step = pct < 30 ? 2 : pct < 75 ? 1 : pct < 95 ? 1.5 : 0.8;
            pct = Math.min(100, pct + step);
            setProgress(pct);
            for (let i = STAGES.length - 1; i >= 0; i--) {
                if (pct >= STAGES[i].at) { setStatusLabel(STAGES[i].label); break; }
            }
            if (pct >= 100) {
                clearInterval(interval);
                setStatusLabel('Ready ✓');
                setTimeout(() => { login(email, name); navigate('/init'); }, 900);
            }
        }, 30);
    }

    return (
        <div className="bg-[#0a0a0f] min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6764f2]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative group/card">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#6764f2]/30 to-purple-600/30 rounded-xl blur opacity-25 group-hover/card:opacity-50 transition duration-1000" />
                <div className="relative bg-[#12121a] border border-[#1e1e2d] rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-8 pb-6">
                        <div className="flex flex-col items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-[#6764f2] rounded-lg flex items-center justify-center shadow-lg shadow-[#6764f2]/20">
                                <MeridianLogo className="size-7 text-white" />
                            </div>
                            <div className="text-center">
                                <h1 className="text-white text-2xl font-bold tracking-tight mb-1">MERIDIAN</h1>
                                <p className="text-slate-400 text-sm font-medium tracking-wide">PROJECT RISK INTELLIGENCE</p>
                            </div>
                        </div>
                        <div className="text-center mb-8">
                            <h2 className="text-slate-200 text-lg font-semibold">Create your account</h2>
                            <p className="text-slate-500 text-sm mt-1">Start monitoring project risk in minutes.</p>
                        </div>

                        <form className="space-y-5" onSubmit={handleSignup}>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300" htmlFor="name">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">person</span>
                                    </div>
                                    <input id="name" type="text" required value={name} onChange={e => setName(e.target.value)}
                                        placeholder="Jane Doe"
                                        className="block w-full rounded-lg border border-[#1e1e2d] bg-[#1c1c27] text-white focus:border-[#6764f2] focus:ring-1 focus:ring-[#6764f2] pl-10 py-3 text-sm placeholder:text-slate-600 outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300" htmlFor="email">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">mail</span>
                                    </div>
                                    <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="block w-full rounded-lg border border-[#1e1e2d] bg-[#1c1c27] text-white focus:border-[#6764f2] focus:ring-1 focus:ring-[#6764f2] pl-10 py-3 text-sm placeholder:text-slate-600 outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300" htmlFor="password">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">lock</span>
                                    </div>
                                    <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        className="block w-full rounded-lg border border-[#1e1e2d] bg-[#1c1c27] text-white focus:border-[#6764f2] focus:ring-1 focus:ring-[#6764f2] pl-10 py-3 text-sm placeholder:text-slate-600 outline-none font-mono tracking-widest" />
                                </div>
                            </div>
                            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                            <button type="submit"
                                className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-bold text-white bg-[#6764f2] hover:bg-[#5451e0] transition-all mt-6 shadow-lg shadow-[#6764f2]/20">
                                Create Account
                            </button>
                        </form>
                    </div>
                    <div className="bg-[#0f0f1a] px-8 py-4 border-t border-[#1e1e2d] flex justify-center">
                        <p className="text-sm text-slate-500">
                            Already have an account?{' '}
                            <Link className="font-medium text-[#6764f2] hover:text-[#6764f2]/80 transition-colors" to="/login">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Loading overlay */}
            {loading && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8"
                    style={{ background: 'radial-gradient(ellipse at 50% 40%, #0d0d18 0%, #06060f 100%)' }}>
                    <div className="absolute top-1/5 left-[30%] w-96 h-96 bg-[#6764f2]/12 rounded-full blur-[80px] pointer-events-none" />
                    <div className="w-10 h-10 bg-[#6764f2] rounded-xl flex items-center justify-center shadow-[0_0_24px_rgba(103,100,242,0.5)]">
                        <span className="text-white text-xl font-bold">M</span>
                    </div>
                    <div className="relative w-40 h-40">
                        <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="80" cy="80" r="68" fill="none" stroke="#1e1e2d" strokeWidth="8" />
                            <circle cx="80" cy="80" r="68" fill="none" stroke="url(#arcGrad)" strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={CIRC}
                                strokeDashoffset={CIRC * (1 - progress / 100)}
                                style={{ transition: 'stroke-dashoffset 0.15s linear' }} />
                            <defs>
                                <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#818cf8" />
                                    <stop offset="100%" stopColor="#6764f2" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-white text-4xl font-bold">{Math.floor(progress)}%</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-[#a5b4fc] text-sm font-medium tracking-widest uppercase">{statusLabel}</p>
                        <div className="flex justify-center gap-1 mt-2">
                            {[0, 0.2, 0.4].map((d, i) => (
                                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#6764f2]"
                                    style={{ animation: `dotPulse 1.4s ${d}s infinite` }} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
