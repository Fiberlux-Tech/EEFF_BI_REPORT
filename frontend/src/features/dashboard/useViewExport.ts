import { useCallback } from 'react';
import { useReport } from '@/contexts/ReportContext';
import { VIEW_TITLE_MAP, VIEW_TABLE_CONFIGS, ALL_MONTHS, isAllZeroTable, type NoteView } from '@/config/viewConfigs';
import { exportToExcel, type ExportSheet, type SummarySheetDef, type DetailSheetDef, type PlanillaSheetDef, type PlanillaExportRow } from '@/utils/exportExcel';
import type { ReportRow, DisplayColumn } from '@/types';
import { getDataKeyForTable } from '@/utils/dataKeyMapping';

// ── Planilla grouping (mirrors PlanillaTable hierarchy) ─────────────

const PARTIDA_PL_ORDER = [
    'INGRESOS ORDINARIOS', 'INGRESOS PROYECTOS',
    'COSTO', 'D&A - COSTO',
    'GASTO VENTA', 'GASTO ADMIN',
    'PARTICIPACION DE TRABAJADORES', 'D&A - GASTO',
    'PROVISION INCOBRABLE', 'OTROS INGRESOS', 'OTROS EGRESOS',
    'RESULTADO FINANCIERO', 'DIFERENCIA DE CAMBIO',
    'IMPUESTO A LA RENTA', 'POR CLASIFICAR',
];
const PARTIDA_ORDER_INDEX = new Map(PARTIDA_PL_ORDER.map((p, i) => [p, i]));

