import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface Session {
    email: string;
    name: string;
    loggedIn: boolean;
}

interface AuthContextType {
    session: Session | null;
    login: (email: string, name: string) => void;
    logout: () => void;
    isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'meridian_session';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(() => {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        } catch {
            return null;
        }
    });

    function login(email: string, name: string) {
        const s: Session = { email, name, loggedIn: true };
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        setSession(s);
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
    }

    return (
        <AuthContext.Provider value={{ session, login, logout, isLoggedIn: !!session?.loggedIn }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
