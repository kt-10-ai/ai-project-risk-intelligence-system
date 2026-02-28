import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
    { to: '/report', label: 'VIEW FULL REPORT', icon: 'arrow_forward' },
    { to: '/signals', label: 'SIGNAL INSPECTOR', icon: 'arrow_forward' },
    { to: '/agents', label: 'AGENT HUB', icon: 'hub' },
    { to: '/simulation', label: 'ADVANCED SIMULATOR', icon: 'arrow_forward' },
];

export default function SubNav() {
    return (
        <nav className="bg-[#12121a] border-b border-[#1e1e2d] px-6 py-3">
            <div className="max-w-[1440px] mx-auto flex items-center gap-4 flex-wrap">
                {NAV_ITEMS.map(({ to, label, icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold transition-all group ${isActive
                                ? 'bg-[#6764f2]/20 border-[#6764f2]/50 text-[#6764f2]'
                                : 'bg-[#1e1e2d]/50 border-[#1e1e2d] text-white hover:bg-[#6764f2]/20 hover:border-[#6764f2]/50'
                            }`
                        }
                    >
                        {label}
                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                            {icon}
                        </span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
