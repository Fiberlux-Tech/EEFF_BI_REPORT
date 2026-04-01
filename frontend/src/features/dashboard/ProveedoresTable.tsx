import { useMemo } from 'react';
import type { ReportRow, DisplayColumn } from '@/types';
import { formatNumber } from '@/utils/format';
import { getCellValue, getDetailTotal } from '@/utils/cellValue';
import { negClass } from '@/utils/classHelpers';

// ── Types ───────────────────────────────────────────────────────────

interface ProveedoresTableProps {
    rows: ReportRow[];
    columns: DisplayColumn[];
}

// ── Component ───────────────────────────────────────────────────────

export default function ProveedoresTable({ rows, columns }: ProveedoresTableProps) {
    const { totalRow, detailRows } = useMemo(() => {
        const total = rows.find(r => r['RAZON_SOCIAL'] === 'TOTAL') ?? null;
        const detail = rows.filter(r => r['RAZON_SOCIAL'] !== 'TOTAL');
        return { totalRow: total, detailRows: detail };
    }, [rows]);

    if (!totalRow && detailRows.length === 0) {
        return (
            <div className="text-center py-16 text-txt-muted">
                <p className="text-sm">Sin datos de proveedores de transporte</p>
            </div>
        );
    }

    return (
        <table className="rpt-table">
            <thead>
                <tr>
                    <th colSpan={2} className="text-left">NIT / Proveedor</th>
                    {columns.map(col => (
                        <th key={col.header}>{col.header}</th>
                    ))}
                    <th className="rpt-col-total">Total</th>
                </tr>
            </thead>
            <tbody>
                {/* Total row at top */}
                {totalRow && (
                    <tr className="rpt-row-total">
                        <td colSpan={2}>COSTO DE TRANSPORTE</td>
                        {columns.map(col => {
                            const val = getCellValue(totalRow, col);
                            return (
                                <td key={col.header} className={negClass(val)}>
                                    {formatNumber(val)}
                                </td>
                            );
                        })}
                        <td className={negClass(getDetailTotal(totalRow, columns))}>
                            {formatNumber(getDetailTotal(totalRow, columns))}
                        </td>
                    </tr>
                )}

                {/* NIT detail rows */}
                {detailRows.map((row, idx) => {
                    const total = getDetailTotal(row, columns);
                    return (
                        <tr key={idx} className="rpt-row-data">
                            <td style={{ width: '120px' }}>{String(row['NIT'] ?? '')}</td>
                            <td className="text-left">{String(row['RAZON_SOCIAL'] ?? '')}</td>
                            {columns.map(col => {
                                const val = getCellValue(row, col);
                                return (
                                    <td key={col.header} className={negClass(val)}>
                                        {formatNumber(val)}
                                    </td>
                                );
                            })}
                            <td className={negClass(total)} style={{ fontWeight: 600 }}>
                                {formatNumber(total)}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
