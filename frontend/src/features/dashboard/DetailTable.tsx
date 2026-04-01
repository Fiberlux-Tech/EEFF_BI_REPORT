import type { CellSelection, DisplayColumn, ReportRow } from '@/types';
import { formatNumber } from '@/utils/format';
import { getCellValue, getDetailTotal } from '@/utils/cellValue';
import { negClass } from '@/utils/classHelpers';

interface DetailTableProps {
    title: string;
    rows: ReportRow[];
    labelKeys: string[];
    headerLabels: string[];
    columns: DisplayColumn[];
    year: number;
    partida: string;
    filterCol: string;
    selection: CellSelection | null;
    onCellClick: (sel: CellSelection) => void;
    showTitle?: boolean;
}

export default function DetailTable({ title, rows, labelKeys, headerLabels, columns, year, partida, filterCol, selection, onCellClick, showTitle = true }: DetailTableProps) {
    const totalHeader = String(year);

    return (
        <div>
            {showTitle && (
                <h3 className="font-serif text-lg font-semibold text-[#222] tracking-tight mb-5">
                    {title}
                </h3>
            )}
            <div className="overflow-x-auto">
                <table className="rpt-table">
                    <thead>
                        <tr>
                            <th colSpan={labelKeys.length} className="text-left">
                                {headerLabels.join(' / ')}
                            </th>
                            {columns.map(col => (
                                <th key={col.header}>{col.header}</th>
                            ))}
                            <th className="rpt-col-total">{totalHeader}</th>
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
                                    className={isTotal ? 'rpt-row-total' : 'rpt-row-data'}
                                >
                                    <td
                                        colSpan={labelKeys.length}
                                        onClick={() => onCellClick({
                                            partida,
                                            month: null,
                                            filterCol: isTotal ? null : filterCol,
                                            filterVal: rowFilterVal,
                                            label: `${rowLabel} \u2014 Todo el periodo`,
                                        })}
                                        className={`rpt-clickable ${isRowSelected ? 'rpt-selected' : ''}
                                            ${isTotal ? '' : ''}`}
                                        style={isTotal ? { fontWeight: 700 } : {}}
                                    >
                                        {isTotal
                                            ? `\u2014 TOTAL`
                                            : labelKeys.map(key => row[key] ?? '').join(' \u2014 ')}
                                    </td>
                                    {columns.map(col => {
                                        const val = getCellValue(row, col);
                                        const hasValue = val !== null && val !== undefined && val !== 0;

                                        const clickLabel = col.sourceMonths.length === 1
                                            ? `${rowLabel} \u2014 ${col.sourceMonths[0]}`
                                            : `${rowLabel} \u2014 ${col.header}`;

                                        const isSelected = selection &&
                                            selection.partida === partida &&
                                            selection.month === col.sourceMonths.join(',') &&
                                            selection.filterVal === (isTotal ? null : rowFilterVal);

                                        return (
                                            <td
                                                key={col.header}
                                                onClick={hasValue ? () => onCellClick({
                                                    partida,
                                                    month: col.sourceMonths.join(','),
                                                    filterCol: isTotal ? null : filterCol,
                                                    filterVal: isTotal ? null : rowFilterVal,
                                                    label: isTotal ? `TOTAL \u2014 ${col.header}` : clickLabel,
                                                }) : undefined}
                                                className={`${negClass(val)}
                                                    ${hasValue ? 'rpt-clickable' : ''}
                                                    ${isSelected ? 'rpt-selected' : ''}`}
                                            >
                                                {formatNumber(val)}
                                            </td>
                                        );
                                    })}
                                    {/* Year total column */}
                                    {(() => {
                                        const total = getDetailTotal(row, columns);
                                        const hasValue = total !== null && total !== undefined && total !== 0;

                                        const isSelected = selection &&
                                            selection.partida === partida &&
                                            selection.month === null &&
                                            selection.filterVal === (isTotal ? null : rowFilterVal);

                                        return (
                                            <td
                                                onClick={hasValue ? () => onCellClick({
                                                    partida,
                                                    month: null,
                                                    filterCol: isTotal ? null : filterCol,
                                                    filterVal: isTotal ? null : rowFilterVal,
                                                    label: `${rowLabel} \u2014 Todo el periodo`,
                                                }) : undefined}
                                                className={`${negClass(total)}
                                                    ${hasValue ? 'rpt-clickable' : ''}
                                                    ${isSelected ? 'rpt-selected' : ''}`}
                                                style={{ fontWeight: 600 }}
                                            >
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
        </div>
    );
}
