export default function Footer() {
    return (
        <footer className="border-t border-[#1e1e2d] mt-auto bg-[#12121a] py-6">
            <div className="max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                    <span>© 2024 Meridian Systems Inc.</span>
                    <span className="hidden md:inline text-[#1e1e2d]">|</span>
                    <a className="hover:text-[#6764f2] transition-colors" href="#">Privacy Policy</a>
                    <a className="hover:text-[#6764f2] transition-colors" href="#">Terms of Service</a>
                </div>
                <div className="font-mono flex items-center gap-4">
                    <span>v4.2.0-stable</span>
                    <span>Latency: 24ms</span>
                    <div className="flex items-center gap-1">
                        <div className="size-2 rounded-full bg-[#22c55e]" />
                        <span className="text-[#22c55e]">Connected</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
