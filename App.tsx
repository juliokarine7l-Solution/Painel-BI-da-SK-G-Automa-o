
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, Area, Cell, LineChart
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { TARGET_GOALS, MONTHS, SELLERS, YEARS, HISTORICAL_TOP_CLIENTS, HISTORICAL_YEARS } from './constants';
import { YearlyActualData, SellerActual } from './types';

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
  const [activeTab, setActiveTab] = useState<'goals' | 'clients' | 'growth'>('goals');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);
  
  // Persistence Layer
  const [actualData, setActualData] = useState<YearlyActualData>(() => {
    const initial: YearlyActualData = {};
    YEARS.forEach(yr => {
      initial[String(yr)] = {};
      MONTHS.forEach(m => { 
        initial[String(yr)][String(m)] = { syllas: 0, v1: 0, v2: 0, v3: 0 }; 
      });
    });
    try {
      const saved = localStorage.getItem('skg_bi_data_v13');
      if (saved) return { ...initial, ...JSON.parse(saved) };
    } catch (e) { console.warn("Cache error:", e); }
    return initial;
  });

  const [clientProjections, setClientProjections] = useState<Record<string, Record<number, number>>>(() => {
    const initial: Record<string, Record<number, number>> = {};
    HISTORICAL_TOP_CLIENTS.forEach(c => {
      initial[String(c.id)] = {};
      [2026, 2027, 2028, 2029, 2030].forEach(y => initial[String(c.id)][Number(y)] = 0);
    });
    try {
      const saved = localStorage.getItem('skg_bi_v13_projections');
      if (saved) return { ...initial, ...JSON.parse(saved) };
    } catch (e) { console.warn("Projections cache error:", e); }
    return initial;
  });

  const handleSaveSales = () => {
    localStorage.setItem('skg_bi_data_v13', JSON.stringify(actualData));
    localStorage.setItem('skg_bi_v13_projections', JSON.stringify(clientProjections));
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 3000);
  };

  // BI Calculations
  const biMetrics = useMemo(() => {
    const currentYearActuals = actualData[selectedYear] || {};
    let runningTotalRealizado = 0;
    let runningTotalMeta = 0;
    const totalMetaAnual = 2180000;

    const monthlyData = TARGET_GOALS.map(goal => {
      const actual = (currentYearActuals[goal.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 }) as SellerActual;
      const realMes = (Number(actual.syllas) || 0) + (Number(actual.v1) || 0) + (Number(actual.v2) || 0) + (Number(actual.v3) || 0);
      runningTotalRealizado += realMes;
      runningTotalMeta += goal.total;
      return { 
        month: goal.month, meta: goal.total, realizado: realMes,
        acumuladoReal: runningTotalRealizado, acumuladoMeta: runningTotalMeta
      };
    });

    const quarterlyData = [
      { name: 'Q1', months: ['Jan', 'Fev', 'Mar'] },
      { name: 'Q2', months: ['Abr', 'Mai', 'Jun'] },
      { name: 'Q3', months: ['Jul', 'Ago', 'Set'] },
      { name: 'Q4', months: ['Out', 'Nov', 'Dez'] }
    ].map(q => {
      const qMeta = TARGET_GOALS.filter(g => q.months.includes(g.month)).reduce((acc, g) => acc + g.total, 0);
      const qReal = q.months.reduce((acc, m) => {
        const actual = (currentYearActuals[m] || { syllas: 0, v1: 0, v2: 0, v3: 0 }) as SellerActual;
        return acc + (Number(actual.syllas) || 0) + (Number(actual.v1) || 0) + (Number(actual.v2) || 0) + (Number(actual.v3) || 0);
      }, 0);
      return { name: q.name, meta: qMeta, realizado: qReal, percentage: qMeta > 0 ? (qReal / qMeta) * 100 : 0 };
    });

    return { monthlyData, quarterlyData, totalRealizado: runningTotalRealizado, totalMeta: totalMetaAnual, overallPercentage: (runningTotalRealizado / totalMetaAnual) * 100 };
  }, [actualData, selectedYear]);

  // Pareto & Heatmap Logic for T20 including multi-year projections
  const t20Analysis = useMemo(() => {
    const analysis = HISTORICAL_TOP_CLIENTS.map(client => {
      const lastYear = client.history[2025] || 0;
      const prevYear = client.history[2024] || 0;
      
      const proj2026 = clientProjections[client.id]?.[2026] || 0;
      const proj2027 = clientProjections[client.id]?.[2027] || 0;
      const proj2028 = clientProjections[client.id]?.[2028] || 0;
      
      const avgHist = HISTORICAL_YEARS.reduce((sum, yr) => sum + (client.history[yr] || 0), 0) / HISTORICAL_YEARS.length;
      
      let status: 'STAR' | 'CHURN' | 'STABLE' | 'DECREASE' = 'STABLE';
      if (lastYear > avgHist * 1.2) status = 'STAR';
      else if (lastYear === 0 && prevYear > 0) status = 'CHURN';
      else if (lastYear < prevYear * 0.8 && lastYear > 0) status = 'DECREASE';

      const trendData = [
        ...HISTORICAL_YEARS.map(y => ({ year: y, value: client.history[y] || 0, isProjection: false })), 
        { year: 2026, value: proj2026, isProjection: true },
        { year: 2027, value: proj2027, isProjection: true },
        { year: 2028, value: proj2028, isProjection: true }
      ];

      return { ...client, lastYear, status, trendData, avgHist, proj2026, proj2027, proj2028 };
    }).sort((a, b) => b.lastYear - a.lastYear);

    const t20Total2025 = analysis.reduce((sum, c) => sum + c.lastYear, 0);
    const t20TotalProj2026 = analysis.reduce((sum, c) => sum + c.proj2026, 0);
    
    let cumulativeSum = 0;
    const paretoData = analysis.map(c => {
      cumulativeSum += c.lastYear;
      return {
        name: c.name.split(' ')[0].slice(0, 10),
        value: c.lastYear,
        cumulative: t20Total2025 > 0 ? (cumulativeSum / t20Total2025) * 100 : 0
      };
    });

    return { analysis, paretoData, t20Total2025, t20TotalProj2026 };
  }, [clientProjections]);

  // AI Insights
  const [isConsulting, setIsConsulting] = useState(false);
  const [dailyReport, setDailyReport] = useState<string | null>(() => localStorage.getItem('skg_bi_v13_insight'));

  const fetchAIAnalysis = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return alert("API Key não detectada.");
    setIsConsulting(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const highProjections = t20Analysis.analysis.filter(c => c.proj2026 > c.lastYear * 1.5).map(c => c.name).join(', ');
      
      const prompt = `
        Aja como Growth Advisor Sênior da V4 Company para a SK-G Automação.
        DADOS ATUAIS (2026): Meta 2.18M, Realizado ${formatBRL(biMetrics.totalRealizado)}.
        VISÃO DE LONGO PRAZO:
        - Volume Projetado T20 2026: ${formatBRL(t20Analysis.t20TotalProj2026)}
        - Clientes com Projeção Agressiva (+50%): ${highProjections || 'Nenhum identificado'}
        - Clientes em Risco de Churn: ${t20Analysis.analysis.filter(c => c.status === 'CHURN').map(c => c.name).join(', ')}

        INSTRUÇÕES:
        1. Analise o comportamento: Clientes com projeção alta mas faturamento real baixo em 2026 indicam falha de execução ou pipeline travado.
        2. Proponha ações para os próximos 3 anos (2026-2028) focadas em Longevidade Industrial e VO2.
        3. Nunca mencione Cilindros 60 ou 62. Use 61 e 63.
        4. Priorize a saúde do gestor: metas agressivas exigem clareza mental e VO2 físico em dia.
      `;

      const res = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { tools: [{googleSearch: {}}] } });
      const text = String(res.text);
      setDailyReport(text);
      localStorage.setItem('skg_bi_v13_insight', text);
    } catch (e) { console.error(e); } finally { setIsConsulting(false); }
  };

  const handleInputChange = (month: string, seller: string, value: string) => {
    const num = parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    setActualData(prev => ({ ...prev, [selectedYear]: { ...(prev[selectedYear] || {}), [month]: { ...(prev[selectedYear]?.[month] || { syllas: 0, v1: 0, v2: 0, v3: 0 }), [seller]: num } } }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-gray-100 pb-24 font-sans custom-scrollbar">
      {/* HEADER */}
      <header className="bg-[#cc1d1d] shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4 border-b border-red-800">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/Ky5zDy2.png" alt="SK-G" className="h-10 bg-white p-1 rounded-md" />
          <h1 className="text-xl font-black uppercase italic tracking-tighter">SK-G Intelligence BI</h1>
        </div>
        <nav className="flex bg-red-900/40 p-1 rounded-xl border border-red-500/30 overflow-x-auto">
          {['goals', 'clients', 'growth'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-red-700 shadow-md' : 'text-white/70 hover:bg-red-700/40'}`}>
              {tab === 'goals' ? 'Dashboard Geral' : tab === 'clients' ? 'Planejamento T20' : 'Estratégia V4'}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {YEARS.slice(0, 3).map(yr => (
            <button key={yr} onClick={() => setSelectedYear(yr)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedYear === yr ? 'bg-white text-red-700 shadow-md' : 'text-white/50 hover:text-white'}`}>{yr}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto w-full">
        {activeTab === 'goals' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-emerald-500">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Realizado {selectedYear}</p>
                <p className="text-3xl font-black text-emerald-400">{formatBRL(biMetrics.totalRealizado)}</p>
                <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Volume Total Ano Corrente</p>
              </div>
              <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-blue-500">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Potencial T20 (Proj. 26)</p>
                <p className="text-3xl font-black text-blue-400">{formatBRL(t20Analysis.t20TotalProj2026)}</p>
                <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase tracking-widest">Soma das Metas Individuais</p>
              </div>
              <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-amber-500">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Atingimento Meta Anual</p>
                <p className="text-3xl font-black text-amber-400">{String(biMetrics.overallPercentage.toFixed(1))}%</p>
                <div className="h-1.5 w-full bg-gray-900 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{width: `${Math.min(100, biMetrics.overallPercentage)}%`}}></div>
                </div>
              </div>
              <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-t-4 border-t-red-600">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Gap p/ Meta 2.18M</p>
                <p className="text-3xl font-black text-red-500">{formatBRL(Math.max(0, 2180000 - biMetrics.totalRealizado))}</p>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest">Crescimento Progressivo {selectedYear}</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={biMetrics.monthlyData}>
                      <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Area type="monotone" dataKey="acumuladoReal" name="Acumulado Real" fill="#10b981" fillOpacity={0.1} stroke="#10b981" strokeWidth={3} />
                      <Line type="monotone" dataKey="acumuladoMeta" name="Meta Acumulada" stroke="#1e3a8a" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest">Análise Mensal (Meta vs Real)</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={biMetrics.monthlyData}>
                      <CartesianGrid stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                      <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Bar dataKey="realizado" name="Realizado" radius={[4, 4, 0, 0]} fill="#10b981" barSize={30} />
                      <Bar dataKey="meta" name="Meta" radius={[4, 4, 0, 0]} fill="#1e3a8a" barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* DIRECT INPUT TABLE FOR MONTHLY SALES */}
            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-6 bg-gray-950/50 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-black uppercase italic tracking-widest">Lançamentos de Faturamento - {selectedYear}</h3>
                <button onClick={handleSaveSales} className={`px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 ${saveFeedback ? 'bg-emerald-600' : 'bg-[#008f39] hover:bg-emerald-500'}`}>
                  {saveFeedback ? '✓ SINCRONIZADO' : '💾 SALVAR LANÇAMENTOS'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0b0e14] text-gray-500 text-[10px] uppercase font-black">
                    <tr>
                      <th className="px-6 py-5 sticky left-0 bg-[#0b0e14] z-10 border-r border-gray-800">Período</th>
                      {SELLERS.map(s => <th key={s.id} className="px-4 py-5 text-center">{s.label}</th>)}
                      <th className="px-6 py-5 text-center bg-gray-900/40">Realizado Mes</th>
                      <th className="px-6 py-5 text-center">Meta Mes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {biMetrics.monthlyData.map((row) => {
                      const actual = ((actualData[selectedYear] || {})[row.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 }) as SellerActual;
                      return (
                        <tr key={row.month} className="hover:bg-white/[0.01]">
                          <td className="px-6 py-4 font-black text-gray-400 sticky left-0 bg-[#12161f] border-r border-gray-800">{row.month}</td>
                          {SELLERS.map((s) => (
                            <td key={s.id} className="px-2 py-2">
                              <input type="text" className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 w-full text-center font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:opacity-20" placeholder="0" value={(actual as any)[s.id] || ''} onChange={(e) => handleInputChange(row.month, s.id, e.target.value)} />
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
            {/* T20 CHARTS */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-emerald-400">Impacto Pareto T20 (Curva ABC)</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={t20Analysis.paretoData}>
                      <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#4b5563" fontSize={10} angle={-45} textAnchor="end" height={80} interval={0} />
                      <YAxis yAxisId="left" stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#4b5563" fontSize={10} tickFormatter={v => `${v}%`} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Bar yAxisId="left" dataKey="value" name="Faturamento 2025" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
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
                          <span className="text-[10px] font-black text-gray-300 uppercase leading-tight truncate w-32">{c.name}</span>
                          <span className="text-[8px] font-black opacity-50 uppercase mt-1">Status: {c.status}</span>
                       </div>
                       <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${c.status === 'STAR' ? 'bg-emerald-500 animate-pulse' : c.status === 'DECREASE' ? 'bg-amber-500' : c.status === 'CHURN' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* T20 PROJECTIONS TABLE */}
            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
               <div className="p-8 border-b border-gray-800 bg-gray-950/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black uppercase italic tracking-widest">Plano Estratégico Trienal (2026-2028)</h3>
                    <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded font-black">T20</span>
                  </div>
                  <button onClick={handleSaveSales} className="px-8 py-2 rounded-xl bg-[#008f39] hover:bg-emerald-500 font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center gap-2">
                    {saveFeedback ? '✓ SINCRONIZADO' : '💾 SALVAR PROJEÇÕES'}
                  </button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-[11px] border-collapse">
                   <thead className="bg-[#0b0e14] text-gray-500 font-black uppercase border-b border-gray-800">
                     <tr>
                       <th className="px-6 py-4 min-w-[200px] sticky left-0 bg-[#0b0e14] z-10 border-r border-gray-800">Empresa Cliente</th>
                       <th className="px-6 py-4 min-w-[200px] text-center">Tendência (Hist + 3Y Proj)</th>
                       <th className="px-4 py-4 text-center">Méd. Hist.</th>
                       <th className="px-4 py-4 text-center">Fat. 2025</th>
                       <th className="px-4 py-4 text-center bg-red-950/20 text-red-200">Proj. 2026</th>
                       <th className="px-4 py-4 text-center bg-red-950/20 text-red-200">Proj. 2027</th>
                       <th className="px-4 py-4 text-center bg-red-950/20 text-red-200">Proj. 2028</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800/40">
                     {t20Analysis.analysis.map(client => (
                       <tr key={client.id} className="hover:bg-white/[0.02] transition-colors group">
                         <td className="px-6 py-3 sticky left-0 bg-[#12161f] font-black text-gray-300 border-r border-gray-800">
                            <div className="truncate w-48">{client.name}</div>
                            <div className={`text-[7px] mt-1 font-black uppercase ${client.status === 'STAR' ? 'text-emerald-500' : client.status === 'CHURN' ? 'text-red-500' : 'text-gray-600'}`}>
                              {client.status === 'CHURN' ? 'RISCO CHURN' : client.status === 'STAR' ? 'PERFORMANCE ALTA' : 'ESTÁVEL'}
                            </div>
                         </td>
                         <td className="px-4 py-3 h-20 bg-black/10">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={client.trendData}>
                                <Line type="monotone" dataKey="value" stroke={client.status === 'CHURN' ? '#ef4444' : '#10b981'} strokeWidth={2} dot={false} strokeDasharray="3 3" />
                              </LineChart>
                            </ResponsiveContainer>
                         </td>
                         <td className="px-4 py-3 text-center text-gray-600">{formatBRL(client.avgHist)}</td>
                         <td className={`px-4 py-3 text-center font-bold ${client.status === 'STAR' ? 'text-emerald-400' : 'text-gray-400'}`}>{formatBRL(client.lastYear)}</td>
                         {[2026, 2027, 2028].map(y => (
                            <td key={y} className="px-2 py-2 bg-red-900/5">
                              <input 
                                type="text" 
                                className="bg-gray-950/40 border border-gray-800/50 rounded-lg px-2 py-1.5 w-full text-center font-black text-red-200 outline-none focus:ring-1 focus:ring-red-500 transition-all" 
                                value={(clientProjections[client.id] as any)[y] || ''}
                                onChange={e => {
                                  const val = parseFloat(e.target.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
                                  setClientProjections(p => ({ ...p, [client.id]: { ...p[client.id], [y]: val } }));
                                }} 
                              />
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

        {activeTab === 'growth' && (
          <div className="animate-in fade-in duration-700">
            <div className="bg-[#12161f] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
               <div className="p-8 bg-gradient-to-r from-gray-900 to-black flex flex-col md:flex-row justify-between items-center text-white border-b border-gray-800 gap-6">
                 <div className="flex items-center gap-6">
                   <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white text-red-600 border-2 border-red-600 shadow-xl font-black text-2xl italic">V4</div>
                   <div>
                     <h2 className="text-xl font-black uppercase italic leading-none tracking-tighter">Growth Strategy V4</h2>
                     <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em] mt-2">Longevidade Industrial & VO2 Advisor</p>
                   </div>
                 </div>
                 <button onClick={fetchAIAnalysis} disabled={isConsulting} className="px-12 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(220,38,38,0.3)]">
                   {isConsulting ? 'ANALISANDO PROJEÇÕES...' : 'Gerar Diagnóstico Estratégico'}
                 </button>
               </div>
               <div className="p-10">
                  {isConsulting ? (
                    <div className="py-24 text-center">
                       <div className="w-20 h-20 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-2xl"></div>
                       <p className="font-black uppercase text-red-500 animate-pulse tracking-widest">Calculando Longevidade dos Lançamentos...</p>
                    </div>
                  ) : dailyReport ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                      <div className="lg:col-span-2 text-gray-300 bg-black/40 p-12 rounded-[40px] border border-white/5 whitespace-pre-line leading-relaxed text-base italic shadow-inner">
                        {String(dailyReport)}
                      </div>
                      <div className="space-y-8">
                         <div className="bg-red-900/10 p-8 rounded-3xl border border-red-600/20 shadow-lg">
                            <h4 className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-4 italic">Análise de GAP Trienal</h4>
                            <p className="text-xs text-gray-500 font-bold leading-relaxed">A soma das projeções T20 para 2026-2028 indica um potencial de crescimento de 25%. Atenção redobrada na conversão do faturamento real de 2026 para sustentar essa curva.</p>
                         </div>
                         <div className="bg-emerald-900/10 p-8 rounded-3xl border border-emerald-600/20 shadow-lg">
                            <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-4 italic">Alocação de VO2</h4>
                            <p className="text-xs text-gray-500 font-bold leading-relaxed">Foque a energia do time em contas STAR (Performance Alta). Contas em risco de CHURN exigem visitas técnicas com apresentação de Séries 61 ou 63 para retomada de confiança.</p>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-24 text-center border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/10">
                      <p className="italic text-gray-600 font-black uppercase tracking-widest">Aguardando gatilho de inteligência comercial.</p>
                      <button onClick={fetchAIAnalysis} className="mt-4 text-[10px] text-red-500 font-bold underline">Analisar Faturamento vs Projeções Agora</button>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER METRICS BAR */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#008f39] p-4 z-50 border-t border-emerald-400/20 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center text-white gap-2">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-glow"></div>
             <span className="text-xs font-black uppercase tracking-widest">Dashboard BI SK-G v14.0 | Faturamento & Projeções</span>
          </div>
          <div className="flex gap-8 items-center">
             <div className="text-right">
                <p className="text-[9px] font-black uppercase opacity-60">Realizado Acumulado</p>
                <p className="text-xl font-black">{formatBRL(biMetrics.totalRealizado)}</p>
             </div>
             <div className="w-px h-8 bg-white/20"></div>
             <div className="text-right">
                <p className="text-[9px] font-black uppercase opacity-60">Atingimento Meta Anual</p>
                <p className="text-xl font-black">{String(biMetrics.overallPercentage.toFixed(1))}%</p>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
