import { useState, useMemo } from 'react';
import type { ReportRow, DisplayColumn } from '@/types';
import { formatNumber } from '@/utils/format';
import { getCellValue } from '@/utils/cellValue';

// ── Canonical P&L partida ordering ──────────────────────────────────

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

// ── Filter definitions ──────────────────────────────────────────────

type PlanillaFilter = 'all' | 'variable' | 'fija';

const VARIABLE_CUENTA = '62.1.2.1.01';

const FILTER_OPTIONS: { value: PlanillaFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'variable', label: 'Planilla Variable' },
    { value: 'fija', label: 'Planilla Fija' },
];

const TOTAL_LABELS: Record<PlanillaFilter, string> = {
    all: 'Total Planilla',
    variable: 'Total Planilla Variable',
    fija: 'Total Planilla Fija',
};

// ── Types ───────────────────────────────────────────────────────────

interface PlanillaCuenta {
    row: ReportRow;
}

interface PlanillaCeco {
    code: string;
    desc: string;
    totals: Record<string, number>;
    cuentas: PlanillaCuenta[];
}

interface PlanillaPartida {
    name: string;
    totals: Record<string, number>;
    cecos: PlanillaCeco[];
}

// ── Grouping logic ──────────────────────────────────────────────────

function buildHierarchy(rows: ReportRow[], columns: DisplayColumn[]): { partidas: PlanillaPartida[]; grandTotal: Record<string, number> } {
    const monthKeys = new Set<string>();
    for (const col of columns) {
        for (const m of col.sourceMonths) monthKeys.add(m);
    }

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

    const sumMonths = (rows: ReportRow[]): Record<string, number> => {
        const sums: Record<string, number> = {};
        for (const row of rows) {
            for (const m of monthKeys) {
                sums[m] = (sums[m] ?? 0) + ((row[m] as number) ?? 0);
            }
            sums['TOTAL'] = (sums['TOTAL'] ?? 0) + ((row['TOTAL'] as number) ?? 0);
        }
        return sums;
    };

    const partidas: PlanillaPartida[] = [];
    const grandTotalRows: ReportRow[] = [];

    for (const [partidaName, cecoMap] of partidaMap) {
        const cecos: PlanillaCeco[] = [];
        const allPartidaRows: ReportRow[] = [];

        for (const [cecoCode, { desc, rows: cecoRows }] of cecoMap) {
            cecos.push({
                code: cecoCode,
                desc,
                totals: sumMonths(cecoRows),
                cuentas: cecoRows.map(r => ({ row: r })),
            });
            allPartidaRows.push(...cecoRows);
        }

        cecos.sort((a, b) => a.code.localeCompare(b.code));

        partidas.push({
            name: partidaName,
            totals: sumMonths(allPartidaRows),
            cecos,
        });

        grandTotalRows.push(...allPartidaRows);
    }

    const fallback = PARTIDA_PL_ORDER.length;
    partidas.sort((a, b) =>
        (PARTIDA_ORDER_INDEX.get(a.name) ?? fallback) - (PARTIDA_ORDER_INDEX.get(b.name) ?? fallback)
    );

    return { partidas, grandTotal: sumMonths(grandTotalRows) };
}

// ── Small helpers ───────────────────────────────────────────────────

function negClass(val: number | null | undefined): string {
    if (val === null || val === undefined || val === 0) return '';
    return val < 0 ? 'rpt-neg' : '';
}

function formatEmpty(val: number | null | undefined): string {
    if (val === null || val === undefined) return '';
    if (val === 0) return '';
    return formatNumber(val);
}

// ── Percentage helpers ──────────────────────────────────────────────

function pctValue(costVal: number | null, revenueVal: number | null): number | null {
    if (costVal === null || costVal === undefined) return null;
    if (revenueVal === null || revenueVal === undefined || revenueVal === 0) return null;
    return (costVal / revenueVal) * 100;
}

function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    if (value === 0) return '';
    return value.toFixed(1) + '%';
}

// ── Cell renderers ──────────────────────────────────────────────────

function NumCells({ row, columns }: { row: Record<string, number> | ReportRow; columns: DisplayColumn[] }) {
    return (
        <>
            {columns.map(col => {
                const val = getCellValue(row as ReportRow, col);
                return (
                    <td key={col.header} className={negClass(val)}>
                        {formatEmpty(val)}
                    </td>
                );
            })}
        </>
    );
}

function TotalCell({ val }: { val: number | null }) {
    return <td className={negClass(val)}>{formatEmpty(val)}</td>;
}

