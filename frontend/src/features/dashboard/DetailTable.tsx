import type { CellSelection, TableConfig } from '@/types';
import { formatNumber } from '@/utils/format';

interface DetailTableProps extends TableConfig {
    months: string[];
    year: number;
    selection: CellSelection | null;
    onCellClick: (sel: CellSelection) => void;
}

export default function DetailTable({ title, rows, labelKeys, headerLabels, months, year, partida, filterCol, selection, onCellClick }: DetailTableProps) {
    const valueCols = [...months, 'TOTAL'];
    const valueHeaders = [...months, String(year)];

    return (
        <div>
            <h3 className="text-base font-semibold text-gray-700 mb-2">{title}</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-xs">
                    <thead>
                        <tr className="bg-gray-800 text-white">
                            <th
                                colSpan={labelKeys.length}
                                className="sticky left-0 z-10 bg-gray-800 px-3 py-2 text-left font-medium whitespace-nowrap min-w-[300px]"
                            >
                                {headerLabels.join(' / ')}
                            </th>
                            {valueHeaders.map((col, i) => (
                                <th key={col} className={`px-2 py-2 text-right font-medium whitespace-nowrap min-w-[85px] ${i === valueHeaders.length - 1 ? 'font-bold' : ''}`}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const isTotal = labelKeys.some(k => row[k] === 'TOTAL');
                            const rowFilterVal = isTotal ? null : String(row[filterCol] ?? '');
                            const rowLabel = isTotal ? 'TOTAL' : String(row[labelKeys[labelKeys.length - 1]] ?? '');

                            const isRowSelected = selection &&
                                selection.partida === partida &&
                                selection.month === null &&
                                selection.filterVal === rowFilterVal;

                            return (
                                <tr
                                    key={idx}
                                    className={`border-b border-gray-100 transition-colors
                                        ${isTotal ? 'bg-gray-50 font-bold' : 'hover:bg-blue-50/50'}
                                        ${isRowSelected ? 'ring-1 ring-blue-400' : ''}`}
                                >
                                    <td
                                        colSpan={labelKeys.length}
                                        onClick={() => onCellClick({
                                            partida,
                                            month: null,
                                            filterCol: isTotal ? null : filterCol,
                                            filterVal: rowFilterVal,
                                            label: `${rowLabel} — Todo el periodo`,
                                        })}
                                        className={`sticky left-0 z-10 px-3 py-1.5 whitespace-nowrap cursor-pointer hover:underline
                                            ${isTotal ? 'font-bold text-gray-900 bg-gray-50 hover:bg-gray-100' : 'text-gray-700 bg-white hover:bg-blue-50'}
                                            ${isRowSelected ? 'bg-blue-100' : ''}`}
                                    >
                                        {labelKeys.map(key => row[key] ?? '').join(' — ')}
                                    </td>
                                    {valueCols.map((col, i) => {
                                        const val = row[col] as number | null;
                                        const isNeg = val !== null && val !== undefined && val < 0;
                                        const isYearCol = i === valueCols.length - 1;
                                        const isMonth = i < months.length;
                                        const monthName = isMonth ? months[i] : null;
                                        const hasValue = val !== null && val !== undefined && val !== 0;

                                        const clickMonth = isYearCol ? null : monthName;
                                        const clickFilterCol = isTotal ? null : filterCol;
                                        const clickFilterVal = isTotal ? null : rowFilterVal;
                                        const clickLabel = isYearCol
                                            ? `${rowLabel} — Todo el periodo`
                                            : isTotal
                                                ? `TOTAL — ${monthName}`
                                                : `${rowLabel} — ${monthName}`;

                                        const isClickable = hasValue;
                                        const isSelected = selection &&
                                            selection.partida === partida &&
                                            selection.month === clickMonth &&
                                            selection.filterVal === clickFilterVal;

                                        return (
                                            <td
                                                key={col}
                                                onClick={isClickable ? () => onCellClick({
                                                    partida,
                                                    month: clickMonth,
                                                    filterCol: clickFilterCol,
                                                    filterVal: clickFilterVal,
                                                    label: clickLabel,
                                                }) : undefined}
                                                className={`px-2 py-1.5 text-right whitespace-nowrap font-mono
                                                    ${isTotal || isYearCol ? 'font-bold' : ''}
                                                    ${isNeg ? 'text-red-600' : 'text-gray-800'}
                                                    ${isClickable ? 'cursor-pointer hover:bg-blue-100 hover:underline' : ''}
                                                    ${isSelected ? 'bg-blue-200 ring-1 ring-blue-400' : ''}`}
                                            >
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
        </div>
    );
}
