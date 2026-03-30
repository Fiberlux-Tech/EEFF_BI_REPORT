import { useMemo } from 'react';
import type { ReportRow } from '@/types';
import { formatNumber } from '@/utils/format';

// Rows that should be rendered bold (summary/total lines)
const BOLD_ROWS_PL = new Set([
    'INGRESOS TOTALES', 'UTILIDAD BRUTA', 'UTILIDAD OPERATIVA',
    'UTILIDAD ANTES DE IMPUESTO A LA RENTA', 'UTILIDAD NETA',
]);

const BOLD_ROWS_BS = new Set([
    'TOTAL ACTIVO CORRIENTE', 'TOTAL ACTIVO NO CORRIENTE', 'TOTAL ACTIVO',
    'TOTAL PASIVO CORRIENTE', 'TOTAL PASIVO NO CORRIENTE', 'TOTAL PASIVO',
    'TOTAL PATRIMONIO', 'TOTAL PASIVO Y PATRIMONIO',
]);

interface FinancialTableProps {
    rows: ReportRow[];
    months: string[];
    labelKey: string;       // "PARTIDA_PL" or "PARTIDA_BS"
    showTotal?: boolean;    // show TOTAL column (P&L has it, BS doesn't)
    variant: 'pl' | 'bs';
}

function getRowClassName(isBold: boolean, isSection: boolean) {
    if (isBold) return 'font-bold text-gray-900 bg-gray-50';
    if (isSection) return 'font-semibold text-gray-700 bg-gray-100';
    return 'text-gray-700 bg-white';
}

function getCellClassName(isBold: boolean, isSection: boolean, isNeg: boolean) {
    return `px-2 py-1.5 text-right whitespace-nowrap font-mono ${isBold ? 'font-bold' : ''} ${isNeg ? 'text-red-600' : 'text-gray-800'} ${isSection ? 'bg-gray-100' : ''}`;
}

export default function FinancialTable({ rows, months, labelKey, showTotal = false, variant }: FinancialTableProps) {
    const boldSet = variant === 'pl' ? BOLD_ROWS_PL : BOLD_ROWS_BS;
    const valueCols = useMemo(() => showTotal ? [...months, 'TOTAL'] : months, [months, showTotal]);

    return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-xs">
                <thead>
                    <tr className="bg-gray-800 text-white">
                        <th className="sticky left-0 bg-gray-800 z-10 px-3 py-2 text-left font-medium min-w-[220px]">
                            PARTIDA
                        </th>
                        {valueCols.map(col => (
                            <th key={col} className="px-2 py-2 text-right font-medium whitespace-nowrap min-w-[85px]">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => {
                        const label = row[labelKey] as string;
                        const isEmpty = !label || label.trim() === '';
                        const isBold = boldSet.has(label);
                        const isSection = variant === 'bs' && label && !isBold && row[months[0]] === null;

                        if (isEmpty) {
                            return (
                                <tr key={idx} className="h-2">
                                    <td colSpan={valueCols.length + 1}></td>
                                </tr>
                            );
                        }

                        const rowStyle = getRowClassName(isBold, !!isSection);

                        return (
                            <tr
                                key={idx}
                                className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${isBold ? 'bg-gray-50' : ''} ${isSection ? 'bg-gray-100' : ''}`}
                            >
                                <td className={`sticky left-0 z-10 px-3 py-1.5 whitespace-nowrap ${rowStyle}`}>
                                    {label}
                                </td>
                                {valueCols.map(col => {
                                    const val = row[col] as number | null;
                                    const isNeg = val !== null && val !== undefined && val < 0;
                                    return (
                                        <td key={col} className={getCellClassName(isBold, !!isSection, isNeg)}>
                                            {formatNumber(val)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
