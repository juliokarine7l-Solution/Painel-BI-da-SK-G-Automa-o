
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, Area, Cell, LineChart
} from 'recharts';
import { TARGET_GOALS, MONTHS, SELLERS, YEARS, HISTORICAL_TOP_CLIENTS, HISTORICAL_YEARS } from './constants';
import { YearlyActualData, SellerActual, YearlyOperationalData, MonthlyOperational } from './types';

// Formatação Segura para evitar React Error #31 e garantir legibilidade técnica
const formatBRL = (value: number): string => {
  try {
    return String(new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL', 
      maximumFractionDigits: 0 
    }).format(Number(value) || 0));
  } catch (e) {
    return String(`R$ ${Number(value).toLocaleString('pt-BR')}`);
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'goals' | 'clients' | 'efficiency'>('goals');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);
  
  // Persistência - Faturamento por Vendedor
  const [actualData, setActualData] = useState<YearlyActualData>(() => {
    const initial: YearlyActualData = {};
    YEARS.forEach(yr => {
      initial[String(yr)] = {};
      MONTHS.forEach(m => { 
        initial[String(yr)][String(m)] = { syllas: 0, v1: 0, v2: 0, v3: 0 }; 
      });
    });
    try {
      const saved = localStorage.getItem('skg_bi_revenue_v17');
      if (saved) return { ...initial, ...JSON.parse(saved) };
    } catch (e) { console.warn("Faturamento Cache error:", e); }
    return initial;
  });

  // Persistência - Eficiência Operacional (Logística e Custos de Mercadoria)
  const [opData, setOpData] = useState<YearlyOperationalData>(() => {
    const initial: YearlyOperationalData = {};
    YEARS.forEach(yr => {
      initial[String(yr)] = {};
      MONTHS.forEach(m => {
        initial[String(yr)][String(m)] = { zm: 0, terceiro: 0, correios: 0, mercadoria: 0 };
      });
    });
    try {
      const saved = localStorage.getItem('skg_bi_operational_v17');
      if (saved) return { ...initial, ...JSON.parse(saved) };
    } catch (e) { console.warn("Op Cache error:", e); }
    return initial;
  });

  // Persistência - Projeções T20 (Trienal)
  const [clientProjections, setClientProjections] = useState<Record<string, Record<number, number>>>(() => {
    const initial: Record<string, Record<number, number>> = {};
    HISTORICAL_TOP_CLIENTS.forEach(c => {
      initial[String(c.id)] = {};
      [2026, 2027, 2028].forEach(y => initial[String(c.id)][Number(y)] = 0);
    });
    try {
      const saved = localStorage.getItem('skg_bi_t20_proj_v17');
      if (saved) return { ...initial, ...JSON.parse(saved) };
    } catch (e) { console.warn("Projections cache error:", e); }
    return initial;
  });

  const handleSaveData = () => {
    localStorage.setItem('skg_bi_revenue_v17', JSON.stringify(actualData));
    localStorage.setItem('skg_bi_operational_v17', JSON.stringify(opData));
    localStorage.setItem('skg_bi_t20_proj_v17', JSON.stringify(clientProjections));
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  // Cálculos de BI e Margem Real (Local)
  const biMetrics = useMemo(() => {
    const currentYearActuals = actualData[selectedYear] || {};
    const currentYearOp = opData[selectedYear] || {};
    let totalRealizado = 0;
    let totalLogistica = 0;
    let totalMercadoria = 0;
    const metaAnualFixa = 2180000;

    const monthlyData = TARGET_GOALS.map(goal => {
      const actual = (currentYearActuals[goal.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 }) as SellerActual;
      const op = (currentYearOp[goal.month] || { zm: 0, terceiro: 0, correios: 0, mercadoria: 0 }) as MonthlyOperational;
      
      const realMes = (Number(actual.syllas) || 0) + (Number(actual.v1) || 0) + (Number(actual.v2) || 0) + (Number(actual.v3) || 0);
      const logMes = (Number(op.zm) || 0) + (Number(op.terceiro) || 0) + (Number(op.correios) || 0);
      const mercMes = (Number(op.mercadoria) || 0);

      totalRealizado += realMes;
      totalLogistica += logMes;
      totalMercadoria += mercMes;

      const percLog = realMes > 0 ? (logMes / realMes) * 100 : 0;
      const percMerc = realMes > 0 ? (mercMes / realMes) * 100 : 0;
      const margemRealMes = realMes - logMes - mercMes;

      return { 
        month: goal.month, 
        meta: goal.total, 
        realizado: realMes,
        logistica: logMes,
        mercadoria: mercMes,
        margem: margemRealMes,
        percLog,
        percMerc,
        isWarning: percLog > 10 || percMerc > 50
      };
    });

    const margemAnual = totalRealizado - totalLogistica - totalMercadoria;
    const atingimento = (totalRealizado / metaAnualFixa) * 100;

    return { 
      monthlyData, 
      totalRealizado, 
      overallPercentage: atingimento,
      totalLogistica,
      totalMercadoria,
      margemBrutaAnual: margemAnual,
      percMargemAnual: totalRealizado > 0 ? (margemAnual / totalRealizado) * 100 : 0,
      avgLogPerc: totalRealizado > 0 ? (totalLogistica / totalRealizado) * 100 : 0
    };
  }, [actualData, opData, selectedYear]);

  // Análise T20 e Pareto
  const t20Analysis = useMemo(() => {
    const analysis = HISTORICAL_TOP_CLIENTS.map(client => {
      const lastYear = client.history[2025] || 0;
      const proj26 = clientProjections[client.id]?.[2026] || 0;
      const proj27 = clientProjections[client.id]?.[2027] || 0;
      const proj28 = clientProjections[client.id]?.[2028] || 0;
      
      const avgHist = HISTORICAL_YEARS.reduce((sum, yr) => sum + (client.history[yr] || 0), 0) / HISTORICAL_YEARS.length;
      
      let status: 'STAR' | 'CHURN' | 'STABLE' | 'DECREASE' = 'STABLE';
      if (lastYear > avgHist * 1.15) status = 'STAR';
      else if (lastYear === 0) status = 'CHURN';
      else if (lastYear < avgHist * 0.8) status = 'DECREASE';

      const trendData = [
        ...HISTORICAL_YEARS.map(y => ({ year: y, value: client.history[y] || 0 })),
        { year: 2026, value: proj26 },
        { year: 2027, value: proj27 },
        { year: 2028, value: proj28 }
      ];

      return { ...client, lastYear, status, trendData, proj26, proj27, proj28 };
    }).sort((a, b) => b.lastYear - a.lastYear);

    const t20Total2025 = analysis.reduce((sum, c) => sum + c.lastYear, 0);
    let cumulative = 0;
    const paretoData = analysis.map(c => {
      cumulative += c.lastYear;
      return {
        name: c.name.split(' ')[0],
        value: c.lastYear,
        cumulative: t20Total2025 > 0 ? (cumulative / t20Total2025) * 100 : 0
      };
    });

    return { analysis, paretoData, t20Total2025 };
  }, [clientProjections]);

  const handleInputChange = (month: string, seller: string, value: string) => {
    const num = parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    setActualData(prev => ({ 
      ...prev, 
      [selectedYear]: { 
        ...(prev[selectedYear] || {}), 
        [month]: { ...(prev[selectedYear]?.[month] || { syllas: 0, v1: 0, v2: 0, v3: 0 }), [seller]: num } 
      } 
    }));
  };

  const handleOpChange = (month: string, field: string, value: string) => {
    const num = parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    setOpData(prev => ({ 
      ...prev, 
      [selectedYear]: { 
        ...(prev[selectedYear] || {}), 
        [month]: { ...(prev[selectedYear]?.[month] || { zm: 0, terceiro: 0, correios: 0, mercadoria: 0 }), [field]: num } 
      } 
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-gray-100 pb-24 font-sans custom-scrollbar">
      {/* HEADER CORPORATIVO */}
      <header className="bg-[#cc1d1d] shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4 border-b border-red-800">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/Ky5zDy2.png" alt="SK-G" className="h-10 bg-white p-1 rounded-md" />
          <h1 className="text-xl font-black uppercase italic tracking-tighter">SK-G Intelligence BI</h1>
        </div>
        <nav className="flex bg-red-900/40 p-1 rounded-xl border border-red-500/30 overflow-x-auto">
          <button onClick={() => setActiveTab('goals')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'goals' ? 'bg-white text-red-700 shadow-md' : 'text-white/70 hover:bg-red-700/40'}`}>Faturamento</button>
          <button onClick={() => setActiveTab('clients')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'clients' ? 'bg-white text-red-700 shadow-md' : 'text-white/70 hover:bg-red-700/40'}`}>Top 20 Clientes</button>
          <button onClick={() => setActiveTab('efficiency')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'efficiency' ? 'bg-white text-red-700 shadow-md' : 'text-white/70 hover:bg-red-700/40'}`}>Eficiência Operacional</button>
        </nav>
        <div className="flex items-center gap-2">
          {YEARS.slice(0, 3).map(yr => (
            <button key={yr} onClick={() => setSelectedYear(yr)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedYear === yr ? 'bg-white text-red-700 shadow-md' : 'text-white/50 hover:text-white'}`}>{yr}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto w-full">
        {/* KPI CARDS - 4 COLUNAS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Faturamento {String(selectedYear)}</p>
            <p className="text-3xl font-black text-emerald-400">{formatBRL(biMetrics.totalRealizado)}</p>
            <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Volume Bruto Acumulado</p>
          </div>
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-amber-500">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Atingimento Meta Anual</p>
            <p className="text-3xl font-black text-amber-400">{String(biMetrics.overallPercentage.toFixed(1))}%</p>
            <div className="h-1.5 w-full bg-gray-900 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-amber-500" style={{width: `${Math.min(100, biMetrics.overallPercentage)}%`}}></div>
            </div>
          </div>
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-red-500">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Logística Total</p>
            <p className="text-3xl font-black text-red-400">{formatBRL(biMetrics.totalLogistica)}</p>
            <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Representa {String(biMetrics.avgLogPerc.toFixed(1))}% do Fat.</p>
          </div>
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-t-4 border-t-blue-600">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Margem Bruta Estimada</p>
            <p className="text-3xl font-black text-blue-400">{formatBRL(biMetrics.margemBrutaAnual)}</p>
            <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Eficiência de {String(biMetrics.percMargemAnual.toFixed(1))}%</p>
          </div>
        </section>

        {activeTab === 'goals' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest">Faturamento Realizado x Meta</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={biMetrics.monthlyData}>
                      <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                      <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Legend />
                      <Bar dataKey="realizado" name="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                      <Bar dataKey="meta" name="Meta Mês" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest">Distribuição por Vendedor</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={biMetrics.monthlyData}>
                      <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                      <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Area type="monotone" dataKey="realizado" name="Volume Total" fill="#10b981" fillOpacity={0.1} stroke="#10b981" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* LANÇAMENTO RECEITA */}
            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-6 bg-gray-950/50 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-black uppercase italic tracking-widest">Lançamentos de Receita - {String(selectedYear)}</h3>
                <button onClick={handleSaveData} className={`px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 ${saveFeedback ? 'bg-emerald-600' : 'bg-[#008f39] hover:bg-emerald-500'}`}>
                  {saveFeedback ? '✓ SINCRONIZADO' : '💾 SALVAR LANÇAMENTOS'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0b0e14] text-gray-500 text-[10px] uppercase font-black">
                    <tr>
                      <th className="px-6 py-5 sticky left-0 bg-[#0b0e14] z-10 border-r border-gray-800">Mês</th>
                      {SELLERS.map(s => <th key={s.id} className="px-4 py-5 text-center">{String(s.label)}</th>)}
                      <th className="px-6 py-5 text-center bg-gray-900/40">Total Mês</th>
                      <th className="px-6 py-5 text-center">Meta Fixa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {biMetrics.monthlyData.map((row) => {
                      const actual = ((actualData[selectedYear] || {})[row.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 }) as SellerActual;
                      return (
                        <tr key={row.month} className="hover:bg-white/[0.01]">
                          <td className="px-6 py-4 font-black text-gray-400 sticky left-0 bg-[#12161f] border-r border-gray-800">{String(row.month)}</td>
                          {SELLERS.map((s) => (
                            <td key={s.id} className="px-2 py-2">
                              <input type="text" className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 w-full text-center font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="0" value={(actual as any)[s.id] || ''} onChange={(e) => handleInputChange(row.month, s.id, e.target.value)} />
                            </td>
                          ))}
                          <td className={`px-6 py-4 text-center font-black bg-gray-900/30 ${row.realizado < row.meta ? 'text-red-500' : 'text-emerald-400'}`}>{formatBRL(row.realizado)}</td>
                          <td className="px-6 py-4 text-center font-bold text-gray-600 text-xs italic">{formatBRL(row.meta)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="animate-in slide-in-from-bottom duration-500 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-emerald-400">Curva ABC T20 (Base 2025)</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={t20Analysis.paretoData}>
                      <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#4b5563" fontSize={10} angle={-45} textAnchor="end" height={80} interval={0} />
                      <YAxis yAxisId="left" stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#4b5563" fontSize={10} tickFormatter={v => `${v}%`} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Bar yAxisId="left" dataKey="value" name="Fat. 2025" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulative" name="% Acumulada" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl flex flex-col">
                <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-red-500">Heatmap de Fidelidade</h3>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {t20Analysis.analysis.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-gray-950/40 p-3 rounded-2xl border border-gray-800/50">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-300 uppercase leading-tight truncate w-32">{String(c.name)}</span>
                          <span className="text-[8px] font-black opacity-50 uppercase mt-1">Status: {String(c.status)}</span>
                       </div>
                       <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${c.status === 'STAR' ? 'bg-emerald-500 animate-pulse' : c.status === 'DECREASE' ? 'bg-amber-500' : c.status === 'CHURN' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
               <div className="p-8 border-b border-gray-800 bg-gray-950/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-black uppercase italic tracking-widest">Base T20 - Planejamento Trienal (2026-2028)</h3>
                  <button onClick={handleSaveData} className="px-8 py-2 rounded-xl bg-[#008f39] hover:bg-emerald-500 font-black text-xs uppercase tracking-widest shadow-lg transition-all">SALVAR PROJEÇÕES</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-[11px] border-collapse">
                   <thead className="bg-[#0b0e14] text-gray-500 font-black uppercase border-b border-gray-800">
                     <tr>
                       <th className="px-6 py-4 sticky left-0 bg-[#0b0e14] z-10 border-r border-gray-800">Cliente</th>
                       <th className="px-6 py-4 text-center">Tendência Histórico + Proj.</th>
                       <th className="px-4 py-4 text-center">Fat. 2025</th>
                       <th className="px-4 py-4 text-center bg-red-950/20 text-red-200">Proj. 2026</th>
                       <th className="px-4 py-4 text-center bg-red-900/10 text-red-100">Proj. 2027</th>
                       <th className="px-4 py-4 text-center bg-red-800/10 text-red-50">Proj. 2028</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800/40">
                     {t20Analysis.analysis.map(client => (
                       <tr key={client.id} className="hover:bg-white/[0.02]">
                         <td className="px-6 py-3 sticky left-0 bg-[#12161f] font-black text-gray-300 border-r border-gray-800 truncate max-w-[180px]">{String(client.name)}</td>
                         <td className="px-4 py-3 h-20 bg-black/10 min-w-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={client.trendData}>
                                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                              </LineChart>
                            </ResponsiveContainer>
                         </td>
                         <td className="px-4 py-3 text-center font-bold text-gray-400">{formatBRL(client.lastYear)}</td>
                         {[2026, 2027, 2028].map(y => (
                            <td key={y} className="px-2 py-2">
                               <input type="text" className="bg-gray-950/40 border border-gray-800/50 rounded-lg px-2 py-1.5 w-full text-center font-black text-red-200 outline-none focus:ring-1 focus:ring-red-500" value={(clientProjections[client.id] as any)[y] || ''} onChange={e => {
                                 const val = parseFloat(e.target.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
                                 setClientProjections(p => ({ ...p, [client.id]: { ...p[client.id], [y]: val } }));
                               }} />
                            </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </section>
          </div>
        )}

        {activeTab === 'efficiency' && (
          <div className="animate-in fade-in duration-700 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-red-500">Eficiência Financeira: Receita x Custos Operacionais</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={biMetrics.monthlyData}>
                      <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                      <YAxis yAxisId="left" stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#4b5563" fontSize={10} tickFormatter={v => `${v}%`} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="realizado" name="Faturamento" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar yAxisId="left" dataKey="logistica" name="Logística" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar yAxisId="left" dataKey="mercadoria" name="Mercadoria" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={12} />
                      <Line yAxisId="right" type="monotone" dataKey="percLog" name="% Frete" stroke="#facc15" strokeWidth={3} dot={{r: 4}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl space-y-8">
                <h4 className="text-[11px] font-black text-red-500 uppercase tracking-[0.2em] mb-4 italic">Análise de Margem Real</h4>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {biMetrics.monthlyData.map(m => (
                    <div key={m.month} className={`p-4 rounded-2xl border ${m.isWarning ? 'bg-red-950/20 border-red-500/20' : 'bg-gray-950/40 border-gray-800'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{String(m.month)}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${m.isWarning ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                          {String(m.margem >= 0 ? 'MARGEM OK' : 'MARGEM NEGATIVA')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-bold leading-relaxed mb-2">
                        {m.isWarning 
                          ? `Análise: Em ${String(m.month)}, o custo de logística comprometeu ${String(m.percLog.toFixed(1))}% da receita. Alerta de erosão de lucro.`
                          : `Operação saudável. Custos logísticos e de mercadoria dentro da curva esperada.`
                        }
                      </p>
                      <div className="flex justify-between border-t border-gray-800 pt-2">
                        <span className="text-[9px] font-black opacity-50 uppercase tracking-widest">Margem Bruta Mês:</span>
                        <span className="text-[10px] font-black text-blue-400">{formatBRL(m.margem)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* LANÇAMENTO LOGÍSTICA E MERCADORIA */}
            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
               <div className="p-8 border-b border-gray-800 bg-gray-950/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="text-lg font-black uppercase italic tracking-widest">Gestão de Custos: Logística (ZM, Terc, Correios) e Matéria-Prima</h3>
                  <button onClick={handleSaveData} className="px-10 py-2.5 rounded-xl bg-[#008f39] hover:bg-emerald-500 font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95">
                    💾 SALVAR DADOS OPERACIONAIS
                  </button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#0b0e14] text-gray-500 text-[10px] uppercase font-black">
                      <tr>
                        <th className="px-6 py-5 sticky left-0 bg-[#0b0e14] z-10 border-r border-gray-800">Período</th>
                        <th className="px-4 py-5 text-center">ZM Express</th>
                        <th className="px-4 py-5 text-center">Terc. Express</th>
                        <th className="px-4 py-5 text-center text-amber-400">Correios</th>
                        <th className="px-4 py-5 text-center bg-gray-900/40">Custo Matéria-Prima</th>
                        <th className="px-6 py-5 text-center font-black">Impacto Log. %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {biMetrics.monthlyData.map(row => {
                        const op = (opData[selectedYear][row.month] || { zm: 0, terceiro: 0, correios: 0, mercadoria: 0 }) as MonthlyOperational;
                        return (
                          <tr key={row.month} className="hover:bg-white/[0.01]">
                            <td className="px-6 py-4 font-black text-gray-400 sticky left-0 bg-[#12161f] border-r border-gray-800">{String(row.month)}</td>
                            <td className="px-2 py-2">
                              <input type="text" className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 w-full text-center font-bold" value={op.zm || ''} onChange={e => handleOpChange(row.month, 'zm', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <input type="text" className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 w-full text-center font-bold" value={op.terceiro || ''} onChange={e => handleOpChange(row.month, 'terceiro', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <input type="text" className="bg-gray-950 border border-amber-500/20 rounded-lg px-3 py-2 w-full text-center font-black text-amber-400" value={op.correios || ''} onChange={e => handleOpChange(row.month, 'correios', e.target.value)} />
                            </td>
                            <td className="px-2 py-2 bg-gray-900/10">
                              <input type="text" className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 w-full text-center font-bold opacity-70" value={op.mercadoria || ''} onChange={e => handleOpChange(row.month, 'mercadoria', e.target.value)} />
                            </td>
                            <td className={`px-6 py-4 text-center font-black ${row.isWarning ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                              {String(row.percLog.toFixed(1))}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
               </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER FINANCEIRO */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#008f39] p-4 z-50 border-t border-emerald-400/20 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center text-white gap-2">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-glow"></div>
             <span className="text-xs font-black uppercase tracking-widest italic">SK-G BI v17.0 | Foco em Eficiência Industrial | Meta Meta: {formatBRL(2180000)}</span>
          </div>
          <div className="flex gap-10 items-center">
             <div className="text-right">
                <p className="text-[9px] font-black uppercase opacity-60 italic">Margem Bruta Ano</p>
                <p className="text-xl font-black">{formatBRL(biMetrics.margemBrutaAnual)}</p>
             </div>
             <div className="w-px h-8 bg-white/20"></div>
             <div className="text-right">
                <p className="text-[9px] font-black uppercase opacity-60 italic">Carga Logística</p>
                <p className="text-xl font-black">{String(biMetrics.avgLogPerc.toFixed(1))}%</p>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
