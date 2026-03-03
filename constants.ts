
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
  v1: { Jan: 24000, Fev: 28000, Mar: 42000, Abr: 43000, Mai: 44000, Jun: 44000, Jul: 42000, Ago: 40000, Set: 39000, Out: 38000, Nov: 37000, Dez: 44000 },
  v2: { Jan: 0, Fev: 20000, Mar: 20000, Abr: 21000, Mai: 21000, Jun: 20000, Jul: 42000, Ago: 40000, Set: 39000, Out: 38000, Nov: 37000, Dez: 41000 },
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
  { id: 'c1', name: 'FERTIPAR BANDEIRANTES LTDA', history: { aggregate: 1988110.44 } },
  { id: 'c2', name: 'MACCAFERRI DO BRASIL LTDA', history: { aggregate: 1204757.35 } },
  { id: 'c3', name: 'TEX EQUIPAMENTOS ELETRONICOS IND E COM LTDA', history: { aggregate: 627295.92 } },
  { id: 'c4', name: 'CONFIBRA INDUSTRIA E COMERCIO LTDA', history: { aggregate: 595093.03 } },
  { id: 'c5', name: 'PLASTEK DO BRASIL IND E COM LTDA', history: { aggregate: 473720.67 } },
  { id: 'c6', name: 'CJ DO BRASIL E COM DE PROD ALIMENTICIOS LTDA', history: { aggregate: 447018.69 } },
  { id: 'c7', name: 'FERTIPAR BANDEIRANTES LTDA - FILIAL PENAPOLIS', history: { aggregate: 441525.39 } },
  { id: 'c8', name: 'AQUAGEL REFRIGERACAO LTDA', history: { aggregate: 409590.18 } },
  { id: 'c9', name: 'AJINOMOTO DO BRASIL IND E COM DE ALIMENTOS LTDA', history: { aggregate: 346678.93 } },
  { id: 'c10', name: 'PACKDUQUE INDUSTRIA DE PLASTICOS LTDA', history: { aggregate: 332552.66 } },
  { id: 'c11', name: 'IGARATIBA IND E COM LTDA', history: { aggregate: 312897.03 } },
  { id: 'c12', name: 'PLIMAX IND DE EMBALAGENS PLASTICAS LTDA', history: { aggregate: 271637.82 } },
  { id: 'c13', name: 'ITURRI COIMPAR INDUSTRIA E COMERCIO DE EPI S LTDA', history: { aggregate: 248035.81 } },
  { id: 'c14', name: 'SIKA S.A .', history: { aggregate: 226327.47 } },
  { id: 'c15', name: 'CLARIOS ENERGY SOLUTIONS BRASIL LTDA', history: { aggregate: 211338.06 } },
  { id: 'c16', name: 'ELEKEIROZ S/A', history: { aggregate: 183721.30 } },
  { id: 'c17', name: 'TOYO INK BRASIL LTDA', history: { aggregate: 152347.97 } },
  { id: 'c18', name: 'MACCAFERRI SKAPS IND E COM DE ARTEFATOS PLASTICOS LTDA', history: { aggregate: 145561.68 } },
  { id: 'c19', name: 'PAIS E FILHOS USINAGEM LTDA', history: { aggregate: 134043.27 } },
  { id: 'c20', name: 'GLOBAL FLEX INDUSTRIA E CONSERTO LTDA', history: { aggregate: 122725.35 } },
  { id: 'c21', name: 'USINA ACUCAREIRA ESTER SA', history: { aggregate: 168512.52 } },
];
