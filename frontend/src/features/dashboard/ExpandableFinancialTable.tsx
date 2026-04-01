import { useState, useMemo } from 'react';
import type { ReportRow, DisplayColumn } from '@/types';
import { formatNumber } from '@/utils/format';
import { getCellValue, getSummaryTotal, BOLD_ROWS_PL } from '@/utils/cellValue';

// ── CECO grouping definitions (COSTO only) ──────────────────────────

interface CecoGroupDef {
    label: string;
    codes: string[];
}

const CECO_GROUPS: CecoGroupDef[] = [
    { label: 'NOC', codes: ['100.101.01', '100.101.02'] },
    { label: 'PLANTA EXTERNA', codes: [
        '100.102.01', '100.102.02', '100.102.03', '100.102.04',
        '100.102.06', '100.102.07', '100.102.08', '100.102.09',
        '100.102.10', '100.102.13', '100.102.14', '100.102.15',
    ]},
    { label: 'COSTO INTERNET', codes: ['100.112.01'] },
    { label: 'COSTO TRANSPORTE', codes: ['100.113.01'] },
    { label: 'COSTO FIBRA OSCURA', codes: ['100.114'] },
    { label: 'COSTO CONTRATAS', codes: ['100.115.01'] },
    { label: 'CONSUMO ACCESORIOS Y EQUIPOS', codes: ['100.116.01'] },
    { label: 'COSTO INTERCOMPANY', codes: ['100.121.01', '100.121.02'] },
];

const OTROS_LABEL = 'OTROS';

function getGroupLabel(ccCode: string): string {
    for (const group of CECO_GROUPS) {
        for (const code of group.codes) {
            if (ccCode === code || ccCode.startsWith(code + '.')) return group.label;
        }
    }
    return OTROS_LABEL;
}

// ── CUENTA_CONTABLE grouping by 2-digit prefix ──────────────────────

const CUENTA_PREFIX_LABELS: Record<string, string> = {
    '61': 'Variacion de Inventario',
    '62': 'Gasto de Personal',
    '63': 'Servicios prestados por Terceros',
    '64': 'Gastos por Tributos',
    '65': 'Otros Gastos de Gestion',
    '67': 'Gastos Financieros',
    '68': 'Deterioro de Activos',
};

const KNOWN_PREFIXES = Object.keys(CUENTA_PREFIX_LABELS);

const FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'Todas' },
    ...KNOWN_PREFIXES.map(p => ({ value: p, label: `${p}: ${CUENTA_PREFIX_LABELS[p]}` })),
];

function getCuentaPrefix(cuenta: string): string | null {
    const prefix = cuenta.substring(0, 2);
    return KNOWN_PREFIXES.includes(prefix) ? prefix : null;
}

// ── Cuenta category structures ───────────────────────────────────────

interface CuentaCategory {
    prefix: string;
    label: string;
    data: ReportRow;
    cuentaRows: ReportRow[];
}

interface UngroupedCuenta {
    prefix: null;
    row: ReportRow;
}

type CuentaEntry = CuentaCategory | UngroupedCuenta;

function buildCuentaEntries(cuentaRows: ReportRow[], columns: DisplayColumn[]): CuentaEntry[] {
    const monthKeys = new Set<string>();
    for (const col of columns) {
        for (const m of col.sourceMonths) monthKeys.add(m);
    }

    const categoryMap = new Map<string, { rows: ReportRow[]; data: Record<string, number> }>();
    const ungrouped: ReportRow[] = [];

    for (const row of cuentaRows) {
        const cuenta = String(row['CUENTA_CONTABLE'] ?? '');
        const prefix = getCuentaPrefix(cuenta);

        if (prefix) {
            if (!categoryMap.has(prefix)) {
                categoryMap.set(prefix, { rows: [], data: {} });
            }
            const cat = categoryMap.get(prefix)!;
            cat.rows.push(row);
            for (const m of monthKeys) {
                cat.data[m] = (cat.data[m] ?? 0) + ((row[m] as number) ?? 0);
            }
            cat.data['TOTAL'] = (cat.data['TOTAL'] ?? 0) + ((row['TOTAL'] as number) ?? 0);
        } else {
            ungrouped.push(row);
        }
    }

    const entries: CuentaEntry[] = [];
    for (const prefix of KNOWN_PREFIXES) {
        const cat = categoryMap.get(prefix);
        if (!cat || cat.rows.length === 0) continue;
        entries.push({
            prefix,
            label: `${prefix}: ${CUENTA_PREFIX_LABELS[prefix]}`,
            data: cat.data as ReportRow,
            cuentaRows: cat.rows,
        });
    }
    for (const row of ungrouped) {
        entries.push({ prefix: null, row });
    }

    return entries;
}

