import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-slate-50">
                    <div className="bg-white p-8 rounded-lg shadow max-w-md text-center">
                        <h1 className="text-xl font-bold text-red-600 mb-2">
                            Error inesperado
                        </h1>
                        <p className="text-slate-600 mb-4">
                            {this.state.error?.message || 'Ocurrio un error.'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Recargar pagina
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
