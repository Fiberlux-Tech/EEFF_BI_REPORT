/** Return 'rpt-neg' CSS class for negative numeric values. */
export function negClass(val: number | null | undefined): string {
    if (val !== null && val !== undefined && val < 0) return 'rpt-neg';
    return '';
}