// ── Aggregation helpers ──────────────────────────────────────────────

function sumRows(rows: ReportRow[], columns: DisplayColumn[]): Record<string, number> {
    const monthKeys = new Set<string>();
    for (const col of columns) {
        for (const m of col.sourceMonths) monthKeys.add(m);
    }
    const sums: Record<string, number> = {};
    for (const row of rows) {
        for (const m of monthKeys) {
            sums[m] = (sums[m] ?? 0) + ((row[m] as number) ?? 0);
        }
        sums['TOTAL'] = (sums['TOTAL'] ?? 0) + ((row['TOTAL'] as number) ?? 0);
    }
    return sums;
}

// ── CECO group building (COSTO only) ─────────────────────────────────

interface CecoGroup {
    label: string;
    data: ReportRow;
    cuentaRows: ReportRow[];
}

function buildCecoGroups(costoByCuenta: ReportRow[], columns: DisplayColumn[]): CecoGroup[] {
    const cuentaByGroup = new Map<string, ReportRow[]>();
    for (const row of costoByCuenta) {
        const cc = String(row['CENTRO_COSTO'] ?? '');
        const groupLabel = getGroupLabel(cc);
        if (!cuentaByGroup.has(groupLabel)) cuentaByGroup.set(groupLabel, []);
        cuentaByGroup.get(groupLabel)!.push(row);
    }

    const result: CecoGroup[] = [];
    for (const g of CECO_GROUPS) {
        const rows = cuentaByGroup.get(g.label);
        if (!rows || rows.length === 0) continue;
        result.push({ label: g.label, data: sumRows(rows, columns) as ReportRow, cuentaRows: rows });
    }
    const otrosRows = cuentaByGroup.get(OTROS_LABEL);
    if (otrosRows && otrosRows.length > 0) {
        result.push({ label: OTROS_LABEL, data: sumRows(otrosRows, columns) as ReportRow, cuentaRows: otrosRows });
    }
    return result;
}

// ── Which PARTIDA_PL rows are expandable and how ─────────────────────

const CECO_EXPANDABLE = new Set(['COSTO']);
const CUENTA_EXPANDABLE = new Set([
    'GASTO VENTA', 'GASTO ADMIN', 'D&A - COSTO', 'D&A - GASTO',
    'OTROS INGRESOS', 'OTROS EGRESOS', 'PARTICIPACION DE TRABAJADORES', 'PROVISION INCOBRABLE',
]);

// ── Helpers ──────────────────────────────────────────────────────────

function negClass(val: number | null | undefined): string {
    if (val !== null && val !== undefined && val < 0) return 'rpt-neg';
    return '';
}

function NumCells({ row, columns }: { row: ReportRow; columns: DisplayColumn[] }) {
    return (
        <>
            {columns.map(col => {
                const val = getCellValue(row, col);
                return (
                    <td key={col.header} className={negClass(val)}>
                        {formatNumber(val)}
                    </td>
                );
            })}
        </>
    );
}

function TotalCell({ row, columns, variant }: { row: ReportRow; columns: DisplayColumn[]; variant?: 'pl' }) {
    const total = variant === 'pl' ? getSummaryTotal(row, columns, 'pl') : (row['TOTAL'] as number | null ?? null);
    return (
        <td className={negClass(total)} style={{ fontWeight: 600 }}>
            {formatNumber(total)}
        </td>
    );
}

// ── Component ────────────────────────────────────────────────────────

interface ExpandableFinancialTableProps {
    rows: ReportRow[];
    columns: DisplayColumn[];
    costoByCuenta: ReportRow[];
    gastoVentaByCuenta: ReportRow[];
    gastoAdminByCuenta: ReportRow[];
    dyaCostoByCuenta: ReportRow[];
    dyaGastoByCuenta: ReportRow[];
    otrosIngresosByCuenta: ReportRow[];
    otrosEgresosByCuenta: ReportRow[];
    participacionByCuenta: ReportRow[];
    provisionByCuenta: ReportRow[];
}

