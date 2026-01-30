
import { MonthlyGoal, TopClient } from './types';

export const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const YEARS = ['2026', '2027', '2028', '2029', '2030'];
export const HISTORICAL_YEARS = [2021, 2022, 2023, 2024, 2025];

export const TARGET_GOALS: MonthlyGoal[] = [
  { month: 'Jan', syllas: 118500, v1: 24000, v2: 0, v3: 0, total: 142500, obs: "Ramp-up inicial da V1 (90%)" },
  { month: 'Fev', syllas: 138000, v1: 28000, v2: 26000, v3: 0, total: 192000, obs: "Entrada da V2 + V1 estabiliza em 30k" },
  { month: 'Mar', syllas: 100000, v1: 42000, v2: 26000, v3: 0, total: 168000, obs: "V1 sobe para 50k" },
  { month: 'Abr', syllas: 98000, v1: 43000, v2: 27000, v3: 0, total: 168000, obs: "Consolidação dos fluxos" },
  { month: 'Mai', syllas: 94000, v1: 44000, v2: 27000, v3: 0, total: 165000, obs: "Foco em cadências + CRM" },
  { month: 'Jun', syllas: 89000, v1: 44000, v2: 27000, v3: 0, total: 160000, obs: "Mês historicamente de menor giro" },
  { month: 'Jul', syllas: 103000, v1: 42000, v2: 42000, v3: 0, total: 187000, obs: "V2 atinge 50k" },
  { month: 'Ago', syllas: 116000, v1: 40000, v2: 40000, v3: 0, total: 196000, obs: "Estabilização" },
  { month: 'Set', syllas: 128000, v1: 39000, v2: 39000, v3: 0, total: 206000, obs: "Mês-chave para meta anual" },
  { month: 'Out', syllas: 136000, v1: 38000, v2: 38000, v3: 0, total: 212000, obs: "Início do pico anual" },
  { month: 'Nov', syllas: 144000, v1: 37000, v2: 37000, v3: 0, total: 218000, obs: "Força máxima da indústria" },
  { month: 'Dez', syllas: 125000, v1: 40000, v2: 40000, v3: 0, total: 205000, obs: "Fechamento fiscal + projetos" },
];

export const SELLERS = [
  { id: 'syllas', label: 'Syllas (Dir.)' },
  { id: 'v1', label: 'Vendedora 01' },
  { id: 'v2', label: 'Vendedora 02' },
  { id: 'v3', label: 'Vendedor 03' },
];

export const HISTORICAL_TOP_CLIENTS: TopClient[] = [
  { id: 'c1', name: 'MACCAFERRI DO BRASIL LTDA', history: { 2021: 284869, 2022: 50161, 2023: 104303, 2024: 135998, 2025: 57016 } },
  { id: 'c2', name: 'FERTIPAR BANDEIRANTES LTDA', history: { 2021: 62158, 2022: 99953, 2023: 245829, 2024: 560605, 2025: 786692 } },
  { id: 'c3', name: 'PLASTEK DO BRASIL IND E COM LTDA', history: { 2021: 143580, 2022: 126538, 2023: 52269, 2024: 16275, 2025: 18309 } },
  { id: 'c4', name: 'TEX EQUIPAMENTOS ELETRONICOS', history: { 2021: 82418, 2022: 77266, 2023: 105537, 2024: 121464, 2025: 123748 } },
  { id: 'c5', name: 'CONFIBRA INDUSTRIA E COMERCIO', history: { 2021: 75438, 2022: 120144, 2023: 64626, 2024: 45824, 2025: 46212 } },
  { id: 'c6', name: 'AJINOMOTO DO BRASIL LTDA', history: { 2021: 75186, 2022: 19467, 2023: 53603, 2024: 55354, 2025: 44257 } },
  { id: 'c7', name: 'CJ DO BRASIL PROD ALIMENTICIOS', history: { 2021: 64585, 2022: 98068, 2023: 0, 2024: 200000, 2025: 13353 } },
  { id: 'c8', name: 'IGARATIBA IND E COM LTDA', history: { 2021: 47469, 2022: 38007, 2023: 51410, 2024: 55703, 2025: 27566 } },
  { id: 'c9', name: 'CLARIOS ENERGY SOLUTIONS', history: { 2021: 28570, 2022: 48064, 2023: 49474, 2024: 0, 2025: 13258 } },
  { id: 'c10', name: 'ITURRI COIMPAR INDUSTRIA', history: { 2021: 22199, 2022: 71398, 2023: 76310, 2024: 0, 2025: 0 } },
  { id: 'c11', name: 'ELEKEIROZ S/A', history: { 2021: 15957, 2022: 45817, 2023: 30596, 2024: 25631, 2025: 30809 } },
  { id: 'c12', name: 'AQUAGEL REFRIGERACAO LTDA', history: { 2021: 0, 2022: 68222, 2023: 108894, 2024: 83043, 2025: 74082 } },
  { id: 'c13', name: 'SIKA S.A.', history: { 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 44211 } },
  { id: 'c14', name: 'USINA ACUCAREIRA ESTER SA', history: { 2021: 0, 2022: 0, 2023: 0, 2024: 36961, 2025: 43178 } },
  { id: 'c15', name: 'GLOBAL FLEX IND E CONSERTO', history: { 2021: 0, 2022: 0, 2023: 0, 2024: 29022, 2025: 71597 } },
  { id: 'c16', name: 'EMS S/A', history: { 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 16600 } },
  { id: 'c17', name: 'SUDESTE AUTOMACAO EIRELI', history: { 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 15682 } },
  { id: 'c18', name: 'JV FERRAMENTARIA LTDA', history: { 2021: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 14941 } },
  { id: 'c19', name: 'PAIS E FILHOS USINAGEM LTDA', history: { 2021: 0, 2022: 69586, 2023: 51720, 2024: 12736, 2025: 0 } },
  { id: 'c20', name: 'MIURA BOILER DO BRASIL LTDA', history: { 2021: 12187, 2022: 0, 2023: 16133, 2024: 0, 2025: 0 } },
];
