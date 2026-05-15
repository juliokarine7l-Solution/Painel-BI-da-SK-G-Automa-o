export interface Client {
  id: string;
  name: string;
  salesperson: 'V01' | 'V02' | 'V03';
  billing: number;
  yearlyBilling: { [year: number]: number };
  cost: number;
  salesCycleDays: number;
  rfv: string;
  churnRisk: string;
}

export const initialClients: Client[] = [
  { id: '1', name: 'AQUAGEL', salesperson: 'V01', billing: 332477.66, yearlyBilling: { 2023: 108894.90, 2024: 82968.66, 2025: 74082.82 }, cost: 4000, salesCycleDays: 18, rfv: 'A', churnRisk: 'Baixo' },
  { id: '2', name: 'IGARATIBA', salesperson: 'V01', billing: 211268.06, yearlyBilling: { 2023: 70000, 2024: 71268.06, 2025: 70000 }, cost: 3000, salesCycleDays: 20, rfv: 'B', churnRisk: 'Médio' },
  // ... adicione até totalizar R$ 1.988.484,60 para V01
];

export const initialMonthlyData = {
  2024: { Jan: 0, Fev: 408086, Mar: 150000, Abr: 150000, Mai: 150000, Jun: 150000, Jul: 160000, Ago: 140000, Set: 150000, Out: 150000, Nov: 150000, Dez: 151903.58 },
  2025: { Jan: 140000, Fev: 140000, Mar: 140000, Abr: 142000, Mai: 142000, Jun: 142000, Jul: 142000, Ago: 142000, Set: 142000, Out: 142639.62, Nov: 140000, Dez: 140000 },
  2026: { Jan: 50000, Fev: 50000, Mar: 50000, Abr: 50000, Mai: 50000, Jun: 50000, Jul: 50000, Ago: 50000, Set: 50000, Out: 50000, Nov: 50000, Dez: 50000 },
  2027: { Jan: 0, Fev: 0, Mar: 0, Abr: 0, Mai: 0, Jun: 0, Jul: 0, Ago: 0, Set: 0, Out: 0, Nov: 0, Dez: 0 },
  2028: { Jan: 0, Fev: 0, Mar: 0, Abr: 0, Mai: 0, Jun: 0, Jul: 0, Ago: 0, Set: 0, Out: 0, Nov: 0, Dez: 0 },
};

export const initialSalespersonData = {
  2026: [
    { month: 'Jan', Syllas: 47895.31, V1: 9009.22, V2: 0, V3: 18015.06 },
    { month: 'Fev', Syllas: 91665.50, V1: 18142.95, V2: 0, V3: 19100.55 },
    { month: 'Mar', Syllas: 37689.04, V1: 8416.21, V2: 0, V3: 20877.11 },
    { month: 'Abr', Syllas: 75361.67, V1: 41036.70, V2: 0, V3: 27094.53 },
    { month: 'Mai', Syllas: 66143.86, V1: 13439.88, V2: 0, V3: 15721.95 },
    { month: 'Jun', Syllas: 0, V1: 0, V2: 0, V3: 0 },
    { month: 'Jul', Syllas: 0, V1: 0, V2: 0, V3: 0 },
    { month: 'Ago', Syllas: 0, V1: 0, V2: 0, V3: 0 },
    { month: 'Set', Syllas: 0, V1: 0, V2: 0, V3: 0 },
    { month: 'Out', Syllas: 0, V1: 0, V2: 0, V3: 0 },
    { month: 'Nov', Syllas: 0, V1: 0, V2: 0, V3: 0 },
    { month: 'Dez', Syllas: 0, V1: 0, V2: 0, V3: 0 },
  ]
};

