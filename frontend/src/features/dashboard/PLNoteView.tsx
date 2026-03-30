import { useReducer, useRef, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { API_CONFIG } from '@/config';
import { useReport } from '@/contexts/ReportContext';
import type { ReportRow, CellSelection, TableConfig } from '@/types';
import { formatNumber } from '@/utils/format';
import DetailTable from './DetailTable';

const DETAIL_HEADERS: Record<string, string> = {
    ASIENTO: 'Asiento',
    CUENTA_CONTABLE: 'Cuenta',
    DESCRIPCION: 'Descripcion',
    NIT: 'NIT',
    RAZON_SOCIAL: 'Razon Social',
    CENTRO_COSTO: 'Centro Costo',
    DESC_CECO: 'Desc. CECO',
    FECHA: 'Fecha',
    SALDO: 'Saldo',
};

const DETAIL_COLS = Object.keys(DETAIL_HEADERS);
const PAGE_SIZES: number[] = [25, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

interface DetailDataTableProps {
    detailRows: ReportRow[];
    filteredRows: ReportRow[];
    filters: Record<string, string>;
    updateFilter: (col: string, value: string) => void;
    page: number;
    setPage: (fn: (p: number) => number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
}

function DetailDataTable({ detailRows, filteredRows, filters, updateFilter, page, setPage, pageSize, setPageSize }: DetailDataTableProps) {
    const totalPages = Math.ceil(filteredRows.length / pageSize);
    const start = page * pageSize;
    const pageRows = filteredRows.slice(start, start + pageSize);
    const hasFilters = Object.values(filters).some(v => v.length > 0);

    return (
        <>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-xs">
                    <thead>
                        <tr className="bg-gray-700 text-white">
                            {DETAIL_COLS.map(col => (
                                <th scope="col" key={col} className={`px-3 py-2 font-medium whitespace-nowrap ${col === 'SALDO' ? 'text-right' : 'text-left'}`}>
                                    {DETAIL_HEADERS[col]}
                                </th>
                            ))}
                        </tr>
                        <tr className="bg-gray-100">
                            {DETAIL_COLS.map(col => (
                                <th key={col} className="px-2 py-1">
                                    <input
                                        type="text"
                                        value={filters[col] ?? ''}
                                        onChange={e => updateFilter(col, e.target.value)}
                                        placeholder="Filtrar..."
                                        className={`w-full px-1.5 py-0.5 text-xs font-normal border border-gray-300 rounded
                                            focus:outline-none focus:border-blue-400 bg-white text-gray-700
                                            ${col === 'SALDO' ? 'text-right' : 'text-left'}`}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                                {DETAIL_COLS.map(col => {
                                    const val = row[col];
                                    const isSaldo = col === 'SALDO';
                                    const isNeg = isSaldo && typeof val === 'number' && val < 0;
                                    return (
                                        <td
                                            key={col}
                                            className={`px-3 py-1.5 whitespace-nowrap
                                                ${isSaldo ? 'text-right font-mono' : 'text-left'}
                                                ${isNeg ? 'text-red-600' : 'text-gray-800'}`}
                                        >
                                            {isSaldo ? formatNumber(val as number) : (val ?? '')}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    <span>Filas por pagina:</span>
                    {PAGE_SIZES.map(size => (
                        <button
                            key={size}
                            onClick={() => { setPageSize(size); setPage(() => 0); }}
                            className={`px-2 py-0.5 rounded ${pageSize === size ? 'bg-gray-800 text-white' : 'hover:bg-gray-100'}`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <span>
                        {filteredRows.length === 0 ? '0 registros' :
                            `${start + 1}–${Math.min(start + pageSize, filteredRows.length)} de ${filteredRows.length}`}
                        {hasFilters && ` (${detailRows.length} total)`}
                    </span>
                    <button
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                        className="px-2 py-0.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                        className="px-2 py-0.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </>
    );
}

interface PLNoteViewProps {
    tables: TableConfig[];
    months: string[];
    year: number;
}

interface DetailState {
    selection: CellSelection | null;
    detailRows: ReportRow[];
    isLoadingDetail: boolean;
    detailError: string | null;
    page: number;
    pageSize: number;
    filters: Record<string, string>;
}

type DetailAction =
    | { type: 'SELECT'; selection: CellSelection }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'LOAD_SUCCESS'; rows: ReportRow[] }
    | { type: 'LOAD_ERROR'; error: string }
    | { type: 'SET_PAGE'; page: number }
    | { type: 'SET_PAGE_SIZE'; size: number }
    | { type: 'SET_FILTER'; col: string; value: string };

const detailInitialState: DetailState = {
    selection: null,
    detailRows: [],
    isLoadingDetail: false,
    detailError: null,
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    filters: {},
};

function detailReducer(state: DetailState, action: DetailAction): DetailState {
    switch (action.type) {
        case 'SELECT':
            return { ...detailInitialState, selection: action.selection, isLoadingDetail: true, pageSize: state.pageSize };
        case 'CLEAR_SELECTION':
            return { ...state, selection: null, detailRows: [] };
        case 'LOAD_SUCCESS':
            return { ...state, isLoadingDetail: false, detailRows: action.rows };
        case 'LOAD_ERROR':
            return { ...state, isLoadingDetail: false, detailRows: [], detailError: action.error };
        case 'SET_PAGE':
            return { ...state, page: action.page };
        case 'SET_PAGE_SIZE':
            return { ...state, pageSize: action.size, page: 0 };
        case 'SET_FILTER':
            return { ...state, filters: { ...state.filters, [action.col]: action.value }, page: 0 };
    }
}

export default function PLNoteView({ tables, months, year }: PLNoteViewProps) {
    const { selectedCompany, selectedYear } = useReport();
    const [state, dispatch] = useReducer(detailReducer, detailInitialState);
    const detailRef = useRef<HTMLDivElement>(null);

    const companyRef = useRef(selectedCompany);
    const yearRef = useRef(selectedYear);
    useEffect(() => { companyRef.current = selectedCompany; }, [selectedCompany]);
    useEffect(() => { yearRef.current = selectedYear; }, [selectedYear]);

    const filteredRows = useMemo(() => {
        const activeFilters = Object.entries(state.filters).filter(([, v]) => v.length > 0);
        if (activeFilters.length === 0) return state.detailRows;
        return state.detailRows.filter(row =>
            activeFilters.every(([col, term]) => {
                const val = String(row[col] ?? '').toLowerCase();
                return val.includes(term.toLowerCase());
            })
        );
    }, [state.detailRows, state.filters]);

    const updateFilter = (col: string, value: string) => {
        dispatch({ type: 'SET_FILTER', col, value });
    };

    const handleCellClick = useCallback(async (sel: CellSelection) => {
        dispatch({ type: 'SELECT', selection: sel });

        try {
            const body: Record<string, unknown> = {
                company: companyRef.current,
                year: yearRef.current,
                partida: sel.partida,
            };
            if (sel.month) body.month = sel.month;
            if (sel.filterCol && sel.filterVal != null) {
                body.filter_col = sel.filterCol;
                body.filter_val = sel.filterVal;
            }
            const resp = await api.post<{ records: ReportRow[] }>(API_CONFIG.ENDPOINTS.DATA_DETAIL, body);
            dispatch({ type: 'LOAD_SUCCESS', rows: resp.records });
        } catch (err) {
            dispatch({ type: 'LOAD_ERROR', error: err instanceof Error ? err.message : 'Error al cargar detalle' });
        }
    }, []);

    useEffect(() => {
        if (state.selection && detailRef.current) {
            detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [state.selection, state.detailRows]);

    const renderDetailContent = () => {
        if (state.isLoadingDetail) {
            return (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-sm text-gray-500">Cargando detalle...</span>
                </div>
            );
        }
        if (state.detailError) {
            return <div className="text-center py-6 text-sm text-red-500">{state.detailError}</div>;
        }
        if (state.detailRows.length === 0) {
            return <div className="text-center py-6 text-sm text-gray-400">Sin registros</div>;
        }
        return (
            <DetailDataTable
                detailRows={state.detailRows}
                filteredRows={filteredRows}
                filters={state.filters}
                updateFilter={updateFilter}
                page={state.page}
                setPage={(fn) => dispatch({ type: 'SET_PAGE', page: fn(state.page) })}
                pageSize={state.pageSize}
                setPageSize={(size) => dispatch({ type: 'SET_PAGE_SIZE', size })}
            />
        );
    };

    return (
        <div className="space-y-8">
            {tables.map((table, idx) => (
                <DetailTable
                    key={idx}
                    {...table}
                    months={months}
                    year={year}
                    selection={state.selection}
                    onCellClick={handleCellClick}
                />
            ))}

            {state.selection && (
                <div ref={detailRef}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-gray-700">
                            Detalle: {state.selection.label}
                        </h3>
                        <button
                            onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
                            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                        >
                            Cerrar
                        </button>
                    </div>
                    {renderDetailContent()}
                </div>
            )}
        </div>
    );
}
