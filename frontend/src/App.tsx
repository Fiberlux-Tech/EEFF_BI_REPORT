import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ReportProvider } from '@/contexts/ReportContext';
import AuthPage from '@/features/auth/AuthPage';
import DashboardShell from '@/features/dashboard/DashboardShell';

function AppContent() {
    const { user, isAuthLoading, login } = useAuth();

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <h1 className="text-2xl text-gray-600">Cargando...</h1>
            </div>
        );
    }

    if (!user) {
        return <AuthPage onLogin={login} />;
    }

    return (
        <ReportProvider>
            <DashboardShell />
        </ReportProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
