import type { ReactNode } from 'react';
import Header from './Header';
import SubNav from './SubNav';
import Footer from './Footer';

interface LayoutProps {
    children: ReactNode;
    lastUpdated?: string;
    onRunAnalysis?: () => void;
}

export default function Layout({ children, lastUpdated, onRunAnalysis }: LayoutProps) {
    return (
        <div className="relative flex min-h-screen flex-col bg-[#0a0a0f] text-slate-200 font-display">
            <Header lastUpdated={lastUpdated} onRunAnalysis={onRunAnalysis} />
            <SubNav />
            <main className="flex-1 w-full max-w-[1440px] mx-auto p-6 space-y-6">
                {children}
            </main>
            <Footer />
        </div>
    );
}