export const initialCustosEficiencia = [
  { mes: 'Jan', materiaPrima: 31344.54, zmExpress: 0, tercExpress: 824.58, correios: 845.58, eficiencia: 44.1 },
  { mes: 'Fev', materiaPrima: 28093.48, zmExpress: 0, tercExpress: 781.94, correios: 397.56, eficiencia: 22.7 },
  { mes: 'Mar', materiaPrima: 52293.43, zmExpress: 0, tercExpress: 902.48, correios: 579.19, eficiencia: 80.3 },
  { mes: 'Abr', materiaPrima: 32994.88, zmExpress: 0, tercExpress: 716.77, correios: 608.74, eficiencia: 23.9 },
  { mes: 'Mai', materiaPrima: 0, zmExpress: 0, tercExpress: 0, correios: 0, eficiencia: 0 },
  { mes: 'Jun', materiaPrima: 0, zmExpress: 0, tercExpress: 0, correios: 0, eficiencia: 0 },
  { mes: 'Jul', materiaPrima: 0, zmExpress: 0, tercExpress: 0, correios: 0, eficiencia: 0 },
  { mes: 'Ago', materiaPrima: 0, zmExpress: 0, tercExpress: 0, correios: 0, eficiencia: 0 },
  { mes: 'Set', materiaPrima: 0, zmExpress: 0, tercExpress: 0, correios: 0, eficiencia: 0 },
  { mes: 'Out', materiaPrima: 0, zmExpress: 0, tercExpress: 0, correios: 0, eficiencia: 0 },
  { mes: 'Nov', materiaPrima: 0, zmExpress: 0, tercExpress: 0, correios: 0, eficiencia: 0 },
  { mes: 'Dez', materiaPrima: 0, zmExpress: 0, tercExpress: 0, correios: 0, eficiencia: 0 },
];
export interface GestaoTop20Client {
  id: number;
  nome: string;
  cidade: string;
  cluster: 'Jundiaí' | 'RMC' | 'Interior Norte' | 'Sorocaba / ABC';
  history: { [year: string]: number };
  projection2026: number;
  projection2027: number;
  projection2028: number;
  relevancia: string;
  x?: number; // Relative position 0-100 for map
  y?: number; // Relative position 0-100 for map
}

export interface QuarterlyData {
  ano: number;
  trimestre: '1º' | '2º' | '3º' | '4º';
  faturamento: number;
}

export const initialQuarterlyHistory: QuarterlyData[] = [
  { ano: 2016, trimestre: '1º', faturamento: 120171.35 },
  { ano: 2016, trimestre: '2º', faturamento: 142906.77 },
  { ano: 2016, trimestre: '3º', faturamento: 179347.03 },
  { ano: 2016, trimestre: '4º', faturamento: 138063.12 },
  { ano: 2017, trimestre: '1º', faturamento: 152030.02 },
  { ano: 2017, trimestre: '2º', faturamento: 181938.58 },
  { ano: 2017, trimestre: '3º', faturamento: 149908.18 },
  { ano: 2017, trimestre: '4º', faturamento: 121512.90 },
  { ano: 2018, trimestre: '1º', faturamento: 207105.85 },
  { ano: 2018, trimestre: '2º', faturamento: 192972.52 },
  { ano: 2018, trimestre: '3º', faturamento: 229904.31 },
  { ano: 2018, trimestre: '4º', faturamento: 261515.01 },
  { ano: 2019, trimestre: '1º', faturamento: 292809.54 },
  { ano: 2019, trimestre: '2º', faturamento: 204647.42 },
  { ano: 2019, trimestre: '3º', faturamento: 250396.96 },
  { ano: 2019, trimestre: '4º', faturamento: 381367.25 },
  { ano: 2020, trimestre: '1º', faturamento: 218134.11 },
  { ano: 2020, trimestre: '2º', faturamento: 213727.76 },
  { ano: 2020, trimestre: '3º', faturamento: 252948.78 },
  { ano: 2020, trimestre: '4º', faturamento: 476035.45 },
  { ano: 2021, trimestre: '1º', faturamento: 323665.38 },
  { ano: 2021, trimestre: '2º', faturamento: 386758.99 },
  { ano: 2021, trimestre: '3º', faturamento: 298862.51 },
  { ano: 2021, trimestre: '4º', faturamento: 342904.43 },
  { ano: 2022, trimestre: '1º', faturamento: 327019.09 },
  { ano: 2022, trimestre: '2º', faturamento: 279195.69 },
  { ano: 2022, trimestre: '3º', faturamento: 320303.93 },
  { ano: 2022, trimestre: '4º', faturamento: 470833.99 },
  { ano: 2023, trimestre: '1º', faturamento: 442022.06 },
  { ano: 2023, trimestre: '2º', faturamento: 347108.01 },
  { ano: 2023, trimestre: '3º', faturamento: 320913.99 },
  { ano: 2023, trimestre: '4º', faturamento: 608536.07 },
  { ano: 2024, trimestre: '1º', faturamento: 596256.37 },
  { ano: 2024, trimestre: '2º', faturamento: 620042.41 },
  { ano: 2024, trimestre: '3º', faturamento: 414286.95 },
  { ano: 2024, trimestre: '4º', faturamento: 279317.85 },
  { ano: 2025, trimestre: '1º', faturamento: 312359.14 },
  { ano: 2025, trimestre: '2º', faturamento: 537460.30 },
  { ano: 2025, trimestre: '3º', faturamento: 516241.54 },
  { ano: 2025, trimestre: '4º', faturamento: 346878.64 },
  { ano: 2026, trimestre: '1º', faturamento: 0 },
  { ano: 2026, trimestre: '2º', faturamento: 0 },
  { ano: 2026, trimestre: '3º', faturamento: 0 },
  { ano: 2026, trimestre: '4º', faturamento: 0 },
];

