import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { API_CONFIG } from '@/config';
import type { ReportData, CompanyMap } from '@/types';

export type View = 'pl' | 'bs' | 'ingresos' | 'costo' | 'gasto_venta' | 'gasto_admin' | 'dya' | 'resultado_financiero';

interface ReportState {
    companies: CompanyMap;
    companiesError: string | null;
    selectedCompany: string;
    selectedYear: number;
    reportData: ReportData | null;
    currentView: View;
    isLoading: boolean;
    error: string | null;
    isExporting: boolean;
}

type ReportAction =
    | { type: 'SET_COMPANIES'; companies: CompanyMap; defaultCompany: string }
    | { type: 'SET_COMPANIES_ERROR'; error: string }
    | { type: 'SET_COMPANY'; company: string }
    | { type: 'SET_YEAR'; year: number }
    | { type: 'SET_VIEW'; view: View }
    | { type: 'LOAD_START' }
    | { type: 'LOAD_SUCCESS'; data: ReportData }
    | { type: 'LOAD_ERROR'; error: string }
    | { type: 'EXPORT_START' }
    | { type: 'EXPORT_SUCCESS' }
    | { type: 'EXPORT_ERROR'; error: string };

const initialState: ReportState = {
    companies: {},
    companiesError: null,
    selectedCompany: '',
    selectedYear: new Date().getFullYear(),
    reportData: null,
    currentView: 'pl',
    isLoading: false,
    error: null,
    isExporting: false,
};

function reportReducer(state: ReportState, action: ReportAction): ReportState {
    switch (action.type) {
        case 'SET_COMPANIES':
            return { ...state, companies: action.companies, selectedCompany: action.defaultCompany };
        case 'SET_COMPANIES_ERROR':
            return { ...state, companiesError: action.error };
        case 'SET_COMPANY':
            return { ...state, selectedCompany: action.company };
        case 'SET_YEAR':
            return { ...state, selectedYear: action.year };
        case 'SET_VIEW':
            return { ...state, currentView: action.view };
        case 'LOAD_START':
            return { ...state, isLoading: true, error: null };
        case 'LOAD_SUCCESS':
            return { ...state, isLoading: false, reportData: action.data };
        case 'LOAD_ERROR':
            return { ...state, isLoading: false, error: action.error, reportData: null };
        case 'EXPORT_START':
            return { ...state, isExporting: true, error: null };
        case 'EXPORT_SUCCESS':
            return { ...state, isExporting: false };
        case 'EXPORT_ERROR':
            return { ...state, isExporting: false, error: action.error };
    }
}

interface IReportContext {
    companies: CompanyMap;
    selectedCompany: string;
    setSelectedCompany: (c: string) => void;
    selectedYear: number;
    setSelectedYear: (y: number) => void;
    reportData: ReportData | null;
    currentView: View;
    setCurrentView: (v: View) => void;
    isLoading: boolean;
    error: string | null;
    companiesError: string | null;
    loadData: (force?: boolean) => Promise<void>;
    exportFile: (type: 'excel' | 'pdf' | 'all') => Promise<void>;
    isExporting: boolean;
}

const ReportContext = createContext<IReportContext | null>(null);

export function ReportProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reportReducer, initialState);

    useEffect(() => {
        api.get<CompanyMap>(API_CONFIG.ENDPOINTS.COMPANIES).then(data => {
            const keys = Object.keys(data);
            dispatch({ type: 'SET_COMPANIES', companies: data, defaultCompany: keys[0] ?? '' });
        }).catch((err) => {
            console.error(err);
            dispatch({ type: 'SET_COMPANIES_ERROR', error: 'No se pudieron cargar las empresas. Verifique su conexion.' });
        });
    }, []);

    const loadData = useCallback(async (force = false) => {
        if (!state.selectedCompany) return;
        dispatch({ type: 'LOAD_START' });
        try {
            const data = await api.post<ReportData>(API_CONFIG.ENDPOINTS.DATA_LOAD, {
                company: state.selectedCompany,
                year: state.selectedYear,
                force_refresh: force,
            });
            dispatch({ type: 'LOAD_SUCCESS', data });
        } catch (err: unknown) {
            dispatch({ type: 'LOAD_ERROR', error: err instanceof Error ? err.message : 'Error al cargar datos' });
        }
    }, [state.selectedCompany, state.selectedYear]);

    const exportFile = useCallback(async (type: 'excel' | 'pdf' | 'all') => {
        if (!state.selectedCompany) return;
        dispatch({ type: 'EXPORT_START' });

        const endpointMap = {
            excel: API_CONFIG.ENDPOINTS.EXPORT_EXCEL,
            pdf: API_CONFIG.ENDPOINTS.EXPORT_PDF,
            all: API_CONFIG.ENDPOINTS.EXPORT_ALL,
        };

        try {
            const result = await api.post<Record<string, string>>(endpointMap[type], {
                company: state.selectedCompany,
                year: state.selectedYear,
            });

            for (const [key, filename] of Object.entries(result)) {
                if (typeof filename !== 'string' || !filename.trim()) {
                    console.warn(`Skipping invalid export filename for key "${key}"`);
                    continue;
                }
                if (filename.includes('/') || filename.includes('\\')) {
                    console.warn(`Skipping suspicious filename: ${filename}`);
                    continue;
                }
                const url = `${API_CONFIG.ENDPOINTS.EXPORT_DOWNLOAD}/${encodeURIComponent(filename)}`;
                window.open(url, '_blank');
            }
            dispatch({ type: 'EXPORT_SUCCESS' });
        } catch (err: unknown) {
            dispatch({ type: 'EXPORT_ERROR', error: err instanceof Error ? err.message : 'Error al exportar' });
        }
    }, [state.selectedCompany, state.selectedYear]);

    return (
        <ReportContext.Provider value={{
            companies: state.companies,
            selectedCompany: state.selectedCompany,
            setSelectedCompany: (c) => dispatch({ type: 'SET_COMPANY', company: c }),
            selectedYear: state.selectedYear,
            setSelectedYear: (y) => dispatch({ type: 'SET_YEAR', year: y }),
            reportData: state.reportData,
            currentView: state.currentView,
            setCurrentView: (v) => dispatch({ type: 'SET_VIEW', view: v }),
            isLoading: state.isLoading,
            error: state.error,
            companiesError: state.companiesError,
            loadData, exportFile,
            isExporting: state.isExporting,
        }}>
            {children}
        </ReportContext.Provider>
    );
}

export const useReport = (): IReportContext => {
    const context = useContext(ReportContext);
    if (!context) {
        throw new Error('useReport must be used within a ReportProvider');
    }
    return context;
};
