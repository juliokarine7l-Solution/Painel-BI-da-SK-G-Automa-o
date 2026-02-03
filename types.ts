
export interface MonthlyGoal {
  month: string;
  syllas: number;
  v1: number;
  v2: number;
  v3: number;
  total: number;
  obs?: string;
}

export interface SellerActual {
  syllas: number;
  v1: number;
  v2: number;
  v3: number;
}

export interface MonthlyOperational {
  zm: number;
  terceiro: number;
  correios: number;
  mercadoria: number;
}

export type YearlyActualData = Record<string, Record<string, SellerActual>>;
export type YearlyOperationalData = Record<string, Record<string, MonthlyOperational>>;

export interface ChartDataPoint {
  month: string;
  meta: number;
  realizado: number;
  percentage: number;
}

export interface SellerSummary {
  name: string;
  metaTotal: number;
  realizadoTotal: number;
  atingimento: number;
}

export interface ClientYearData {
  year: number;
  value: number;
  isProjection?: boolean;
}

export interface TopClient {
  id: string;
  name: string;
  history: Record<number, number>; // year: value
}
