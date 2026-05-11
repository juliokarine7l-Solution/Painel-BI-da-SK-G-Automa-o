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
  regiao: 'JUNDIAÍ/VÁRZEA' | 'CAMPINAS/RMC' | 'ABC/SÃO PAULO' | 'INTERIOR/OUTROS';
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
      regiao: 'JUNDIAÍ/VÁRZEA',
      history: { 2022: 1998042, 2023: 1998042, 2024: 1998042, 2025: 1998042 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 2167822.24,
      projection2027: 0,
      projection2028: 0,
      x: 65, y: 75
    },
    { 
      id: 5, 
      nome: 'MACCAFERRI DO BRASIL LTDA', 
      cidade: 'Jundiaí',
      regiao: 'JUNDIAÍ/VÁRZEA',
      history: { 2022: 50161, 2023: 104303, 2024: 135998, 2025: 55117 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 1210300.65,
      projection2027: 0,
      projection2028: 0,
      x: 63, y: 73
    },
    { 
      id: 218, 
      nome: 'TEX EQUIPAMENTOS ELETRONICOS', 
      cidade: 'Itupeva',
      regiao: 'JUNDIAÍ/VÁRZEA',
      history: { 2022: 77266, 2023: 105537, 2024: 121464, 2025: 123224 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 638778.90,
      projection2027: 0,
      projection2028: 0,
      x: 60, y: 74
    },
    { 
      id: 8, 
      nome: 'CONFIBRA INDUSTRIA', 
      cidade: 'Hortolândia',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 118144, 2023: 64626, 2024: 45824, 2025: 40630 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 599352.81,
      projection2027: 0,
      projection2028: 0,
      x: 55, y: 65
    },
    { 
      id: 260, 
      nome: 'PLASTEK DO BRASIL', 
      cidade: 'Indaiatuba',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 126538, 2023: 52269, 2024: 16275, 2025: 15426 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 473720.67,
      projection2027: 0,
      projection2028: 0,
      x: 52, y: 68
    },
    { 
      id: 145, 
      nome: 'CJ DO BRASIL (ALIMENTICIOS)', 
      cidade: 'Piracicaba',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 98068, 2023: 5400, 2024: 228112, 2025: 13353 }, 
      relevancia: 'ALERTA OCIOSIDADE',
      projection2026: 453405.79,
      projection2027: 0,
      projection2028: 0,
      x: 45, y: 65
    },
    { 
      id: 977, 
      nome: 'FERTIPAR (FILIAL PENÁPOLIS)', 
      cidade: 'Penápolis',
      regiao: 'INTERIOR/OUTROS',
      history: { 2022: 0, 2023: 283721, 2024: 108857, 2025: 39015 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 441525.39,
      projection2027: 0,
      projection2028: 0,
      x: 20, y: 40
    },
    { 
      id: 62, 
      nome: 'AQUAGEL REFRIGERACAO', 
      cidade: 'Campinas',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 0, 2023: 108894, 2024: 82968, 2025: 74082 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 429145.18,
      projection2027: 0,
      projection2028: 0,
      x: 58, y: 62
    },
    { 
      id: 182, 
      nome: 'AJINOMOTO DO BRASIL', 
      cidade: 'Valparaíso',
      regiao: 'INTERIOR/OUTROS',
      history: { 2022: 19467, 2023: 42108, 2024: 55863, 2025: 44257 }, 
      relevancia: 'ALERTA OCIOSIDADE',
      projection2026: 346678.93,
      projection2027: 0,
      projection2028: 0,
      x: 15, y: 45
    },
    { 
      id: 82, 
      nome: 'PACKDUQUE INDUSTRIA', 
      cidade: 'Valinhos',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 343033.40,
      projection2027: 0,
      projection2028: 0,
      x: 60, y: 68
    },
    { 
      id: 18, 
      nome: 'IGARATIBA IND E COM', 
      cidade: 'Elias Fausto',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 38007, 2023: 51410, 2024: 55703, 2025: 27566 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 312897.03,
      projection2027: 0,
      projection2028: 0,
      x: 48, y: 70
    },
    { 
      id: 181, 
      nome: 'PLIMAX IND EMBALAGENS', 
      cidade: 'Itatiba',
      regiao: 'JUNDIAÍ/VÁRZEA',
      history: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 271637.82,
      projection2027: 0,
      projection2028: 0,
      x: 68, y: 65
    },
    { 
      id: 568, 
      nome: 'ITURRI COIMPAR', 
      cidade: 'Indaiatuba',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 71398, 2023: 76670, 2024: 0, 2025: 0 }, 
      relevancia: 'ALERTA OCIOSIDADE',
      projection2026: 248035.81,
      projection2027: 0,
      projection2028: 0,
      x: 51, y: 69
    },
    { 
      id: 118, 
      nome: 'SIKA S.A .', 
      cidade: 'Itupeva',
      regiao: 'JUNDIAÍ/VÁRZEA',
      history: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 226327.47,
      projection2027: 0,
      projection2028: 0,
      x: 59, y: 73
    },
    { 
      id: 322, 
      nome: 'CLARIOS ENERGY SOLUTIONS', 
      cidade: 'Sorocaba',
      regiao: 'INTERIOR/OUTROS',
      history: { 2022: 48064, 2023: 49474, 2024: 2599, 2025: 3244 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 212938.25,
      projection2027: 0,
      projection2028: 0,
      x: 45, y: 85
    },
    { 
      id: 529, 
      nome: 'ELEKEIROZ S/A', 
      cidade: 'Varzea Paulista',
      regiao: 'JUNDIAÍ/VÁRZEA',
      history: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 194357.43,
      projection2027: 0,
      projection2028: 0,
      x: 66, y: 76
    },
    { 
      id: 146, 
      nome: 'USINA ACUCAREIRA ESTER SA', 
      cidade: 'Jundiaí',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 }, 
      relevancia: 'ALERTA OCIOSIDADE',
      projection2026: 173640.88,
      projection2027: 0,
      projection2028: 0,
      x: 62, y: 72
    },
    { 
      id: 53, 
      nome: 'TOYO INK BRASIL LTDA', 
      cidade: 'Jundiaí',
      regiao: 'JUNDIAÍ/VÁRZEA',
      history: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 }, 
      relevancia: 'ESTABILIDADE',
      projection2026: 152347.97,
      projection2027: 0,
      projection2028: 0,
      x: 64, y: 72
    },
    { 
      id: 302, 
      nome: 'MACCAFERRI SKAPS', 
      cidade: 'Campinas',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 }, 
      relevancia: 'ALERTA OCIOSIDADE',
      projection2026: 149037.68,
      projection2027: 0,
      projection2028: 0,
      x: 57, y: 61
    },
    { 
      id: 926, 
      nome: 'PAIS E FILHOS USINAGEM', 
      cidade: 'São Bernardo do Campo',
      regiao: 'ABC/SÃO PAULO',
      history: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 }, 
      relevancia: 'ALERTA OCIOSIDADE',
      projection2026: 134043.27,
      projection2027: 0,
      projection2028: 0,
      x: 75, y: 88
    },
    { 
      id: 916, 
      nome: 'GLOBAL FLEX INDUSTRIA', 
      cidade: 'Cosmopolis',
      regiao: 'CAMPINAS/RMC',
      history: { 2022: 0, 2023: 0, 2024: 0, 2025: 0 }, 
      relevancia: 'ALERTA OCIOSIDADE',
      projection2026: 122725.00,
      projection2027: 0,
      projection2028: 0,
      x: 50, y: 55
    },
  ]
};
