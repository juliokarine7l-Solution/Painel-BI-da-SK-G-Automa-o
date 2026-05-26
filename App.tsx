// Update: Fix logic for status colors and Vercel sync (2026-05-15)
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { initialClients, initialMonthlyData, initialSalespersonData, initialCustosEficiencia, initialGestaoTop20, initialQuarterlyHistory, QuarterlyData, initialSalespeopleConfig } from './src/data';
import { ChartWrapper } from './components/ChartWrapper';
import { DatabaseManager } from './src/components/DatabaseManager';
import { GaugeChart } from './src/components/GaugeChart';

const formatBRL = (value: number): string => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value || 0);

const getClienteStatus = (c: any, currentYearBilling: number) => {
  const h = c.history || {};
  const historyArray = Object.values(h) as number[];
  const real2022 = historyArray[0] || h[2022] || 0;
  const real2023 = historyArray[1] || h[2023] || 0;
  const real2024 = historyArray[2] || h[2024] || 0;
  const real2025 = historyArray[3] || h[2025] || 0;
  
  const hArr = [real2022, real2023, real2024, real2025];
  const mediaValue = hArr.reduce((a, b) => a + b, 0) / 4;

  const current = currentYearBilling || 0;
  
  const isZero = current === 0;
  const isDeclining = (real2025 < real2024 && real2024 < real2023) || (real2025 < real2024 && real2025 < 5000) || (real2025 < mediaValue * 0.5);
  const isVeryLow = real2025 < 5000 && current < 5000;
  const growthRate = real2025 > 0 ? (current / real2025) - 1 : (current > 0 ? 1 : 0);

  if (isZero) {
    return { status: 'ALERTA OCIOSIDADE', colorText: 'text-red-500', colorBg: 'bg-red-950', colorBorder: 'border-red-900' };
  } else if (isDeclining && current < mediaValue * 0.8) {
    return { status: 'ALERTA RECUO', colorText: 'text-red-500', colorBg: 'bg-red-950', colorBorder: 'border-red-900' };
  } else if (isDeclining && current >= real2025 && current > 5000) {
    return { status: 'EM RECUPERAÇÃO', colorText: 'text-amber-400', colorBg: 'bg-amber-950', colorBorder: 'border-amber-900' };
  } else if (current < mediaValue * 0.7) {
    return { status: 'ALERTA OCIOSIDADE', colorText: 'text-red-500', colorBg: 'bg-red-950', colorBorder: 'border-red-900' };
  } else if (growthRate > 0.05 && current > mediaValue * 1.2 && current >= 100000) {
    return { status: 'TOP PERFORMANCE', colorText: 'text-blue-400', colorBg: 'bg-blue-950', colorBorder: 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' };
  } else if (growthRate > 0.05 && !isVeryLow) {
    return { status: 'EXPANSÃO', colorText: 'text-emerald-400', colorBg: 'bg-emerald-950', colorBorder: 'border-emerald-900' };
  } else if (Math.abs(growthRate) <= 0.15 && current >= 5000) {
    return { status: 'ESTABILIDADE', colorText: 'text-gray-400', colorBg: 'bg-gray-900', colorBorder: 'border-gray-800' };
  } else if (isVeryLow) {
    return { status: 'BAIXO VOLUME', colorText: 'text-gray-500', colorBg: 'bg-gray-900', colorBorder: 'border-gray-800' };
  }
  
  return { status: 'ESTABILIDADE', colorText: 'text-emerald-400', colorBg: 'bg-emerald-950', colorBorder: 'border-emerald-900' };
};

export const metaMensal = [
  { month: 'Jan', meta: 136250.00, r2026: 74919.58, r2027: 0, r2028: 0 },
  { month: 'Fev', meta: 154416.67, r2026: 128909.00, r2027: 0, r2028: 0 },
  { month: 'Mar', meta: 163500.00, r2026: 66982.35, r2027: 0, r2028: 0 },
  { month: 'Abr', meta: 172583.33, r2026: 143492.89, r2027: 0, r2028: 0 },
  { month: 'Mai', meta: 172583.33, r2026: 131965.14, r2027: 0, r2028: 0 },
  { month: 'Jun', meta: 163500.00, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Jul', meta: 190750.00, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Ago', meta: 199833.33, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Set', meta: 208916.67, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Out', meta: 218000.00, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Nov', meta: 227083.33, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Dez', meta: 172583.34, r2026: 0, r2027: 0, r2028: 0 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('FATURAMENTO E CUSTOS');
  const [metas, setMetas] = useState(() => JSON.parse(localStorage.getItem('skg-metas') || JSON.stringify(metaMensal)));
  const [vendedoresConfig, setVendedoresConfig] = useState(() => JSON.parse(localStorage.getItem('skg-vendedores-config') || JSON.stringify(initialSalespeopleConfig)));
  const [vendedorData, setVendedorData] = useState(() => JSON.parse(localStorage.getItem('skg-vendedores') || JSON.stringify(initialSalespersonData['2026'])));
  const [quarterlyHistory, setQuarterlyHistory] = useState<QuarterlyData[]>(() => JSON.parse(localStorage.getItem('skg-quarterly') || JSON.stringify(initialQuarterlyHistory)));
  const [custos, setCustos] = useState(() => JSON.parse(localStorage.getItem('skg-custos') || JSON.stringify(initialCustosEficiencia)));
  const [gestaoTop20, setGestaoTop20] = useState(() => {
    const saved = localStorage.getItem('skg-gestao-top20');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.clientes && parsed.clientes.length > 0 && parsed.clientes[0].history) {
          return parsed;
        }
      } catch (e) {
        console.error("Erro ao carregar Gestão Top 20", e);
      }
    }
    return initialGestaoTop20;
  });
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedClientT10, setSelectedClientT10] = useState('Consolidado T10');
  const [selectedQuarterAnalysis, setSelectedQuarterAnalysis] = useState('1º');

  // Migrate to exact 2026 meta goal and custos structure
  useEffect(() => {
     setMetas((prev: typeof metaMensal) => {
         const currentTotal = prev.reduce((acc, m) => acc + m.meta, 0);
         if (currentTotal !== 2180000) {
             return prev.map((m, idx) => ({ ...m, meta: metaMensal[idx]?.meta || m.meta }));
         }
         return prev;
     });
     
     setCustos((prev: any[]) => {
         if (prev && prev.length > 0 && ('eficiencia' in prev[0] || !('metaCamozzi' in prev[0]))) {
             return initialCustosEficiencia.map((initItem, idx) => {
                 const prevItem = prev[idx] || {};
                 // Keep the newly requested materia prima inputs from initialCustosEficiencia but users could have edited the other fields
                 return { ...initItem, faturamento: prevItem.faturamento || initItem.faturamento, zmExpress: prevItem.zmExpress || 0, tercExpress: prevItem.tercExpress || 0, correios: prevItem.correios || 0 };
             });
         }
         return prev;
     });
  }, []);

  useEffect(() => {
     setCustos((prev: any[]) => {
         let changed = false;
         const next = prev.map((c, idx) => {
             const m = metas[idx];
             if (m && c.faturamento !== m.r2026) {
                 changed = true;
                 return { ...c, faturamento: m.r2026 };
             }
             return c;
         });
         return changed ? next : prev;
     });
  }, [metas]);

  const totalBilling2026 = useMemo(() => metas.reduce((acc: any, m: any) => acc + m.r2026, 0), [metas]);
  const metaAno = useMemo(() => metas.reduce((acc: any, m: any) => acc + m.meta, 0), [metas]);
  const atingimento = useMemo(() => (metaAno > 0 ? (totalBilling2026 / metaAno) * 100 : 0), [totalBilling2026, metaAno]);
  
  // Migration: Reset local data if stale or incorrect

  const metaAnualCamozzi = useMemo(() => custos.reduce((acc: any, m: any) => acc + m.metaCamozzi, 0), [custos]);
  const custoTotalCamozzi = useMemo(() => custos.reduce((acc: any, m: any) => acc + m.materiaPrima, 0), [custos]);
  const custoTotalOutros = useMemo(() => custos.reduce((acc: any, m: any) => acc + (m.zmExpress + m.tercExpress + m.correios), 0), [custos]);
  const percCamozziGlobal = metaAnualCamozzi > 0 ? (custoTotalCamozzi / metaAnualCamozzi) * 100 : 0;
  
  const quarterlySummaries = useMemo(() => {
    const byYear: Record<string, number> = {};
    quarterlyHistory.forEach(d => {
      if (!byYear[d.ano]) byYear[d.ano] = 0;
      byYear[d.ano] += d.faturamento;
    });
    return Object.entries(byYear).map(([year, total]) => ({ year, total }));
  }, [quarterlyHistory]);

  const quarterlyDistribution = useMemo(() => {
     const dist: Record<string, number> = { '1º': 0, '2º': 0, '3º': 0, '4º': 0 };
     quarterlyHistory.forEach(d => {
       dist[d.trimestre] += d.faturamento;
     });
     return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [quarterlyHistory]);

  const handleSave = () => {
    localStorage.setItem('skg-metas', JSON.stringify(metas));
    localStorage.setItem('skg-vendedores-config', JSON.stringify(vendedoresConfig));
    localStorage.setItem('skg-vendedores', JSON.stringify(vendedorData));
    localStorage.setItem('skg-quarterly', JSON.stringify(quarterlyHistory));
    localStorage.setItem('skg-custos', JSON.stringify(custos));
    localStorage.setItem('skg-gestao-top20', JSON.stringify(gestaoTop20));
    alert('Dados salvos com sucesso!');
  };

  // Sync 2026 Quarterly data from Monthly Billing
  useEffect(() => {
    const q1 = (metas[0]?.r2026 || 0) + (metas[1]?.r2026 || 0) + (metas[2]?.r2026 || 0);
    const q2 = (metas[3]?.r2026 || 0) + (metas[4]?.r2026 || 0) + (metas[5]?.r2026 || 0);
    const q3 = (metas[6]?.r2026 || 0) + (metas[7]?.r2026 || 0) + (metas[8]?.r2026 || 0);
    const q4 = (metas[9]?.r2026 || 0) + (metas[10]?.r2026 || 0) + (metas[11]?.r2026 || 0);

    setQuarterlyHistory(prev => {
      let changed = false;
      const next = prev.map(d => {
        if (d.ano === 2026) {
          let newVal = 0;
          if (d.trimestre === '1º') newVal = q1;
          else if (d.trimestre === '2º') newVal = q2;
          else if (d.trimestre === '3º') newVal = q3;
          else if (d.trimestre === '4º') newVal = q4;
          
          if (d.faturamento !== newVal) {
            changed = true;
            return { ...d, faturamento: newVal };
          }
        }
        return d;
      });
      return changed ? next : prev;
    });
  }, [metas]);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans p-2">
      <header className="bg-gradient-to-r from-red-600 to-red-800 p-4 rounded-lg mb-6 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/Ky5zDy2.png" alt="Logo" className="h-10 bg-white p-1 rounded" />
          <h1 className="text-xl font-black italic">SK-G INDUSTRIAL INTELLIGENCE</h1>
        </div>
        <div className="flex gap-2 items-center">
          {['FATURAMENTO E CUSTOS', 'VENDEDORES', 'DASHBOARD T10', 'GESTÃO TOP 20', 'ANÁLISE TRIMESTRAL', 'BANCO DE DADOS (PLANILHAS)'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-bold rounded ${activeTab === tab ? 'bg-white text-red-700' : 'bg-red-900/50 text-white hover:bg-red-900'}`}>{tab}</button>
          ))}
          {(() => {
            const availableYears = Object.keys(metas[0] || {})
               .filter(k => k.startsWith('r20'))
               .map(k => k.replace('r', ''));
            
            return (
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-red-900 text-white font-bold p-2 rounded">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            );
          })()}
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2">💾 SALVAR LANÇAMENTOS</button>
        </div>
      </header>

      {activeTab === 'FATURAMENTO E CUSTOS' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <section className="grid grid-cols-5 gap-4">
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Meta Anual Camozzi</p>
                <p className="text-xl font-black mt-2 text-emerald-400">{formatBRL(metaAnualCamozzi)}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Faturamento Total</p>
                <p className="text-xl font-black mt-2 text-emerald-400">{formatBRL(metas.reduce((a,c) => a + c.r2026, 0))}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Custo Total Geral</p>
                <p className="text-xl font-black mt-2 text-amber-500">{formatBRL(custos.reduce((a,c) => a + c.materiaPrima + c.zmExpress + c.tercExpress + c.correios, 0))}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Custo Camozzi</p>
                <p className="text-xl font-black mt-2 text-red-500">{formatBRL(custoTotalCamozzi)}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Custos Logísticos</p>
                <p className="text-xl font-black mt-2 text-red-400">{formatBRL(custoTotalOutros)}</p>
              </div>
           </section>

           <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-emerald-400 font-bold italic mb-6">FATURAMENTO VS META</h2>
                <ChartWrapper height={350}>
                    <ComposedChart data={metas}>
                        <CartesianGrid stroke="#374151" strokeDasharray="3 3"/>
                        <XAxis dataKey="month" stroke="#9ca3af"/>
                        <YAxis tickFormatter={v => formatBRL(v)} stroke="#9ca3af" width={100} />
                        <Tooltip formatter={(v: number) => formatBRL(v)} />
                        <Bar dataKey="r2026" fill="#10b981" name="Realizado 2026" />
                        <Line dataKey="meta" stroke="#374151" strokeWidth={3} name="Meta" />
                    </ComposedChart>
                </ChartWrapper>
              </section>
              
              <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800 flex flex-col justify-center">
                <h2 className="text-amber-400 font-bold italic mb-6 uppercase tracking-wider text-center">
                  ATINGIMENTO META CAMOZZI
                </h2>
                <div className="flex-1 min-h-[300px] flex items-center justify-center">
                   <GaugeChart value={percCamozziGlobal} />
                </div>
              </section>
           </section>

           <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-red-400 font-bold italic mb-6 uppercase tracking-wider flex justify-between items-center">
                  <span>CAMOZZI VS LOGÍSTICA</span>
                </h2>
                <ChartWrapper height={350}>
                  <ComposedChart data={custos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="mes" stroke="#aaa" />
                    <YAxis tickFormatter={v => `R$${v/1000}k`} stroke="#aaa" fontSize={10} />
                    <Tooltip contentStyle={{backgroundColor: '#000'}} labelStyle={{color: '#fff'}} formatter={(v: number) => formatBRL(v)} />
                    <Bar dataKey="materiaPrima" fill="#3b82f6" name="Matéria-Prima (Camozzi)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={(d: any) => d.zmExpress + d.tercExpress + d.correios} fill="#ef4444" name="Logística Total" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ChartWrapper>
              </section>

             <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-red-500 font-bold italic mb-6 uppercase tracking-wider flex justify-between items-center text-sm">
                  <span>PESO LOGÍSTICO (% FATURAMENTO)</span>
                  <span className="text-[10px] text-gray-500 font-mono font-normal">Eficiência em Tempo Real</span>
                </h2>
                <ChartWrapper height={320}>
                  <ComposedChart data={custos.map((c: any, idx: number) => ({ 
                    mes: c.mes, 
                    perc: (c.faturamento > 0) ? (((c.zmExpress + c.tercExpress + c.correios) / c.faturamento) * 100) : 0 
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="mes" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} domain={[0, 'auto']} tickFormatter={v => `${v.toFixed(1)}%`} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }} />
                    <Bar dataKey="perc" fill="#ef4444" name="Peso Logístico" radius={[2, 2, 0, 0]} />
                    <Line type="monotone" dataKey="perc" stroke="#fff" strokeWidth={1} dot={{ r: 2 }} />
                  </ComposedChart>
                </ChartWrapper>
                <div className="mt-4 flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                     <span className="text-[9px] text-gray-500 font-bold">ALVO DE EFICIÊNCIA</span>
                     <span className="text-[9px] text-emerald-500 font-black tracking-widest">&lt; 5.0%</span>
                   </div>
                   <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '50%' }}></div>
                   </div>
                </div>
             </div>
           </section>

           <section className="grid grid-cols-1 gap-8">
             <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-amber-400 font-bold italic mb-6 uppercase tracking-wider flex justify-between items-center text-sm">
                  <span>COMPOSIÇÃO E TRENDS DE CUSTOS LOGÍSTICOS</span>
                  <span className="text-[10px] text-gray-500 font-mono font-normal">Análise p/ Modal de Entrega</span>
                </h2>
                <ChartWrapper height={350}>
                  <AreaChart data={custos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="mes" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={10} width={60} tickFormatter={v => formatBRL(v).split(',')[0]} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                    <Area type="monotone" dataKey="zmExpress" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="ZM Express" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="tercExpress" stackId="1" stroke="#ef4444" fill="#ef4444" name="Terc. Express" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="correios" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Correios" fillOpacity={0.6} />
                  </AreaChart>
                </ChartWrapper>
             </div>
           </section>


        </div>
      )}

      {activeTab === 'VENDEDORES' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           {/* Section 1: Visual Performance Cards */}
           <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {(() => {
                const salespeople = vendedoresConfig;

                const totalMetaEmpresa = salespeople.reduce((acc: any, s: any) => acc + s.meta, 0);

                return salespeople.map((s: any) => {
                  const totalRealizado = vendedorData.reduce((acc: number, m: any) => acc + (m[s.id] || 0), 0);
                  const percAtingimento = s.meta > 0 ? (totalRealizado / s.meta) * 100 : 0;
                  
                  // Monthly chart data
                  const chartData = vendedorData.map((m: any, idx: number) => {
                    const share = s.meta / totalMetaEmpresa;
                    const monthlyTarget = metaMensal[idx]?.meta * share;
                    return {
                      month: m.month,
                      real: m[s.id] || 0,
                      target: monthlyTarget
                    };
                  });

                  return (
                    <div key={s.id} className="bg-[#0f1218] p-6 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col group">
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-white font-black italic text-base uppercase tracking-tighter">{s.label}</h3>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Análise Mensal de Performance</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black italic" style={{ color: s.color }}>{percAtingimento.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Sparkline/Area Chart */}
                      <div className="flex-1 h-44 -mx-6">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={s.color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                              labelStyle={{ display: 'none' }}
                              formatter={(v: number) => formatBRL(v)}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="real" 
                              stroke={s.color} 
                              strokeWidth={3} 
                              fillOpacity={1} 
                              fill={`url(#grad-${s.id})`} 
                              isAnimationActive={true}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="target" 
                              stroke="#374151" 
                              strokeWidth={2} 
                              strokeDasharray="5 5" 
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bottom KPI Boxes */}
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-[#161b22] px-4 py-3 rounded-xl border border-gray-800">
                          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Realizado</p>
                          <p className="text-sm font-black text-white font-mono">{formatBRL(totalRealizado)}</p>
                        </div>
                        <div className="bg-[#161b22] px-4 py-3 rounded-xl border border-gray-800">
                          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Meta Anual</p>
                          <p className="text-sm font-black text-white font-mono">{formatBRL(s.meta)}</p>
                        </div>
                      </div>
                      
                      {/* Progress Bar under total */}
                      <div className="mt-4 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(percAtingimento, 100)}%`, backgroundColor: s.color }}></div>
                      </div>
                    </div>
                  );
                });
             })()}
           </section>


        </div>
      )}

      {activeTab === 'DASHBOARD T10' && (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
          {(() => {
            const t10Clients = gestaoTop20.clientes.slice(0, 10);
            
            // Evolution Chart Data
            const evolutionDataT10 = [2022, 2023, 2024, 2025, 2026, 2027, 2028].map(year => {
              let value = 0;
              if (selectedClientT10 === 'Consolidado T10') {
                value = t10Clients.reduce((acc: number, c: any) => {
                  if (year <= 2025) return acc + (c.history[year] || 0);
                  return acc + (c[`projection${year}`] || 0);
                }, 0);
              } else {
                const c = t10Clients.find((cli: any) => cli.nome === selectedClientT10);
                if (c) {
                  if (year <= 2025) value = c.history[year] || 0;
                  else value = c[`projection${year}`] || 0;
                }
              }
              return { year: String(year), total: value };
            });

            // YoY comparing Current Year to Previous Year
            const currentVal = evolutionDataT10.find(y => y.year === selectedYear)?.total || 0;
            const prevVal = evolutionDataT10.find(y => y.year === String(Number(selectedYear) - 1))?.total || 0;
            const yoyGrowth = prevVal > 0 ? ((currentVal / prevVal) - 1) * 100 : 0;
            const isNegative = yoyGrowth < 0;

            // Ranking and ABC Analysis for T10
            const t10Ranking = [...t10Clients].map((c: any) => ({
                name: c.nome,
                shortName: c.nome.split(' ').slice(0, 2).join(' '),
                value: c[`projection${selectedYear}`] || c.history?.[selectedYear] || 0,
                prevValue: c.history?.[Number(selectedYear)-1] || 0
            })).sort((a, b) => b.value - a.value);

            const totalT10 = t10Ranking.reduce((acc, c) => acc + c.value, 0);
            let acum = 0;
            const curvaABC = t10Ranking.map(c => {
                acum += c.value;
                const perc = (acum / totalT10) * 100;
                let classe = 'C';
                if (perc <= 70) classe = 'A';
                else if (perc <= 90) classe = 'B';
                return { ...c, classe, perc };
            });

            return (
              <>
                <section className="bg-[#0a0c10] p-8 rounded-3xl border border-gray-800 shadow-2xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                      <h2 className="text-white font-black italic text-3xl uppercase tracking-tighter">DASHBOARD EVOLUTIVO T10</h2>
                      <p className="text-xs text-gray-500 mt-1 uppercase font-bold italic tracking-widest">Inteligência 360° - Análise de Comportamento e Ciclo de Vida</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <select 
                        value={selectedClientT10} 
                        onChange={(e) => setSelectedClientT10(e.target.value)}
                        className="bg-gray-950 text-white font-bold p-3 rounded-xl border border-gray-700 outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="Consolidado T10">Consolidado T10 (Total)</option>
                        {t10Clients.map((c: any) => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))}
                      </select>
                      
                      <div className="bg-gray-950 p-3 px-6 rounded-xl border border-gray-800 flex flex-col items-end">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Status {selectedYear}</p>
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${isNegative ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                          <span className={`font-black text-lg ${isNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                            {isNegative ? 'ALERTA (CHURN)' : 'SAUDÁVEL'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* The "ASCII" and Chart Area */}
                    <div className="lg:col-span-3 bg-gray-950/50 p-6 rounded-2xl border border-gray-800 relative">
                      <ChartWrapper height={400}>
                         <ComposedChart data={evolutionDataT10}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                           <XAxis dataKey="year" stroke="#444" fontSize={12} tick={{ fill: '#666', fontWeight: 'bold' }} />
                           <YAxis stroke="#444" fontSize={10} width={80} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                           <Tooltip 
                              contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                              formatter={(v: number) => formatBRL(v)}
                           />
                           <Area type="monotone" dataKey="total" fill={isNegative ? '#ef4444' : '#10b981'} stroke={isNegative ? '#ef4444' : '#10b981'} fillOpacity={0.1} strokeWidth={4} />
                           <Bar dataKey="total" fill={isNegative ? '#ef4444' : '#10b981'} radius={[4, 4, 0, 0]} opacity={0.3} barSize={40} />
                           <Line type="monotone" dataKey="total" stroke="#fff" strokeWidth={2} dot={{ r: 6, fill: isNegative ? '#ef4444' : '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                         </ComposedChart>
                      </ChartWrapper>
                    </div>

                    {/* Trend Analysis Side Panel */}
                    <div className={`bg-gray-900/50 p-6 rounded-2xl border border-gray-800 border-l-4 ${isNegative ? 'border-l-red-600' : 'border-l-emerald-600'} flex flex-col`}>
                      <h3 className="text-white font-black italic text-sm mb-6 uppercase">Mentoria de Negociação</h3>
                      <div className="flex-1 space-y-4">
                        <div className={`p-4 border rounded-xl ${isNegative ? 'bg-red-950/20 border-red-900/50' : 'bg-emerald-950/20 border-emerald-900/50'}`}>
                          <p className={`text-[10px] font-black uppercase ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>Desempenho YoY ({selectedYear})</p>
                          <p className="text-2xl font-black text-white mt-1">{yoyGrowth > 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%</p>
                          <p className="text-xs text-gray-400 mt-2">
                             Anterior: {formatBRL(prevVal)} <br/>
                             Atual: {formatBRL(currentVal)}
                          </p>
                        </div>
                        
                        <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl">
                          <p className={`text-[10px] font-black uppercase ${isNegative ? 'text-amber-400' : 'text-blue-400'}`}>Ação Recomendada (Gatilho)</p>
                          <p className="text-xs text-gray-400 mt-2 italic leading-relaxed">
                            {isNegative 
                              ? `"Alerta de Ociosidade: Acione o Follow-up Técnico urgentemente. Use Spin Selling focando nos custos de inércia e agende reunião."`
                              : `"Saúde estendida. Momento ideal para Cross-sell e expansão de novos produtos para a planta do cliente."`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Ranking e Curva ABC */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                   <div className="bg-[#0a0c10] p-6 rounded-3xl border border-gray-800 shadow-xl">
                     <h2 className="text-white font-bold italic text-sm uppercase tracking-widest text-emerald-100 mb-6 border-b border-gray-800 pb-2">Ranking Atual: Top 10 Clientes ({selectedYear})</h2>
                     <ChartWrapper height={350}>
                        <BarChart data={t10Ranking} layout="vertical" margin={{ left: 80, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                          <XAxis type="number" stroke="#444" fontSize={10} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="shortName" stroke="#9ca3af" fontSize={10} interval={0} width={80} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                            formatter={(v: number) => formatBRL(v)}
                          />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                     </ChartWrapper>
                   </div>
                   
                   <div className="bg-[#0a0c10] p-6 rounded-3xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
                     <h2 className="text-white font-bold italic text-sm uppercase tracking-widest text-amber-100 mb-6 border-b border-gray-800 pb-2">Análise de Segmentação: Curva ABC (T10)</h2>
                     <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-300">
                           <thead className="bg-gray-950 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                              <tr>
                                 <th className="px-4 py-3">Cliente</th>
                                 <th className="px-4 py-3 text-right">Faturamento</th>
                                 <th className="px-4 py-3 text-right">Acumulado</th>
                                 <th className="px-4 py-3 text-center">Classe</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-800">
                              {curvaABC.map((c, idx) => (
                                <tr key={idx} className="hover:bg-gray-800/30">
                                   <td className="px-4 py-3 font-bold text-xs">{c.name}</td>
                                   <td className="px-4 py-3 text-right font-mono text-emerald-400 text-xs">{formatBRL(c.value)}</td>
                                   <td className="px-4 py-3 text-right font-mono text-xs">{c.perc.toFixed(1)}%</td>
                                   <td className="px-4 py-3 text-center">
                                      <span className={`px-2 py-1 rounded text-[10px] font-black 
                                        ${c.classe === 'A' ? 'bg-emerald-950 text-emerald-500 border border-emerald-900' : 
                                          c.classe === 'B' ? 'bg-amber-950 text-amber-500 border border-amber-900' : 
                                          'bg-gray-800 text-gray-400 border border-gray-700'}`}
                                      >
                                        CLASSE {c.classe}
                                      </span>
                                   </td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                   </div>
                </section>
              </>
            );
          })()}
        </div>
      )}

      {activeTab === 'ANÁLISE TRIMESTRAL' && (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
           {(() => {
               // --- 1. ESTRUTURA DE DADOS & CÁLCULOS HISTÓRICOS ---
               // Historical years (<= 2025)
               const paramHistYears = [2022, 2023, 2024, 2025];
               let sumHistTotal = 0;
               const sumHistQ: Record<string, number> = { '1º': 0, '2º': 0, '3º': 0, '4º': 0 };
               
               quarterlyHistory.forEach(d => {
                   if (paramHistYears.includes(d.ano)) {
                       sumHistTotal += d.faturamento;
                       if (sumHistQ[d.trimestre] !== undefined) sumHistQ[d.trimestre] += d.faturamento;
                   }
               });
               
               // Sazonalidade Histórica (Shares)
               const sharesQ = { 
                   '1º': sumHistQ['1º'] / sumHistTotal,
                   '2º': sumHistQ['2º'] / sumHistTotal,
                   '3º': sumHistQ['3º'] / sumHistTotal,
                   '4º': sumHistQ['4º'] / sumHistTotal
               };

               const avgHistQ = {
                   '1º': sumHistQ['1º'] / paramHistYears.length,
                   '2º': sumHistQ['2º'] / paramHistYears.length,
                   '3º': sumHistQ['3º'] / paramHistYears.length,
                   '4º': sumHistQ['4º'] / paramHistYears.length
               };

               // --- 2. CÁLCULO DE PROJEÇÃO DE FECHAMENTO (2026) ---
               const currentYear = parseInt(selectedYear); // Normally 2026
               const qDataCurrent = quarterlyHistory.filter(d => d.ano === currentYear);
               
               let sumCurrentYearFilled = 0;
               let combinedShareOfFilled = 0;

               const filledStatus: Record<string, boolean> = {};

               const projectionQ: Record<string, number> = { '1º': 0, '2º': 0, '3º': 0, '4º': 0 };

               qDataCurrent.forEach(d => {
                   if (d.faturamento > 0) {
                       sumCurrentYearFilled += d.faturamento;
                       combinedShareOfFilled += sharesQ[d.trimestre as '1º' | '2º' | '3º' | '4º'];
                       filledStatus[d.trimestre] = true;
                   }
               });

               // Se já tem pelo menos um preenchido, projeta o fim de ano
               const projectedTotalCurrentYear = combinedShareOfFilled > 0 ? (sumCurrentYearFilled / combinedShareOfFilled) : 0;

               ['1º', '2º', '3º', '4º'].forEach(qStr => {
                   const q = qStr as '1º' | '2º' | '3º' | '4º';
                   if (filledStatus[q]) {
                       projectionQ[q] = qDataCurrent.find(d => d.trimestre === q)?.faturamento || 0;
                   } else {
                       projectionQ[q] = projectedTotalCurrentYear * sharesQ[q];
                   }
               });

               // --- 3. STATUS YOY & FAROL (Meta vs Realizado) ---
               // Faturamento Histórico vs Atual (Selected Quarter)
               const chartDataSelectedQ = quarterlyHistory
                   .filter(d => d.trimestre === selectedQuarterAnalysis && d.ano >= 2022 && d.ano <= currentYear)
                   .map(d => ({
                       year: String(d.ano),
                       realizado: d.faturamento,
                       metaHistorica: avgHistQ[selectedQuarterAnalysis as '1º' | '2º' | '3º' | '4º']
                   }));
                   
               // For the filled current quarter, see how it compares to last year same quarter
               const curQData = quarterlyHistory.find(d => d.ano === currentYear && d.trimestre === selectedQuarterAnalysis)?.faturamento || 0;
               const prevQData = quarterlyHistory.find(d => d.ano === (currentYear - 1) && d.trimestre === selectedQuarterAnalysis)?.faturamento || 0;
               
               const yoyQGrowth = prevQData > 0 ? ((curQData / prevQData) - 1) * 100 : 0;
               const isQNegative = curQData > 0 && yoyQGrowth < 0;

               // --- 4. DESIGN --- 
               // Distribution Data
               const dataProjDist = [
                   { name: '1º Trimestre', real: filledStatus['1º'] ? projectionQ['1º'] : 0, proj: !filledStatus['1º'] ? projectionQ['1º'] : 0 },
                   { name: '2º Trimestre', real: filledStatus['2º'] ? projectionQ['2º'] : 0, proj: !filledStatus['2º'] ? projectionQ['2º'] : 0 },
                   { name: '3º Trimestre', real: filledStatus['3º'] ? projectionQ['3º'] : 0, proj: !filledStatus['3º'] ? projectionQ['3º'] : 0 },
                   { name: '4º Trimestre', real: filledStatus['4º'] ? projectionQ['4º'] : 0, proj: !filledStatus['4º'] ? projectionQ['4º'] : 0 }
               ];

               // Status Color
               const currentGoal = metaAno; 
               const isYearNegative = projectedTotalCurrentYear < currentGoal;

               return (
                  <>
                     <section className="bg-[#0a0c10] p-8 rounded-3xl border border-gray-800 shadow-2xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-gray-800 pb-6">
                           <div>
                              <h2 className="text-white font-black italic text-3xl uppercase tracking-tighter">Sazonalidade e Projeção ({currentYear})</h2>
                              <p className="text-xs text-gray-500 mt-1 uppercase font-bold italic tracking-widest">Base de Estudo: Histórico vs Alvo de Recuperação</p>
                           </div>
                           <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex items-center gap-6">
                               <div className="flex flex-col items-end">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 drop-shadow">Previsão Fechamento ({currentYear})</p>
                                  <p className={`text-2xl font-black font-mono ${isYearNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {formatBRL(projectedTotalCurrentYear)}
                                  </p>
                               </div>
                               <div className="w-px h-10 bg-gray-800"></div>
                               <div className="flex flex-col items-end">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 drop-shadow">Status Projeção vs Meta</p>
                                  <div className="flex items-center gap-2">
                                     <span className={`w-3 h-3 rounded-full ${isYearNegative ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                     <span className={`font-black text-sm uppercase ${isYearNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                                       {isYearNegative ? 'DÉFICIT (RISCO)' : 'METAS NO RADAR'}
                                     </span>
                                  </div>
                               </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                           {/* Year Overall Seasonality Analysis */}
                           <div className="lg:col-span-3 bg-gray-950/50 p-6 rounded-2xl border border-gray-800">
                               <h3 className="text-white font-black italic mb-6 text-sm uppercase text-gray-400">Curva de Viabilidade (Real vs Projetado)</h3>
                               <ChartWrapper height={350}>
                                  <BarChart data={dataProjDist}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                      <XAxis dataKey="name" stroke="#666" fontSize={11} tick={{ fill: '#888', fontWeight: 'bold' }} />
                                      <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} stroke="#444" fontSize={10} width={80} />
                                      <Tooltip 
                                          contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                          formatter={(v: number) => formatBRL(v)}
                                      />
                                      <Bar dataKey="real" name="Faturamento Realizado (Lançado)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                      <Bar dataKey="proj" name="Projeção IA Sazonal" fill="#ef4444" opacity={0.6} radius={[4, 4, 0, 0]} barSize={40} />
                                  </BarChart>
                               </ChartWrapper>
                           </div>

                           <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 flex flex-col">
                              <h3 className="text-white font-black italic mb-6 text-[10px] tracking-widest uppercase text-gray-500 border-b border-gray-800 pb-2">Diagnóstico de Crescimento</h3>
                              <div className="space-y-4">
                                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                                     <p className="text-[10px] text-gray-500 font-bold uppercase italic">Meta {currentYear}</p>
                                     <p className="text-sm font-black text-white mt-1">{formatBRL(currentGoal)}</p>
                                  </div>
                                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                                     <p className="text-[10px] text-gray-500 font-bold uppercase italic">GAP (Déficit Anual a Recuperar)</p>
                                     <p className="text-sm font-black text-red-500 mt-1">{formatBRL(Math.max(0, currentGoal - projectedTotalCurrentYear))}</p>
                                  </div>
                                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                                     <p className="text-[10px] text-gray-500 font-bold uppercase italic">Validação do Semestre (Até Junho)</p>
                                     {(() => {
                                         const metaSemestre = metas.slice(0, 6).reduce((acc: any, m: any) => acc + m.meta, 0);
                                         const realizadoSemestre = metas.slice(0, 6).reduce((acc: any, m: any) => acc + m.r2026, 0);
                                         const isSemestreNegative = realizadoSemestre < metaSemestre;
                                         return (
                                            <>
                                               <p className="text-xs text-gray-400 mt-1">44,17% da Meta: <span className="font-mono text-white">{formatBRL(metaSemestre)}</span></p>
                                               <p className="text-xs text-gray-400">Realizado H1: <span className="font-mono text-white">{formatBRL(realizadoSemestre)}</span></p>
                                               <p className={`text-sm font-black mt-1 ${isSemestreNegative ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                  Déficit Semestral: {formatBRL(Math.max(0, metaSemestre - realizadoSemestre))}
                                               </p>
                                            </>
                                         );
                                     })()}
                                  </div>
                                  <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl mt-4 border-l-4 border-l-red-500">
                                     <p className="text-[9px] text-emerald-400 font-black uppercase mb-2">💡 O que a IA aponta?</p>
                                     <p className="text-[11px] text-gray-400 leading-relaxed italic">
                                        Historicamente, seus trimestres preenchidos ({Object.keys(filledStatus).join(', ')}) costumavam garantir {(combinedShareOfFilled * 100).toFixed(1)}% de fechamento anual. Mantendo o ritmo atual, o ano fechará R$ {(currentGoal - projectedTotalCurrentYear > 0 ? (currentGoal - projectedTotalCurrentYear) / 1000 : 0).toFixed(0)}k abaixo da meta. Junho é um ponto estratégico e sinaliza alerta sobre o fechamento do 1º Semestre.
                                     </p>
                                  </div>
                              </div>
                           </div>
                        </div>
                     </section>

                     {/* YoY Comparativo Isolado */}
                     <section className="bg-[#0a0c10] p-8 rounded-3xl border border-gray-800 shadow-2xl mt-8">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-800 pb-6">
                           <div>
                             <h2 className="text-white font-bold italic text-lg uppercase tracking-wider flex items-center gap-2">
                               🔬 T-RAY: Comparativo Direto na Sazonalidade (YoY)
                             </h2>
                             <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-1">
                               Análise cruzada de faturamento contra a média histórica
                             </p>
                           </div>
                           <div className="flex items-center gap-3">
                              <p className="text-[10px] text-gray-500 font-bold uppercase">Filtrar Sazonalidade (T):</p>
                              <select 
                                 value={selectedQuarterAnalysis} 
                                 onChange={(e) => setSelectedQuarterAnalysis(e.target.value)}
                                 className="bg-gray-950 text-emerald-500 font-black p-3 rounded-xl border border-gray-700 outline-none focus:ring-1 focus:ring-red-500 uppercase text-xs"
                              >
                                 <option value="1º">Quarter 1 (Jan-Mar)</option>
                                 <option value="2º">Quarter 2 (Abr-Jun)</option>
                                 <option value="3º">Quarter 3 (Jul-Set)</option>
                                 <option value="4º">Quarter 4 (Out-Dez)</option>
                              </select>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                           <div className="lg:col-span-2">
                               <ChartWrapper height={320}>
                                  <ComposedChart data={chartDataSelectedQ}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                      <XAxis dataKey="year" stroke="#666" fontSize={11} tick={{ fill: '#888', fontWeight: 'bold' }} />
                                      <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} stroke="#444" fontSize={10} width={80} />
                                      <Tooltip 
                                          contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                          formatter={(v: number) => formatBRL(v)}
                                      />
                                      <Bar dataKey="realizado" name="Faturamento (Real)" fill={isQNegative ? '#ef4444' : '#3b82f6'} radius={[4, 4, 0, 0]} opacity={0.8} barSize={50} />
                                      <Line type="step" dataKey="metaHistorica" name="Média (Base-Line)" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" />
                                  </ComposedChart>
                               </ChartWrapper>
                           </div>
                           <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                               <h3 className="text-white font-black italic mb-6 text-[10px] tracking-widest uppercase text-gray-500 border-b border-gray-800 pb-3">Desempenho: {selectedQuarterAnalysis} Trimestre</h3>
                               <div className="flex justify-between items-center mb-6">
                                  <div>
                                     <p className="text-gray-400 text-xs font-bold uppercase mb-1">Atual ({currentYear})</p>
                                     <p className="text-white font-black text-xl font-mono">{formatBRL(curQData)}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Anterior ({currentYear - 1})</p>
                                     <p className="text-gray-500 font-bold text-sm line-through decoration-red-500/50">{formatBRL(prevQData)}</p>
                                  </div>
                               </div>
                               
                               <div className={`p-5 rounded-xl border ${curQData > 0 ? (isQNegative ? 'bg-red-950/20 border-red-900/50' : 'bg-emerald-950/20 border-emerald-900/50') : 'bg-gray-950 border-gray-800'}`}>
                                  <p className="text-[10px] uppercase font-black text-gray-400">Variação YoY ({selectedQuarterAnalysis})</p>
                                  <p className={`text-4xl font-black mt-2 font-mono ${curQData === 0 ? 'text-gray-500' : isQNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                                     {curQData === 0 ? '--' : (yoyQGrowth > 0 ? '+' : '') + yoyQGrowth.toFixed(1) + '%'}
                                  </p>
                                  {curQData > 0 && (
                                     <div className="mt-4 pt-4 border-t border-gray-800/50">
                                        <p className="text-[10px] italic text-gray-400 leading-relaxed uppercase">
                                           {isQNegative 
                                            ? `🚨 Gatilho: Investigar as falhas operacionais ou falta de demanda em frente ao ano de Recuperação.`
                                            : `✅ Sinal Verde: O trimestre foi fortificado em relação ao ano anterior.`}
                                        </p>
                                     </div>
                                  )}
                               </div>
                           </div>
                        </div>
                     </section>
                  </>
               );
           })()}
        </div>
      )}

      {activeTab === 'GESTÃO TOP 20' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* Top Indicators */}
           <section className="grid grid-cols-5 gap-4">
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Meta Anual 2026</p>
                <p className="text-xl font-black mt-2 text-white">{formatBRL(gestaoTop20.indicadores.meta_anual_2026)}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Custo Oportunidade Mensal</p>
                <p className="text-xl font-black mt-2 text-amber-500">{formatBRL(gestaoTop20.indicadores.custo_oportunidade_mensal)}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Custo Operacional Fixo</p>
                <p className="text-xl font-black mt-2 text-red-500">{formatBRL(gestaoTop20.indicadores.custo_operacional_fixo_2026)}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Target Recuperação</p>
                <p className="text-xl font-black mt-2 text-emerald-400">{formatBRL(5660172)}</p>
              </div>
              <div className="bg-gray-950 p-6 rounded-2xl border border-red-900/50 shadow-xl flex flex-col justify-center items-center">
                <button 
                  onClick={() => {
                    if(confirm("Deseja resetar os dados do Top 20 para o padrão de catálogo? Isso apagará suas edições manuais nesta aba.")) {
                      localStorage.removeItem('skg-gestao-top20');
                      window.location.reload();
                    }
                  }}
                  className="w-full h-full text-[10px] font-black text-red-500 uppercase hover:bg-red-950/30 transition-colors flex flex-col items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  RESTAURAR BASE T20
                </button>
              </div>
           </section>

           {/* Behavioral Chart 2022-2028 */}
           <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
             <h2 className="text-white font-bold italic mb-6 uppercase text-center text-xl tracking-widest text-red-100">Clientes T10 Performance Histórica & Projeção (2022-2028)</h2>
             <ChartWrapper height={450}>
               <BarChart 
                 data={gestaoTop20.clientes.slice(0, 10).map((c: any) => ({
                   name: c.nome.split(' ').slice(0, 2).join(' '),
                   '2022': c.history?.[2022] || 0,
                   '2023': c.history?.[2023] || 0,
                   '2024': c.history?.[2024] || 0,
                   '2025': c.history?.[2025] || 0,
                   '2026': c.projection2026 || 0,
                   '2027': c.projection2027 || 0,
                   '2028': c.projection2028 || 0,
                 }))}
                 margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
               >
                 <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                 <XAxis 
                   dataKey="name" 
                   stroke="#9ca3af" 
                   interval={0} 
                   angle={-45} 
                   textAnchor="end" 
                   fontSize={10} 
                   tick={{ fill: '#f3f4f6', fontWeight: 'bold' }}
                 />
                 <YAxis 
                   stroke="#9ca3af" 
                   tickFormatter={(v) => formatBRL(v)} 
                   fontSize={10}
                   width={100}
                 />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                   formatter={(v: number) => formatBRL(v)}
                 />
                 <Bar dataKey="2022" fill="#ef4444" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="2023" fill="#f97316" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="2024" fill="#6b7280" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="2025" fill="#facc15" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="2026" fill="#10b981" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="2027" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="2028" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ChartWrapper>
             <div className="flex justify-center gap-6 mt-4 text-[10px] font-bold">
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ef4444] rounded"></div> 2022</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#f97316] rounded"></div> 2023</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#6b7280] rounded"></div> 2024</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#facc15] rounded"></div> 2025</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#10b981] rounded"></div> 2026 (Proj)</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#3b82f6] rounded"></div> 2027 (Proj)</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#8b5cf6] rounded"></div> 2028 (Proj)</div>
             </div>
           </section>



           {/* Opportunity Cost Insight */}
           <section className="bg-gray-900 p-8 rounded-2xl border border-dashed border-red-500/30 flex items-center gap-8">
              <div className="bg-red-500/10 p-4 rounded-full">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div>
                <h3 className="text-red-500 font-black italic text-xl uppercase">Análise de Custo de Oportunidade</h3>
                <p className="text-gray-400 max-w-2xl mt-2 text-sm">
                  Atualmente faltam <span className="text-white font-bold">{formatBRL(Math.max(0, 2180000 - gestaoTop20.clientes.reduce((acc: number, c: any) => acc + (c.projection2026 || 0), 0)))}</span> para atingir a Meta Anual de 2026. 
                  O custo de ociosidade está concentrado em <span className="text-amber-500 font-bold">{gestaoTop20.clientes.filter((c: any) => {
                    const h = Object.values(c.history || {}) as number[];
                    const m = h.length > 0 ? h.reduce((a,b)=>a+b,0)/h.length : 0;
                    return (c.projection2026 || 0) < m * 0.7;
                  }).length} contas</span> em Alerta.
                </p>
              </div>
           </section>
        </div>
      )}
      
      {activeTab === 'BANCO DE DADOS (PLANILHAS)' && (
         <DatabaseManager 
            vendedoresConfig={vendedoresConfig} setVendedoresConfig={setVendedoresConfig}
            metas={metas} setMetas={setMetas}
            vendedorData={vendedorData} setVendedorData={setVendedorData}
            custos={custos} setCustos={setCustos}
            quarterlyHistory={quarterlyHistory} setQuarterlyHistory={setQuarterlyHistory}
            gestaoTop20={gestaoTop20} setGestaoTop20={setGestaoTop20}
         />
      )}

    </div>
  );
};
export default App;