export const initialGestaoTop20 = {
  indicadores: {
    meta_anual_2026: 2180000.00,
    custo_oportunidade_mensal: 471681.00,
    custo_operacional_fixo_2026: 150383.00,
  },
  clientes: [
    { 
      id: 479, 
      nome: 'FERTIPAR BANDEIRANTES LTDA', 
      cidade: 'Campo Limpo Paulista',
      cluster: 'Jundiaí',
      history: { 2022: 99953.23, 2023: 245829.52, 2024: 560605.23, 2025: 744746.13 }, 
      relevancia: 'EXPANSÃO',
      projection2026: 2167822.24,
      projection2027: 0,
      projection2028: 0,
      x: 67, y: 72
    },
    { 
      id: 218, 
      nome: 'TEX EQUIPAMENTOS ELETRONICOS', 
      cidade: 'Itupeva',
      cluster: 'Jundiaí',
      history: { 2022: 77266.86, 2023: 105537.45, 2024: 121464.39, 2025: 123224.88 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 638778.90,
      projection2027: 0,
      projection2028: 0,
      x: 61, y: 71
    },
    { 
      id: 5, 
      nome: 'MACCAFERRI DO BRASIL LTDA', 
      cidade: 'Jundiaí',
      cluster: 'Jundiaí',
      history: { 2022: 50161.64, 2023: 104303.31, 2024: 135998.77, 2025: 55117.22 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 1210300.65,
      projection2027: 0,
      projection2028: 0,
      x: 63, y: 70
    },
    { 
      id: 8, 
      nome: 'CONFIBRA INDUSTRIA', 
      cidade: 'Hortolândia',
      cluster: 'RMC',
      history: { 2022: 118144.88, 2023: 64626.48, 2024: 45509.27, 2025: 40630.38 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 599352.81,
      projection2027: 0,
      projection2028: 0,
      x: 56, y: 64
    },
    { 
      id: 260, 
      nome: 'PLASTEK DO BRASIL', 
      cidade: 'Indaiatuba',
      cluster: 'RMC',
      history: { 2022: 126478.62, 2023: 52269.78, 2024: 16275.25, 2025: 15426.86 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 473720.67,
      projection2027: 0,
      projection2028: 0,
      x: 54, y: 69
    },
    { 
      id: 977, 
      nome: 'FERTIPAR FILIAL PENAPOLIS', 
      cidade: 'Penápolis',
      cluster: 'Interior Norte',
      history: { 2022: 0.00, 2023: 283721.21, 2024: 108857.18, 2025: 39015.50 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 441525.39,
      projection2027: 0,
      projection2028: 0,
      x: 20, y: 40
    },
    { 
      id: 145, 
      nome: 'CJ DO BRASIL (ALIMENTICIOS)', 
      cidade: 'Piracicaba',
      cluster: 'Interior Norte',
      history: { 2022: 98068.89, 2023: 5400.00, 2024: 228112.41, 2025: 13353.50 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 453405.79,
      projection2027: 0,
      projection2028: 0,
      x: 45, y: 62
    },
    { 
      id: 182, 
      nome: 'AJINOMOTO DO BRASIL', 
      cidade: 'Valparaíso',
      cluster: 'Interior Norte',
      history: { 2022: 18479.00, 2023: 4129.38, 2024: 3270.18, 2025: 44257.40 }, 
      relevancia: 'RECUPERAÇÃO',
      projection2026: 346678.93,
      projection2027: 0,
      projection2028: 0,
      x: 15, y: 42
    },
    { 
      id: 18, 
      nome: 'IGARATIBA IND E COM', 
      cidade: 'Elias Fausto',
      cluster: 'RMC',
      history: { 2022: 37972.23, 2023: 51410.31, 2024: 55703.09, 2025: 27566.24 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 312897.03,
      projection2027: 0,
      projection2028: 0,
      x: 48, y: 66
    },
    { 
      id: 82, 
      nome: 'PACKDUQUE INDUSTRIA', 
      cidade: 'Valinhos',
      cluster: 'RMC',
      history: { 2022: 470.25, 2023: 9200.84, 2024: 11149.12, 2025: 1969.89 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 343033.40,
      projection2027: 0,
      projection2028: 0,
      x: 60, y: 65
    },
    { 
      id: 181, 
      nome: 'PLIMAX IND EMBALAGENS', 
      cidade: 'Itatiba',
      cluster: 'Jundiaí',
      history: { 2022: 19669.66, 2023: 21517.08, 2024: 21463.83, 2025: 8604.90 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 271637.82,
      projection2027: 0,
      projection2028: 0,
      x: 68, y: 66
    },
    { 
      id: 568, 
      nome: 'ITURRI COIMPAR', 
      cidade: 'Indaiatuba',
      cluster: 'RMC',
      history: { 2022: 70508.24, 2023: 76310.96, 2024: 306.00, 2025: 0.00 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 248035.81,
      projection2027: 0,
      projection2028: 0,
      x: 55, y: 70
    },
    { 
      id: 118, 
      nome: 'SIKA S.A .', 
      cidade: 'Itupeva',
      cluster: 'Jundiaí',
      history: { 2022: 15617.19, 2023: 4751.07, 2024: 12710.87, 2025: 44211.86 }, 
      relevancia: 'EXPANSÃO',
      projection2026: 226327.47,
      projection2027: 0,
      projection2028: 0,
      x: 60, y: 72
    },
    { 
      id: 322, 
      nome: 'CLARIOS ENERGY SOLUTIONS', 
      cidade: 'Sorocaba',
      cluster: 'Sorocaba / ABC',
      history: { 2022: 48064.32, 2023: 49474.53, 2024: 2564.36, 2025: 3244.35 }, 
      relevancia: 'ALERTA OCIOSIDADE',
      projection2026: 212938.25,
      projection2027: 0,
      projection2028: 0,
      x: 50, y: 78
    },
    { 
      id: 62, 
      nome: 'AQUAGEL REFRIGERACAO', 
      cidade: 'Campinas',
      cluster: 'RMC',
      history: { 2022: 68222.40, 2023: 108894.90, 2024: 82968.66, 2025: 73432.42 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 429145.18,
      projection2027: 0,
      projection2028: 0,
      x: 58, y: 63
    },
    { 
      id: 529, 
      nome: 'ELEKEIROZ S/A', 
      cidade: 'Varzea Paulista',
      cluster: 'Jundiaí',
      history: { 2022: 45817.57, 2023: 30596.01, 2024: 25631.10, 2025: 30112.49 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 194357.43,
      projection2027: 0,
      projection2028: 0,
      x: 65, y: 71
    },
    { 
      id: 146, 
      nome: 'USINA ACUCAREIRA ESTER SA', 
      cidade: 'Jundiaí',
      cluster: 'Jundiaí',
      history: { 2022: 190.58, 2023: 15021.69, 2024: 36961.76, 2025: 43178.71 }, 
      relevancia: 'EXPANSÃO',
      projection2026: 173640.88,
      projection2027: 0,
      projection2028: 0,
      x: 64, y: 69
    },
    { 
      id: 53, 
      nome: 'TOYO INK BRASIL LTDA', 
      cidade: 'Jundiaí',
      cluster: 'Jundiaí',
      history: { 2022: 16647.51, 2023: 13203.86, 2024: 22693.50, 2025: 1756.23 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 152347.97,
      projection2027: 0,
      projection2028: 0,
      x: 63, y: 68
    },
    { 
      id: 302, 
      nome: 'MACCAFERRI SKAPS', 
      cidade: 'Campinas',
      cluster: 'RMC',
      history: { 2022: 12078.71, 2023: 10790.86, 2024: 2691.48, 2025: 0.00 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 149037.68,
      projection2027: 0,
      projection2028: 0,
      x: 57, y: 62
    },
    { 
      id: 926, 
      nome: 'PAIS E FILHOS USINAGEM', 
      cidade: 'São Bernardo do Campo',
      cluster: 'Sorocaba / ABC',
      history: { 2022: 69096.26, 2023: 51720.59, 2024: 12736.42, 2025: 0.00 }, 
      relevancia: 'ALERTA RECUO',
      projection2026: 134043.27,
      projection2027: 0,
      projection2028: 0,
      x: 75, y: 82
    },
    { 
      id: 916, 
      nome: 'GLOBAL FLEX INDUSTRIA', 
      cidade: 'Cosmópolis',
      cluster: 'RMC',
      history: { 2022: 1160.30, 2023: 20910.00, 2024: 29022.50, 2025: 71597.55 }, 
      relevancia: 'EXPANSÃO',
      projection2026: 0,
      projection2027: 0,
      projection2028: 0,
      x: 50, y: 55
    },
  ]
};
