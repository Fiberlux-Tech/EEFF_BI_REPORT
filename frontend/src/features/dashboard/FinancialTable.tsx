import type { ReportRow, DisplayColumn } from '@/types';
import { formatNumber } from '@/utils/format';
import { getCellValue, getSummaryTotal, BOLD_ROWS_PL, BOLD_ROWS_BS } from '@/utils/cellValue';

interface FinancialTableProps {
    rows: ReportRow[];
    columns: DisplayColumn[];
    labelKey: string;
    showTotal?: boolean;
    variant: 'pl' | 'bs';
}

function negClass(val: number | null | undefined): string {
    if (val !== null && val !== undefined && val < 0) return 'rpt-neg';
    return '';
}

export default function FinancialTable({ rows, columns, labelKey, showTotal = false, variant }: FinancialTableProps) {
    const boldSet = variant === 'pl' ? BOLD_ROWS_PL : BOLD_ROWS_BS;

    return (
        <div className="overflow-x-auto">
            <table className="rpt-table">
                <thead>
                    <tr>
                        <th className="text-left">Partida</th>
                        {columns.map(col => (
                            <th key={col.header}>{col.header}</th>
                        ))}
                        {showTotal && (
                            <th className="rpt-col-total">Total</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => {
                        const label = row[labelKey] as string;
                        const isEmpty = !label || label.trim() === '';
                        const isBold = boldSet.has(label);
                        const isSection = variant === 'bs' && label && !isBold && columns.length > 0 && getCellValue(row, columns[0]) === null;

                        if (isEmpty) {
                            return (
                                <tr key={idx} className="rpt-row-spacer">
                                    <td colSpan={columns.length + (showTotal ? 2 : 1)}></td>
                                </tr>
                            );
                        }

                        const rowClass = isBold ? 'rpt-row-bold' : isSection ? 'rpt-row-section' : 'rpt-row-data';

                        return (
                            <tr key={idx} className={rowClass}>
                                <td>{label}</td>
                                {columns.map(col => {
                                    const val = getCellValue(row, col);
                                    return (
                                        <td key={col.header} className={negClass(val)}>
                                            {formatNumber(val)}
                                        </td>
                                    );
                                })}
                                {showTotal && (() => {
                                    const total = getSummaryTotal(row, columns, variant);
                                    return (
                                        <td className={negClass(total)} style={{ fontWeight: 600 }}>
                                            {formatNumber(total)}
                                        </td>
                                    );
                                })()}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
