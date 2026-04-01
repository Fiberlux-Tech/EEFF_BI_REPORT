import type { ReportRow, DisplayColumn } from '@/types';
import {
    CECO_GROUPS, OTROS_LABEL, getGroupLabel,
    getCuentaPrefix, CUENTA_PREFIX_LABELS, KNOWN_PREFIXES,
} from '@/config/cecoGroups';
import type { CuentaEntry } from '@/config/cecoGroups';

// ── CecoGroup return type ───────────────────────────────────────────

export interface CecoGroup {
    label: string;
    data: ReportRow;
    cuentaRows: ReportRow[];
}

// ── Aggregation helpers ─────────────────────────────────────────────

export function sumRows(rows: ReportRow[], columns: DisplayColumn[]): Record<string, number> {
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

// ── Cuenta entry builder ────────────────────────────────────────────

export function buildCuentaEntries(cuentaRows: ReportRow[], columns: DisplayColumn[]): CuentaEntry[] {
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

// ── CECO group building (COSTO only) ────────────────────────────────

export function buildCecoGroups(costoByCuenta: ReportRow[], columns: DisplayColumn[]): CecoGroup[] {
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
