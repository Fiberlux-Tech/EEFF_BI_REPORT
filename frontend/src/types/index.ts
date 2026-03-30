export interface User {
  id: number;
  username: string;
  display_name: string;
}

export interface CompanyMeta {
  legal_name: string;
  ruc: string;
}

export type CompanyMap = Record<string, CompanyMeta>;

export interface ReportRow {
  [key: string]: string | number | null;
}

export interface CellSelection {
  partida: string;
  month: string | null;
  filterCol: string | null;
  filterVal: string | null;
  label: string;
}

export interface TableConfig {
  title: string;
  rows: ReportRow[];
  labelKeys: string[];
  headerLabels: string[];
  partida: string;
  filterCol: string;
}

export interface ReportData {
  pl_summary: ReportRow[];
  bs_summary: ReportRow[];
  ingresos_ordinarios: ReportRow[];
  ingresos_proyectos: ReportRow[];
  costo: ReportRow[];
  gasto_venta: ReportRow[];
  gasto_admin: ReportRow[];
  dya_costo: ReportRow[];
  dya_gasto: ReportRow[];
  resultado_financiero_ingresos: ReportRow[];
  resultado_financiero_gastos: ReportRow[];
  company: string;
  year: number;
  months: string[];
}
