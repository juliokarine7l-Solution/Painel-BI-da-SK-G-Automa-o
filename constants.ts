
import { MonthlyGoal, TopClient } from './types';

export const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const YEARS = ['2026', '2027', '2028', '2029', '2030'];
export const HISTORICAL_YEARS = [2021, 2022, 2023, 2024, 2025];

// Estrutura de Metas Individuais Fixas 2026
export const INDIVIDUAL_METAS: Record<string, Record<string, number>> = {
  syllas: { Jan: 118500, Fev: 138000, Mar: 100000, Abr: 98000, Mai: 94000, Jun: 89000, Jul: 103000, Ago: 116000, Set: 128000, Out: 136000, Nov: 144000, Dez: 125000 },
  v1: { Jan: 24000, Fev: 28000, Mar: 42000, Abr: 43000, Mai: 44000, Jun: 44000, Jul: 42000, Ago: 40000, Set: 39000, Out: 38000, Nov: 37000, Dez: 40000 },
  v2: { Jan: 0, Fev: 26000, Mar: 26000, Abr: 27000, Mai: 27000, Jun: 27000, Jul: 42000, Ago: 40000, Set: 39000, Out: 38000, Nov: 37000, Dez: 40000 },
  v3: { Jan: 0, Fev: 0, Mar: 0, Abr: 0, Mai: 0, Jun: 0, Jul: 0, Ago: 0, Set: 0, Out: 0, Nov: 0, Dez: 0 },
};

export const TARGET_GOALS: MonthlyGoal[] = MONTHS.map(m => ({
  month: m,
  syllas: INDIVIDUAL_METAS.syllas[m],
  v1: INDIVIDUAL_METAS.v1[m],
  v2: INDIVIDUAL_METAS.v2[m],
  v3: INDIVIDUAL_METAS.v3[m],
  total: INDIVIDUAL_METAS.syllas[m] + INDIVIDUAL_METAS.v1[m] + INDIVIDUAL_METAS.v2[m] + INDIVIDUAL_METAS.v3[m]
}));

export const SELLERS = [
  { id: 'syllas', label: 'Syllas (Dir.)' },
  { id: 'v1', label: 'Vendedora 01' },
  { id: 'v2', label: 'Vendedora 02' },
  { id: 'v3', label: 'Vendedora 03' },
];

// Base Histórica T20 - Valores consolidados 2021-2025 (Ref: Imagem Image_79a5c4)
export const HISTORICAL_TOP_CLIENTS: TopClient[] = [
  { id: 'c1', name: 'FERTIPAR BANDEIRANTES LTDA', history: { aggregate: 1651134.13 } },
  { id: 'c2', name: 'MACCAFERRI DO BRASIL LTDA', history: { aggregate: 345580.94 } },
  { id: 'c3', name: 'TEX EQUIPAMENTOS ELETRONICOS IND E COM LTDA', history: { aggregate: 409515.19 } },
  { id: 'c4', name: 'CONFIBRA INDUSTRIA E COMERCIO LTDA', history: { aggregate: 122690.35 } },
  { id: 'c5', name: 'PLASTEK DO BRASIL IND E COM LTDA', history: { aggregate: 210510.51 } },
  { id: 'c6', name: 'CJ DO BRASIL E COM DE PROD ALIMENTICIOS LTDA', history: { aggregate: 344934.80 } },
  { id: 'c7', name: 'FERTIPAR BANDEIRANTES LTDA - FILIAL PENAPOLIS', history: { aggregate: 431593.89 } },
  { id: 'c8', name: 'AQUAGEL REFRIGERACAO LTDA', history: { aggregate: 226252.45 } },
  { id: 'c9', name: 'AJINOMOTO DO BRASIL IND E COM DE ALIMENTOS LTDA', history: { aggregate: 149205.16 } },
  { id: 'c10', name: 'PACKDUQUE INDUSTRIA DE PLASTICOS LTDA', history: { aggregate: 332477.66 } },
  { id: 'c11', name: 'IGARATIBA IND E COM LTDA', history: { aggregate: 181760.07 } },
  { id: 'c12', name: 'PLIMAX IND DE EMBALAGENS PLASTICAS LTDA', history: { aggregate: 271112.79 } },
  { id: 'c13', name: 'ITURRI COIMPAR INDUSTRIA E COMERCIO DE EPI S LTDA', history: { aggregate: 83673.82 } },
  { id: 'c14', name: 'SIKA S.A .', history: { aggregate: 51503.86 } },
  { id: 'c15', name: 'CLARIOS ENERGY SOLUTIONS BRASIL LTDA', history: { aggregate: 103382.56 } },
  { id: 'c16', name: 'ELEKEIROZ S/A', history: { aggregate: 47641.91 } },
  { id: 'c17', name: 'TOYO INK BRASIL LTDA', history: { aggregate: 152317.98 } },
  { id: 'c18', name: 'MACCAFERRI SKAPS IND E COM DE ARTEFATOS PLASTICOS LTDA', history: { aggregate: 145561.69 } },
  { id: 'c19', name: 'PAIS E FILHOS USINAGEM LTDA', history: { aggregate: 133553.27 } },
  { id: 'c20', name: 'GLOBAL FLEX INDUSTRIA E CONSERTO LTDA', history: { aggregate: 122690.35 } },
  { id: 'c21', name: 'USINA ACUCAREIRA ESTER SA', history: { aggregate: 149205.16 } },
];