function buildPlanillaExportRows(rows: ReportRow[], columns: DisplayColumn[]): PlanillaExportRow[] {
    const monthKeys = new Set<string>();
    for (const col of columns) {
        for (const m of col.sourceMonths) monthKeys.add(m);
    }

    const sumMonths = (rws: ReportRow[]): Record<string, number> => {
        const sums: Record<string, number> = {};
        for (const row of rws) {
            for (const m of monthKeys) sums[m] = (sums[m] ?? 0) + ((row[m] as number) ?? 0);
            sums['TOTAL'] = (sums['TOTAL'] ?? 0) + ((row['TOTAL'] as number) ?? 0);
        }
        return sums;
    };

    // Group: partida → ceco → cuentas
    const partidaMap = new Map<string, Map<string, { desc: string; rows: ReportRow[] }>>();
    for (const row of rows) {
        const partida = String(row['PARTIDA_PL'] ?? '');
        const ceco = String(row['CENTRO_COSTO'] ?? '');
        const cecoDesc = String(row['DESC_CECO'] ?? '');
        if (!partida) continue;
        if (!partidaMap.has(partida)) partidaMap.set(partida, new Map());
        const cecoMap = partidaMap.get(partida)!;
        if (!cecoMap.has(ceco)) cecoMap.set(ceco, { desc: cecoDesc, rows: [] });
        cecoMap.get(ceco)!.rows.push(row);
    }

    // Build sorted partidas
    const sortedPartidas = [...partidaMap.entries()].sort((a, b) => {
        const fallback = PARTIDA_PL_ORDER.length;
        return (PARTIDA_ORDER_INDEX.get(a[0]) ?? fallback) - (PARTIDA_ORDER_INDEX.get(b[0]) ?? fallback);
    });

    // Flatten into export rows
    const flat: PlanillaExportRow[] = [];
    for (const [partidaName, cecoMap] of sortedPartidas) {
        const allPartidaRows: ReportRow[] = [];
        const cecoEntries = [...cecoMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

        for (const [, { rows: cecoRows }] of cecoEntries) {
            allPartidaRows.push(...cecoRows);
        }

        // L0: Partida subtotal
        flat.push({ label: partidaName, level: 0, values: sumMonths(allPartidaRows) });

        // L1: CECO subtotals + L2: Cuenta details
        for (const [cecoCode, { desc, rows: cecoRows }] of cecoEntries) {
            flat.push({ label: `${cecoCode} ${desc}`, level: 1, values: sumMonths(cecoRows) });
            for (const row of cecoRows) {
                const cuenta = String(row['CUENTA_CONTABLE'] ?? '');
                const descripcion = String(row['DESCRIPCION'] ?? '');
                const vals: Record<string, number> = {};
                for (const m of monthKeys) vals[m] = (row[m] as number) ?? 0;
                vals['TOTAL'] = (row['TOTAL'] as number) ?? 0;
                flat.push({ label: `${cuenta} ${descripcion}`, level: 2, values: vals });
            }
        }
    }

    return flat;
}

export function useViewExport(): { handleExport: () => void; canExport: boolean } {
    const {
        currentView, reportData, selectedCompany, selectedYear,
        getDisplayColumns, getMergedRows, getMergedDetailRows,
        periodRange, isLoading,
    } = useReport();

    const canExport = !!reportData && !isLoading;

    const handleExport = useCallback(() => {
        if (!reportData) return;

        const sheets: ExportSheet[] = [];
        const viewTitle = VIEW_TITLE_MAP[currentView] ?? currentView;

        if (currentView === 'pl') {
            const rows = getMergedRows('pl_summary', 'PARTIDA_PL', 'pl');
            const sheet: SummarySheetDef = {
                kind: 'summary',
                sheetName: viewTitle,
                rows,
                columns: getDisplayColumns('pl'),
                labelKey: 'PARTIDA_PL',
                showTotal: true,
                variant: 'pl',
            };
            sheets.push(sheet);
        } else if (currentView === 'bs') {
            const rows = getMergedRows('bs_summary', 'PARTIDA_BS', 'bs');
            const sheet: SummarySheetDef = {
                kind: 'summary',
                sheetName: viewTitle,
                rows,
                columns: getDisplayColumns('bs'),
                labelKey: 'PARTIDA_BS',
                showTotal: false,
                variant: 'bs',
            };
            sheets.push(sheet);
        } else if (currentView === 'analysis_planilla') {
            const planillaKeys = ['PARTIDA_PL', 'CENTRO_COSTO', 'DESC_CECO', 'CUENTA_CONTABLE', 'DESCRIPCION'];
            const planillaRows = getMergedDetailRows('planilla_by_cuenta', planillaKeys);
            const cols = getDisplayColumns('pl');
            const flatRows = buildPlanillaExportRows(planillaRows, cols);
            const sheet: PlanillaSheetDef = {
                kind: 'planilla',
                sheetName: viewTitle,
                flatRows,
                columns: cols,
                year: selectedYear,
            };
            sheets.push(sheet);
        } else {
            // Note views
            const noteConfig = VIEW_TABLE_CONFIGS[currentView as NoteView];
            if (noteConfig) {
                let tables = noteConfig.tables(reportData);

                // Apply trailing 12M merge if active
                if (periodRange === 'trailing12') {
                    tables = tables.map(t => {
                        const dataKey = getDataKeyForTable(t, reportData);
                        if (dataKey) {
                            return { ...t, rows: getMergedDetailRows(dataKey, t.labelKeys) };
                        }
                        return t;
                    });
                }

                // Filter out all-zero tables
                tables = tables.filter(t => !isAllZeroTable(t.rows, ALL_MONTHS));

                for (const t of tables) {
                    const sheet: DetailSheetDef = {
                        kind: 'detail',
                        sheetName: t.title,
                        rows: t.rows,
                        columns: getDisplayColumns('pl'),
                        headerLabels: t.headerLabels,
                        labelKeys: t.labelKeys,
                        year: selectedYear,
                    };
                    sheets.push(sheet);
                }
            }
        }

        if (sheets.length === 0) return;

        const safeName = viewTitle.replace(/\s+/g, '_');
        const filename = `${safeName}_${selectedCompany}_${selectedYear}.xlsx`;

        exportToExcel({ sheets, filename });
    }, [
        reportData, currentView, selectedCompany, selectedYear,
        getDisplayColumns, getMergedRows, getMergedDetailRows, periodRange,
    ]);

    return { handleExport, canExport };
}
