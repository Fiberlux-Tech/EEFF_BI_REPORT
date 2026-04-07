import type { ReportRow } from '@/types';
import { ALL_MONTHS } from '@/types';
import { BOLD_ROWS_PL } from '@/utils/cellValue';

const LABEL_KEY = 'PARTIDA_PL';

function hasNonZeroValues(row: ReportRow): boolean {
    for (const m of ALL_MONTHS) {
        const v = row[m];
        if (v !== null && v !== undefined && v !== 0) return true;
    }
    return false;
}

/**
 * Build an expanded P&L view that shows intercompany amounts as separate rows
 * below their parent partida.
 *
 * - Subtotal/bold rows and blank spacers come from allRows (correct totals).
 * - Data rows are split: ex-IC value first, then an "X INTERCOMPANY" row
 *   (only when IC data is non-zero).
 */
export function buildExpandedPLRows(
    allRows: ReportRow[],
    exIcRows: ReportRow[],
    onlyIcRows: ReportRow[],
): ReportRow[] {
    const exIcLookup = new Map<string, ReportRow>();
    for (const r of exIcRows) {
        const label = r[LABEL_KEY] as string;
        if (label && label.trim() !== '') exIcLookup.set(label, r);
    }

    const icLookup = new Map<string, ReportRow>();
    for (const r of onlyIcRows) {
        const label = r[LABEL_KEY] as string;
        if (label && label.trim() !== '') icLookup.set(label, r);
    }

    const result: ReportRow[] = [];

    for (const row of allRows) {
        const label = row[LABEL_KEY] as string;

        // Blank spacer rows and bold subtotal rows: pass through unchanged
        if (!label || label.trim() === '' || BOLD_ROWS_PL.has(label)) {
            result.push(row);
            continue;
        }

        // Check if this partida has IC data
        const icRow = icLookup.get(label);
        if (icRow && hasNonZeroValues(icRow)) {
            // Output the ex-IC row (values without intercompany)
            const exRow = exIcLookup.get(label);
            result.push(exRow ?? row);
            // Output the IC breakdown row
            result.push({ ...icRow, [LABEL_KEY]: `${label} INTERCOMPANY` });
        } else {
            // No IC data for this partida: output as-is
            result.push(row);
        }
    }

    return result;
}
