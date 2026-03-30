import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, loginUser, logoutUser } from '@/features/auth/authService';
import type { User } from '@/types';

interface IAuthContext {
    user: User | null;
    isAuthLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<IAuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        checkAuthStatus().then(data => {
            if (data.is_authenticated) {
                setUser(data.user);
            }
        }).catch(err => {
            console.error('Failed to fetch user', err);
            setUser(null);
        }).finally(() => {
            setIsAuthLoading(false);
        });
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const result = await loginUser(username, password);
        if (result.success) {
            setUser(result.data);
        } else {
            throw new Error(result.error);
        }
    }, []);

    const logout = useCallback(async () => {
        await logoutUser();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = (): IAuthContext => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