export default function ExpandableFinancialTable(props: ExpandableFinancialTableProps) {
    const { rows, columns, costoByCuenta, gastoVentaByCuenta, gastoAdminByCuenta, dyaCostoByCuenta, dyaGastoByCuenta, otrosIngresosByCuenta, otrosEgresosByCuenta, participacionByCuenta, provisionByCuenta } = props;

    const [expandedPartidas, setExpandedPartidas] = useState<Set<string>>(new Set());
    const [expandedCecoGroups, setExpandedCecoGroups] = useState<Set<string>>(new Set());
    const [expandedCuentaCats, setExpandedCuentaCats] = useState<Set<string>>(new Set());
    const [cuentaFilter, setCuentaFilter] = useState<string>('all');

    const togglePartida = (partida: string) => {
        setExpandedPartidas(prev => {
            const next = new Set(prev);
            if (next.has(partida)) {
                next.delete(partida);
                setExpandedCecoGroups(prev2 => {
                    const next2 = new Set(prev2);
                    for (const key of next2) if (key.startsWith(partida + '|')) next2.delete(key);
                    return next2;
                });
                setExpandedCuentaCats(prev2 => {
                    const next2 = new Set(prev2);
                    for (const key of next2) if (key.startsWith(partida + '|')) next2.delete(key);
                    return next2;
                });
            } else {
                next.add(partida);
            }
            return next;
        });
    };

    const toggleCecoGroup = (partida: string, groupLabel: string) => {
        const key = `${partida}|${groupLabel}`;
        setExpandedCecoGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
                setExpandedCuentaCats(prev2 => {
                    const next2 = new Set(prev2);
                    for (const k of next2) if (k.startsWith(`${partida}|${groupLabel}|`)) next2.delete(k);
                    return next2;
                });
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const toggleCuentaCat = (key: string) => {
        setExpandedCuentaCats(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const isFiltered = cuentaFilter !== 'all';

    const byCuentaMap: Record<string, ReportRow[]> = useMemo(() => ({
        'GASTO VENTA': gastoVentaByCuenta,
        'GASTO ADMIN': gastoAdminByCuenta,
        'D&A - COSTO': dyaCostoByCuenta,
        'D&A - GASTO': dyaGastoByCuenta,
        'OTROS INGRESOS': otrosIngresosByCuenta,
        'OTROS EGRESOS': otrosEgresosByCuenta,
        'PARTICIPACION DE TRABAJADORES': participacionByCuenta,
        'PROVISION INCOBRABLE': provisionByCuenta,
    }), [gastoVentaByCuenta, gastoAdminByCuenta, dyaCostoByCuenta, dyaGastoByCuenta, otrosIngresosByCuenta, otrosEgresosByCuenta, participacionByCuenta, provisionByCuenta]);

    const filterCuenta = (rows: ReportRow[]): ReportRow[] => {
        if (!isFiltered) return rows;
        return rows.filter(r => String(r['CUENTA_CONTABLE'] ?? '').startsWith(cuentaFilter));
    };

    const filteredCostoCuenta = useMemo(() => filterCuenta(costoByCuenta), [costoByCuenta, cuentaFilter]);
    const cecoGroups = useMemo(() => buildCecoGroups(filteredCostoCuenta, columns), [filteredCostoCuenta, columns]);
    const cuentaEntriesByCecoGroup = useMemo(() => {
        const map = new Map<string, CuentaEntry[]>();
        for (const g of cecoGroups) {
            map.set(g.label, buildCuentaEntries(g.cuentaRows, columns));
        }
        return map;
    }, [cecoGroups, columns]);

    const cuentaEntriesByPartida = useMemo(() => {
        const map = new Map<string, { entries: CuentaEntry[]; filteredTotal: ReportRow }>();
        for (const partida of CUENTA_EXPANDABLE) {
            const raw = byCuentaMap[partida] ?? [];
            const filtered = filterCuenta(raw);
            const entries = buildCuentaEntries(filtered, columns);
            const filteredTotal = { PARTIDA_PL: partida, ...sumRows(filtered, columns) } as ReportRow;
            map.set(partida, { entries, filteredTotal });
        }
        return map;
    }, [byCuentaMap, cuentaFilter, columns]);

    const filteredCostoRow = useMemo(
        () => isFiltered ? { PARTIDA_PL: 'COSTO', ...sumRows(filteredCostoCuenta, columns) } as ReportRow : null,
        [isFiltered, filteredCostoCuenta, columns],
    );

    const isExpandable = (label: string) => CECO_EXPANDABLE.has(label) || CUENTA_EXPANDABLE.has(label);

    const getDisplayRow = (row: ReportRow, label: string): ReportRow => {
        if (!isFiltered) return row;
        if (label === 'COSTO' && filteredCostoRow) return filteredCostoRow;
        const partidaData = cuentaEntriesByPartida.get(label);
        if (partidaData) return partidaData.filteredTotal;
        return row;
    };

    return (
        <div>
            {/* Filter tabs */}
            <nav className="flex items-baseline gap-6 mb-10 flex-wrap">
                <span className="text-[11px] font-semibold uppercase text-txt-muted" style={{ letterSpacing: '1.2px' }}>
                    Cuenta
                </span>
                <div className="flex gap-6 flex-wrap">
                    {FILTER_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setCuentaFilter(opt.value)}
                            className={`text-[13px] bg-transparent border-none cursor-pointer pb-1.5 transition-all
                                ${cuentaFilter === opt.value
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

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="rpt-table">
                    <thead>
                        <tr>
                            <th className="text-left">Partida</th>
                            {columns.map(col => (
                                <th key={col.header}>{col.header}</th>
                            ))}
                            <th className="rpt-col-total">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const label = row['PARTIDA_PL'] as string;
                            const isEmpty = !label || label.trim() === '';
                            const isBold = BOLD_ROWS_PL.has(label);
                            const canExpand = isExpandable(label);
                            const isExpanded = expandedPartidas.has(label);
                            const displayRow = getDisplayRow(row, label);

                            if (isEmpty) {
                                return (
                                    <tr key={idx} className="rpt-row-spacer">
                                        <td colSpan={columns.length + 2}></td>
                                    </tr>
                                );
                            }

                            const rowClass = isBold ? 'rpt-row-bold' : canExpand ? 'rpt-row-l0' : 'rpt-row-data';

                            return (
                                <Frag key={idx}>
                                    <tr
                                        className={rowClass}
                                        onClick={canExpand ? () => togglePartida(label) : undefined}
                                        style={canExpand ? { cursor: 'pointer' } : undefined}
                                    >
                                        <td>
                                            {canExpand && (
                                                <span className="rpt-chevron">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                                            )}
                                            {label}
                                            {isFiltered && canExpand && (
                                                <span className="text-[10px] text-txt-muted ml-2">({cuentaFilter})</span>
                                            )}
                                        </td>
                                        <NumCells row={displayRow} columns={columns} />
                                        {(() => {
                                            const total = (isFiltered && canExpand)
                                                ? (displayRow['TOTAL'] as number | null)
                                                : getSummaryTotal(displayRow, columns, 'pl');
                                            return (
                                                <td className={negClass(total)} style={{ fontWeight: 600 }}>
                                                    {formatNumber(total)}
                                                </td>
                                            );
                                        })()}
                                    </tr>

                                    {/* COSTO expansion: CECO groups → cuenta categories → cuentas */}
                                    {isExpanded && CECO_EXPANDABLE.has(label) && (
                                        <CecoExpansion
                                            partida={label}
                                            cecoGroups={cecoGroups}
                                            cuentaEntriesByCecoGroup={cuentaEntriesByCecoGroup}
                                            expandedCecoGroups={expandedCecoGroups}
                                            expandedCuentaCats={expandedCuentaCats}
                                            toggleCecoGroup={toggleCecoGroup}
                                            toggleCuentaCat={toggleCuentaCat}
                                            columns={columns}
                                        />
                                    )}

                                    {/* Simple expansion: cuenta categories → cuentas */}
                                    {isExpanded && CUENTA_EXPANDABLE.has(label) && (
                                        <CuentaExpansion
                                            partida={label}
                                            entries={cuentaEntriesByPartida.get(label)?.entries ?? []}
                                            expandedCuentaCats={expandedCuentaCats}
                                            toggleCuentaCat={toggleCuentaCat}
                                            columns={columns}
                                        />
                                    )}
                                </Frag>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── CECO expansion (COSTO) ───────────────────────────────────────────

function CecoExpansion({ partida, cecoGroups, cuentaEntriesByCecoGroup, expandedCecoGroups, expandedCuentaCats, toggleCecoGroup, toggleCuentaCat, columns }: {
    partida: string;
    cecoGroups: CecoGroup[];
    cuentaEntriesByCecoGroup: Map<string, CuentaEntry[]>;
    expandedCecoGroups: Set<string>;
    expandedCuentaCats: Set<string>;
    toggleCecoGroup: (partida: string, groupLabel: string) => void;
    toggleCuentaCat: (key: string) => void;
    columns: DisplayColumn[];
}) {
    return (
        <>
            {cecoGroups.map((group) => {
                const groupKey = `${partida}|${group.label}`;
                const isGroupExpanded = expandedCecoGroups.has(groupKey);
                const cuentaEntries = cuentaEntriesByCecoGroup.get(group.label) ?? [];

                return (
                    <Frag key={`cg-${group.label}`}>
                        {/* L1: CECO group */}
                        <tr
                            className="rpt-row-l1"
                            onClick={() => toggleCecoGroup(partida, group.label)}
                            style={{ cursor: 'pointer' }}
                        >
                            <td>
                                <span className="rpt-chevron">{isGroupExpanded ? '\u25BE' : '\u25B8'}</span>
                                {group.label}
                            </td>
                            <NumCells row={group.data} columns={columns} />
                            <TotalCell row={group.data} columns={columns} />
                        </tr>

                        {isGroupExpanded && (
                            <CuentaEntryRows
                                entries={cuentaEntries}
                                parentKey={`${partida}|${group.label}`}
                                expandedCuentaCats={expandedCuentaCats}
                                toggleCuentaCat={toggleCuentaCat}
                                columns={columns}
                                catLevel="l2"
                                leafLevel="l3"
                            />
                        )}
                    </Frag>
                );
            })}
        </>
    );
}

// ── Simple cuenta expansion (GASTO VENTA, etc.) ──────────────────────

function CuentaExpansion({ partida, entries, expandedCuentaCats, toggleCuentaCat, columns }: {
    partida: string;
    entries: CuentaEntry[];
    expandedCuentaCats: Set<string>;
    toggleCuentaCat: (key: string) => void;
    columns: DisplayColumn[];
}) {
    return (
        <CuentaEntryRows
            entries={entries}
            parentKey={partida}
            expandedCuentaCats={expandedCuentaCats}
            toggleCuentaCat={toggleCuentaCat}
            columns={columns}
            catLevel="l1"
            leafLevel="l2"
        />
    );
}

// ── Cuenta entry rows (shared between CECO and simple modes) ─────────

function CuentaEntryRows({ entries, parentKey, expandedCuentaCats, toggleCuentaCat, columns, catLevel, leafLevel }: {
    entries: CuentaEntry[];
    parentKey: string;
    expandedCuentaCats: Set<string>;
    toggleCuentaCat: (key: string) => void;
    columns: DisplayColumn[];
    catLevel: 'l1' | 'l2';
    leafLevel: 'l2' | 'l3';
}) {
    return (
        <>
            {entries.map((entry, ei) => {
                if (entry.prefix === null) {
                    const cuentaRow = entry.row;
                    return (
                        <tr key={`ug-${ei}`} className={`rpt-row-${leafLevel}`}>
                            <td>
                                {cuentaRow['CUENTA_CONTABLE']} {cuentaRow['DESCRIPCION']}
                            </td>
                            <NumCells row={cuentaRow} columns={columns} />
                            <TotalCell row={cuentaRow} columns={columns} />
                        </tr>
                    );
                }

                const catKey = `${parentKey}|${entry.prefix}`;
                const isCatExpanded = expandedCuentaCats.has(catKey);

                return (
                    <Frag key={`cat-${entry.prefix}`}>
                        {/* Cuenta category row */}
                        <tr
                            className={`rpt-row-${catLevel}`}
                            onClick={() => toggleCuentaCat(catKey)}
                            style={{ cursor: 'pointer' }}
                        >
                            <td>
                                <span className="rpt-chevron">{isCatExpanded ? '\u25BE' : '\u25B8'}</span>
                                {entry.label}
                            </td>
                            <NumCells row={entry.data} columns={columns} />
                            <TotalCell row={entry.data} columns={columns} />
                        </tr>

                        {/* Individual cuenta rows */}
                        {isCatExpanded && entry.cuentaRows.map((cuentaRow, ki) => (
                            <tr key={`cr-${ki}`} className={`rpt-row-${leafLevel}`}>
                                <td>
                                    {cuentaRow['CUENTA_CONTABLE']} {cuentaRow['DESCRIPCION']}
                                </td>
                                <NumCells row={cuentaRow} columns={columns} />
                                <TotalCell row={cuentaRow} columns={columns} />
                            </tr>
                        ))}
                    </Frag>
                );
            })}
        </>
    );
}

function Frag({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