function NumCellsPct({ row, revenueRow, columns }: { row: Record<string, number> | ReportRow; revenueRow: ReportRow; columns: DisplayColumn[] }) {
    return (
        <>
            {columns.map(col => {
                const costVal = getCellValue(row as ReportRow, col);
                const revVal = getCellValue(revenueRow, col);
                const pct = pctValue(costVal, revVal);
                return (
                    <td key={col.header} className={pct !== null && pct < 0 ? 'rpt-neg' : ''}>
                        {formatPercent(pct)}
                    </td>
                );
            })}
        </>
    );
}

function TotalCellPct({ costVal, revenueVal }: { costVal: number | null; revenueVal: number | null }) {
    const pct = pctValue(costVal, revenueVal);
    return <td className={pct !== null && pct < 0 ? 'rpt-neg' : ''}>{formatPercent(pct)}</td>;
}

// ── Table header ────────────────────────────────────────────────────

function TableHead({ columns }: { columns: DisplayColumn[] }) {
    return (
        <thead>
            <tr>
                <th>Concepto</th>
                {columns.map(col => (
                    <th key={col.header}>{col.header}</th>
                ))}
                <th className="rpt-col-total">Total</th>
            </tr>
        </thead>
    );
}

// ── Main component ──────────────────────────────────────────────────

interface PlanillaTableProps {
    rows: ReportRow[];
    columns: DisplayColumn[];
    revenueRow: ReportRow | null;
}

