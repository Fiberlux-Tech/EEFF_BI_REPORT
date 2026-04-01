import type XLSX from 'xlsx-js-style';

export const NUM_FMT = '#,##0;-#,##0;"-"';

export const HEADER_STYLE: XLSX.CellStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    fill: { fgColor: { rgb: '1F2937' } },
    alignment: { horizontal: 'center' },
};

export const HEADER_LABEL_STYLE: XLSX.CellStyle = {
    ...HEADER_STYLE,
    alignment: { horizontal: 'left' },
};

export const NUM_STYLE: XLSX.CellStyle = {
    font: { sz: 10 },
    numFmt: NUM_FMT,
    alignment: { horizontal: 'right' },
};

export const TEXT_STYLE: XLSX.CellStyle = {
    font: { sz: 10 },
};
