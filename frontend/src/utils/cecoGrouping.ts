import type { ReportRow, DisplayColumn } from '@/types';
import {
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

export function buildCecoGroups(cuentaRows: ReportRow[], columns: DisplayColumn[]): CecoGroup[] {
    const byCeco = new Map<string, { desc: string; rows: ReportRow[] }>();
    for (const row of cuentaRows) {
        const cc = String(row['CENTRO_COSTO'] ?? '');
        if (!cc) continue;
        if (!byCeco.has(cc)) byCeco.set(cc, { desc: String(row['DESC_CECO'] ?? ''), rows: [] });
        byCeco.get(cc)!.rows.push(row);
    }

    return Array.from(byCeco.keys())
        .sort()
        .map(code => {
            const { desc, rows } = byCeco.get(code)!;
            return {
                label: desc ? `${code} - ${desc}` : code,
                data: sumRows(rows, columns) as ReportRow,
                cuentaRows: rows,
            };
        });
}
