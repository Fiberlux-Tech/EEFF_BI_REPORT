import { useState } from 'react';
import { UI_LABELS } from '@/config';

interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await onLogin(username, password);
        } catch (err: any) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
                    {UI_LABELS.WELCOME_BACK}
                </h2>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="username">
                            {UI_LABELS.USUARIO}
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                            {UI_LABELS.CONTRASENA}
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:bg-gray-400"
                    >
                        {isLoading ? UI_LABELS.PROCESSING : UI_LABELS.LOGIN}
                    </button>
                </form>
            </div>
        </div>
    );
}
