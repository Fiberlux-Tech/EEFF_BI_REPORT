import { useReport } from '@/contexts/ReportContext';
import FinancialTable from '@/features/dashboard/FinancialTable';
import PLNoteView from '@/features/dashboard/PLNoteView';
import type { ReportData, TableConfig } from '@/types';

type NoteView = 'ingresos' | 'costo' | 'gasto_venta' | 'gasto_admin' | 'dya' | 'resultado_financiero';

const VIEW_TITLE_MAP: Record<string, string> = {
    pl: 'Estado de Resultados',
    bs: 'Balance General',
    ingresos: 'Ingresos',
    costo: 'Costo de Operaciones',
    gasto_venta: 'Gastos de Ventas',
    gasto_admin: 'Gastos de Administracion',
    dya: 'Depreciacion y Amortizacion',
    resultado_financiero: 'Resultado Financiero',
};

const VIEW_TABLE_CONFIGS: Record<NoteView, (d: ReportData) => TableConfig[]> = {
    ingresos: (d) => [
        { title: 'Ingresos Ordinarios', rows: d.ingresos_ordinarios, labelKeys: ['CUENTA_CONTABLE', 'DESCRIPCION'], headerLabels: ['Cuenta', 'Descripcion'], partida: 'INGRESOS ORDINARIOS', filterCol: 'CUENTA_CONTABLE' },
        { title: 'Ingresos de Proyectos', rows: d.ingresos_proyectos, labelKeys: ['NIT', 'RAZON_SOCIAL'], headerLabels: ['NIT', 'Razon Social'], partida: 'INGRESOS PROYECTOS', filterCol: 'NIT' },
    ],
    costo: (d) => [
        { title: 'Costo de Operaciones', rows: d.costo, labelKeys: ['CENTRO_COSTO', 'DESC_CECO'], headerLabels: ['CC', 'Centro de Costo'], partida: 'COSTO', filterCol: 'CENTRO_COSTO' },
    ],
    gasto_venta: (d) => [
        { title: 'Gastos de Ventas', rows: d.gasto_venta, labelKeys: ['CENTRO_COSTO', 'DESC_CECO'], headerLabels: ['CC', 'Centro de Costo'], partida: 'GASTO VENTA', filterCol: 'CENTRO_COSTO' },
    ],
    gasto_admin: (d) => [
        { title: 'Gastos de Administracion', rows: d.gasto_admin, labelKeys: ['CENTRO_COSTO', 'DESC_CECO'], headerLabels: ['CC', 'Centro de Costo'], partida: 'GASTO ADMIN', filterCol: 'CENTRO_COSTO' },
    ],
    dya: (d) => [
        { title: 'Depreciacion y Amortizacion (Costo)', rows: d.dya_costo, labelKeys: ['CENTRO_COSTO', 'DESC_CECO'], headerLabels: ['CC', 'Centro de Costo'], partida: 'D&A - COSTO', filterCol: 'CENTRO_COSTO' },
        { title: 'Depreciacion y Amortizacion (Gasto)', rows: d.dya_gasto, labelKeys: ['CENTRO_COSTO', 'DESC_CECO'], headerLabels: ['CC', 'Centro de Costo'], partida: 'D&A - GASTO', filterCol: 'CENTRO_COSTO' },
    ],
    resultado_financiero: (d) => [
        { title: 'Ingresos Financieros', rows: d.resultado_financiero_ingresos, labelKeys: ['CUENTA_CONTABLE', 'DESCRIPCION'], headerLabels: ['Cuenta', 'Descripcion'], partida: 'RESULTADO FINANCIERO', filterCol: 'CUENTA_CONTABLE' },
        { title: 'Gastos Financieros', rows: d.resultado_financiero_gastos, labelKeys: ['CUENTA_CONTABLE', 'DESCRIPCION'], headerLabels: ['Cuenta', 'Descripcion'], partida: 'RESULTADO FINANCIERO', filterCol: 'CUENTA_CONTABLE' },
    ],
};

export default function MainContent() {
    const { reportData, currentView, isLoading, error, companies, selectedCompany } = useReport();

    const companyName = selectedCompany && companies[selectedCompany]
        ? companies[selectedCompany].legal_name
        : selectedCompany;

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Cargando datos...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
                    <p className="font-medium">Error</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg">Seleccione empresa y ano</p>
                    <p className="text-sm mt-1">Luego presione "Cargar Datos"</p>
                </div>
            </div>
        );
    }

    const title = VIEW_TITLE_MAP[currentView] ?? currentView;

    const renderView = () => {
        const configFactory = VIEW_TABLE_CONFIGS[currentView as NoteView];
        if (configFactory) {
            return <PLNoteView tables={configFactory(reportData)} months={reportData.months} year={reportData.year} />;
        }
        if (currentView === 'pl' || currentView === 'bs') {
            return (
                <FinancialTable
                    rows={currentView === 'pl' ? reportData.pl_summary : reportData.bs_summary}
                    months={reportData.months}
                    labelKey={currentView === 'pl' ? 'PARTIDA_PL' : 'PARTIDA_BS'}
                    showTotal={currentView === 'pl'}
                    variant={currentView}
                />
            );
        }
        return null;
    };

    return (
        <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-[1400px] mx-auto">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <p className="text-sm text-gray-500">
                        {companyName} — {reportData.year}
                    </p>
                </div>
                {renderView()}
            </div>
        </main>
    );
}
