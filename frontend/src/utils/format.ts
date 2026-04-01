export function formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    if (value === 0) return '';
    return value.toLocaleString('es-PE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}