export default function PlanillaTable({ rows, columns, revenueRow }: PlanillaTableProps) {
    const [expandedPartidas, setExpandedPartidas] = useState<Set<string>>(new Set());
    const [expandedCecos, setExpandedCecos] = useState<Set<string>>(new Set());
    const [expandedPctPartidas, setExpandedPctPartidas] = useState<Set<string>>(new Set());
    const [planillaFilter, setPlanillaFilter] = useState<PlanillaFilter>('all');

    const filteredRows = useMemo(() => {
        if (planillaFilter === 'all') return rows;
        if (planillaFilter === 'variable')
            return rows.filter(r => String(r['CUENTA_CONTABLE'] ?? '') === VARIABLE_CUENTA);
        return rows.filter(r => String(r['CUENTA_CONTABLE'] ?? '') !== VARIABLE_CUENTA);
    }, [rows, planillaFilter]);

    const { partidas, grandTotal } = useMemo(() => buildHierarchy(filteredRows, columns), [filteredRows, columns]);

    const togglePartida = (name: string) => {
        setExpandedPartidas(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
                setExpandedCecos(prev2 => {
                    const next2 = new Set(prev2);
                    for (const key of next2) if (key.startsWith(name + '|')) next2.delete(key);
                    return next2;
                });
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const toggleCeco = (partida: string, cecoCode: string) => {
        const key = `${partida}|${cecoCode}`;
        setExpandedCecos(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const togglePctPartida = (name: string) => {
        setExpandedPctPartidas(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const revTotal = (revenueRow?.['TOTAL'] as number | null) ?? null;

    return (
        <div>
            {/* ── Filter Tabs ── */}
            <nav className="flex items-baseline gap-10 mb-12">
                <span className="text-[11px] font-semibold uppercase text-txt-muted" style={{ letterSpacing: '1.2px' }}>
                    Tipo
                </span>
                <div className="flex gap-8">
                    {FILTER_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setPlanillaFilter(opt.value)}
                            className={`text-[13px] bg-transparent border-none cursor-pointer pb-1.5 transition-all
                                ${planillaFilter === opt.value
                                    ? 'text-txt font-semibold border-b-[3px] border-b-txt'
                                    : 'text-txt-muted font-normal border-b-2 border-b-transparent hover:text-txt-secondary'
                                }`}
                            style={{ letterSpacing: '0.2px' }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* ═══ TABLE 1: COSTS (includes revenue row at top) ═══ */}
            <table className="rpt-table">
                <TableHead columns={columns} />
                <tbody>
                    {/* Revenue row */}
                    {revenueRow && (
                        <>
                            <tr className="rpt-row-highlight">
                                <td>Ingresos Ordinarios</td>
                                <NumCells row={revenueRow} columns={columns} />
                                <TotalCell val={revenueRow['TOTAL'] as number | null} />
                            </tr>
                            <tr className="rpt-row-spacer"><td colSpan={columns.length + 2}></td></tr>
                        </>
                    )}

                    {/* Cost partidas */}
                    {partidas.map((partida) => {
                        const isExpanded = expandedPartidas.has(partida.name);

                        return (
                            <Fragment key={partida.name}>
                                {/* L0: Partida */}
                                <tr className="rpt-row-l0" onClick={() => togglePartida(partida.name)}>
                                    <td>
                                        <span className="rpt-chevron">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                                        {partida.name}
                                    </td>
                                    <NumCells row={partida.totals as ReportRow} columns={columns} />
                                    <TotalCell val={partida.totals['TOTAL'] ?? null} />
                                </tr>

                                {/* L1: CECOs */}
                                {isExpanded && partida.cecos.map((ceco) => {
                                    const cecoKey = `${partida.name}|${ceco.code}`;
                                    const isCecoExpanded = expandedCecos.has(cecoKey);

                                    return (
                                        <Fragment key={cecoKey}>
                                            <tr className="rpt-row-l1" onClick={() => toggleCeco(partida.name, ceco.code)}>
                                                <td>
                                                    <span className="rpt-chevron">{isCecoExpanded ? '\u25BE' : '\u25B8'}</span>
                                                    {ceco.code} {ceco.desc}
                                                </td>
                                                <NumCells row={ceco.totals as ReportRow} columns={columns} />
                                                <TotalCell val={ceco.totals['TOTAL'] ?? null} />
                                            </tr>

                                            {/* L2: Cuentas */}
                                            {isCecoExpanded && ceco.cuentas.map((cuenta, ci) => (
                                                <tr key={ci} className="rpt-row-l2">
                                                    <td>
                                                        {cuenta.row['CUENTA_CONTABLE']} {cuenta.row['DESCRIPCION']}
                                                    </td>
                                                    <NumCells row={cuenta.row} columns={columns} />
                                                    <TotalCell val={cuenta.row['TOTAL'] as number | null} />
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                            </Fragment>
                        );
                    })}

                    {/* Grand total */}
                    <tr className="rpt-row-total">
                        <td>{TOTAL_LABELS[planillaFilter]}</td>
                        <NumCells row={grandTotal as ReportRow} columns={columns} />
                        <TotalCell val={grandTotal['TOTAL'] ?? null} />
                    </tr>
                </tbody>
            </table>

            {/* ═══ SEPARATOR ═══ */}
            {revenueRow && (
                <>
                    <div className="rpt-separator">
                        <div className="sep-line"></div>
                        <span className="sep-label">% de Ingresos</span>
                        <div className="sep-line"></div>
                    </div>

                    {/* ═══ TABLE 2: PERCENTAGES ═══ */}
                    <table className="rpt-table">
                        <TableHead columns={columns} />
                        <tbody>
                            {partidas.map((partida) => {
                                const isPctExpanded = expandedPctPartidas.has(partida.name);

                                return (
                                    <Fragment key={partida.name}>
                                        <tr className="rpt-row-l0" onClick={() => togglePctPartida(partida.name)}>
                                            <td>
                                                <span className="rpt-chevron">{isPctExpanded ? '\u25BE' : '\u25B8'}</span>
                                                {partida.name}
                                            </td>
                                            <NumCellsPct row={partida.totals as ReportRow} revenueRow={revenueRow} columns={columns} />
                                            <TotalCellPct costVal={partida.totals['TOTAL'] ?? null} revenueVal={revTotal} />
                                        </tr>

                                        {isPctExpanded && partida.cecos.map((ceco) => (
                                            <tr key={`${partida.name}|${ceco.code}`} className="rpt-row-l1">
                                                <td style={{ cursor: 'default' }}>
                                                    {ceco.code} {ceco.desc}
                                                </td>
                                                <NumCellsPct row={ceco.totals as ReportRow} revenueRow={revenueRow} columns={columns} />
                                                <TotalCellPct costVal={ceco.totals['TOTAL'] ?? null} revenueVal={revTotal} />
                                            </tr>
                                        ))}
                                    </Fragment>
                                );
                            })}

                            {/* Pct grand total */}
                            <tr className="rpt-row-total">
                                <td>{TOTAL_LABELS[planillaFilter]}</td>
                                <NumCellsPct row={grandTotal as ReportRow} revenueRow={revenueRow} columns={columns} />
                                <TotalCellPct costVal={grandTotal['TOTAL'] ?? null} revenueVal={revTotal} />
                            </tr>
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}

// React Fragment alias
const Fragment = ({ children }: { children: React.ReactNode }) => <>{children}</>;
