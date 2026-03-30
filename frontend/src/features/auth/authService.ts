import { api } from '@/lib/api';
import type { User } from '@/types';

export interface AuthSuccessData extends User {}

type AuthResult = {
    success: true;
    data: AuthSuccessData;
} | {
    success: false;
    error: string;
}

type LogoutResult = {
    success: true;
} | {
    success: false;
    error: string;
}

export type AuthStatus = {
    is_authenticated: true;
    user: User;
} | {
    is_authenticated: false;
    error: string;
}

export async function loginUser(username: string, password: string): Promise<AuthResult> {
    try {
        const data = await api.post<AuthSuccessData>('/auth/login', { username, password });
        return { success: true, data };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Login failed.';
        return { success: false, error: message };
    }
}

export async function logoutUser(): Promise<LogoutResult> {
    try {
        await api.post<unknown>('/auth/logout', {});
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Logout failed.';
        return { success: false, error: message };
    }
}

export async function checkAuthStatus(): Promise<AuthStatus> {
    try {
        const data = await api.get<{ is_authenticated: boolean; user: User }>('/auth/me');
        if (data?.is_authenticated) {
            return { is_authenticated: true, user: data.user };
        }
        return { is_authenticated: false, error: 'Not authenticated' };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to check authentication status.';
        return { is_authenticated: false, error: message };
    }
}
