import type { ReportRow } from '@/types';

// ── CECO grouping definitions (COSTO only) ──────────────────────────

export interface CecoGroupDef {
    label: string;
    codes: string[];
}

export const CECO_GROUPS: CecoGroupDef[] = [
    { label: 'NOC', codes: ['100.101.01', '100.101.02'] },
    { label: 'PLANTA EXTERNA', codes: [
        '100.102.01', '100.102.02', '100.102.03', '100.102.04',
        '100.102.06', '100.102.07', '100.102.08', '100.102.09',
        '100.102.10', '100.102.13', '100.102.14', '100.102.15',
    ]},
    { label: 'COSTO INTERNET', codes: ['100.112.01'] },
    { label: 'COSTO TRANSPORTE', codes: ['100.113.01'] },
    { label: 'COSTO FIBRA OSCURA', codes: ['100.114'] },
    { label: 'COSTO CONTRATAS', codes: ['100.115.01'] },
    { label: 'CONSUMO ACCESORIOS Y EQUIPOS', codes: ['100.116.01'] },
    { label: 'COSTO INTERCOMPANY', codes: ['100.121.01', '100.121.02'] },
];

export const OTROS_LABEL = 'OTROS';

export function getGroupLabel(ccCode: string): string {
    for (const group of CECO_GROUPS) {
        for (const code of group.codes) {
            if (ccCode === code || ccCode.startsWith(code + '.')) return group.label;
        }
    }
    return OTROS_LABEL;
}

// ── CUENTA_CONTABLE grouping by 2-digit prefix ──────────────────────

export const CUENTA_PREFIX_LABELS: Record<string, string> = {
    '61': 'Variacion de Inventario',
    '62': 'Gasto de Personal',
    '63': 'Servicios prestados por Terceros',
    '64': 'Gastos por Tributos',
    '65': 'Otros Gastos de Gestion',
    '67': 'Gastos Financieros',
    '68': 'Deterioro de Activos',
};

export const KNOWN_PREFIXES = Object.keys(CUENTA_PREFIX_LABELS);

export const FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'Todas' },
    ...KNOWN_PREFIXES.map(p => ({ value: p, label: `${p}: ${CUENTA_PREFIX_LABELS[p]}` })),
];

export function getCuentaPrefix(cuenta: string): string | null {
    const prefix = cuenta.substring(0, 2);
    return KNOWN_PREFIXES.includes(prefix) ? prefix : null;
}

// ── Cuenta category structures ───────────────────────────────────────

export interface CuentaCategory {
    prefix: string;
    label: string;
    data: ReportRow;
    cuentaRows: ReportRow[];
}

export interface UngroupedCuenta {
    prefix: null;
    row: ReportRow;
}

export type CuentaEntry = CuentaCategory | UngroupedCuenta;
