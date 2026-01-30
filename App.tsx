
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, ComposedChart, ReferenceLine
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { TARGET_GOALS, MONTHS, SELLERS, YEARS, HISTORICAL_TOP_CLIENTS, HISTORICAL_YEARS } from './constants';
import { YearlyActualData, ChartDataPoint, SellerActual } from './types';

// Função utilitária de formatação com conversão garantida para String
const formatBRL = (value: number): string => {
  try {
    const formatted = new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL', 
      maximumFractionDigits: 0 
    }).format(Number(value) || 0);
    return String(formatted);
  } catch (e) {
    return String(`R$ ${Number(value).toLocaleString('pt-BR')}`);
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'goals' | 'clients' | 'growth'>('goals');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const m = MONTHS[new Date().getMonth()];
    return String(m || 'Jan');
  });
  const [isConsulting, setIsConsulting] = useState<boolean>(false);
  const [dailyReport, setDailyReport] = useState<string | null>(null);
  const [groundingLinks, setGroundingLinks] = useState<{title: string, uri: string}[]>([]);

  // Persistência robusta (v10)
  const [actualData, setActualData] = useState<YearlyActualData>(() => {
    const initial: YearlyActualData = {};
    YEARS.forEach(yr => {
      initial[String(yr)] = {};
      MONTHS.forEach(m => { 
        initial[String(yr)][String(m)] = { syllas: 0, v1: 0, v2: 0, v3: 0 }; 
      });
    });

    try {
      const saved = localStorage.getItem('skg_bi_v10_actuals');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initial, ...parsed };
      }
    } catch (e) { console.warn("Erro localStorage:", e); }
    return initial;
  });

  const [clientProjections, setClientProjections] = useState<Record<string, Record<number, number>>>(() => {
    const initial: Record<string, Record<number, number>> = {};
    HISTORICAL_TOP_CLIENTS.forEach(c => {
      initial[String(c.id)] = {};
      [2026, 2027, 2028, 2029, 2030].forEach(y => initial[String(c.id)][Number(y)] = 0);
    });

    try {
      const saved = localStorage.getItem('skg_bi_v10_projections');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initial, ...parsed };
      }
    } catch (e) { console.warn("Erro projections:", e); }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem('skg_bi_v10_actuals', JSON.stringify(actualData));
      localStorage.setItem('skg_bi_v10_projections', JSON.stringify(clientProjections));
    } catch (e) { console.error("Erro storage save:", e); }
  }, [actualData, clientProjections]);

  const currentYearData = useMemo(() => 
    (actualData[String(selectedYear)] || {}) as Record<string, SellerActual>, 
    [actualData, selectedYear]
  );

  const metrics = useMemo(() => {
    let totalMetaAcumulada = 0; 
    let totalRealizadoAcumulado = 0;
    
    const chartData: ChartDataPoint[] = TARGET_GOALS.map(goal => {
      const actual = currentYearData[String(goal.month)] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
      const real = (Number(actual.syllas) || 0) + (Number(actual.v1) || 0) + (Number(actual.v2) || 0) + (Number(actual.v3) || 0);
      totalMetaAcumulada += (Number(goal.total) || 0); 
      totalRealizadoAcumulado += real;
      return { 
        month: String(goal.month), 
        meta: Number(goal.total) || 0, 
        realizado: Number(real) || 0, 
        percentage: goal.total > 0 ? (real / goal.total) * 100 : 0 
      };
    });

    const monthGoal = TARGET_GOALS.find(g => String(g.month) === String(selectedMonth)) || TARGET_GOALS[0];
    const monthActual = currentYearData[String(selectedMonth)] || { syllas: 0, v1: 0, v2: 0, v3: 0 };

    const sellersMonthSummary = SELLERS.map(s => {
      const k = s.id as keyof SellerActual;
      const meta = Number((monthGoal as any)[k]) || 0;
      const real = Number(monthActual[k]) || 0;
      return {
        id: String(s.id),
        name: String(s.label),
        meta: Number(meta),
        realizado: Number(real),
        atingimento: meta > 0 ? (real / meta) * 100 : real > 0 ? 100 : 0
      };
    });

    const bestSellerMonth = sellersMonthSummary.length > 0 
      ? sellersMonthSummary.reduce((prev, curr) => (curr.realizado > prev.realizado ? curr : prev), sellersMonthSummary[0])
      : { name: 'N/A', realizado: 0 };

    return { 
      totalMetaAcumulada: Number(totalMetaAcumulada), 
      totalRealizadoAcumulado: Number(totalRealizadoAcumulado), 
      overallPercentage: totalMetaAcumulada > 0 ? (totalRealizadoAcumulado / totalMetaAcumulada) * 100 : 0, 
      chartData, 
      sellersMonthSummary, 
      bestSellerMonth,
      monthGoal
    };
  }, [currentYearData, selectedMonth]);

  const clientAnalysis = useMemo(() => {
    const analysis = HISTORICAL_TOP_CLIENTS.map(client => {
      const v2025 = Number(client.history[2025]) || 0;
      const v2024 = Number(client.history[2024]) || 0;
      const growth = v2024 > 0 ? ((v2025 - v2024) / v2024) * 100 : 0;
      
      let status: 'STAR' | 'CHURN' | 'STABLE' | 'ATTENTION' = 'STABLE';
      if (v2025 > v2024 * 1.3 && v2025 > 0) status = 'STAR';
      else if (v2025 < v2024 * 0.7 && v2025 > 0) status = 'CHURN';
      if (v2025 === 0 && v2024 > 0) status = 'ATTENTION';

      const trendData = [...HISTORICAL_YEARS, 2026, 2027, 2028, 2029, 2030].map(y => ({
        year: Number(y),
        value: Number((client.history[y] || 0) || (clientProjections[String(client.id)]?.[y] || 0)),
        isProjection: y > 2025
      }));

      return { 
        ...client, 
        name: String(client.name),
        status, 
        growth, 
        v2025, 
        v2024, 
        trendData 
      };
    }).sort((a, b) => (Number(b.v2025) || 0) - (Number(a.v2025) || 0));

    const totalRealT20 = analysis.reduce((acc, c) => acc + (Number(c.v2025) || 0), 0);
    const paretoData = analysis.map((c, i) => ({
      name: String(c.name).split(' ')[0],
      value: Number(c.v2025),
      cumulative: totalRealT20 > 0 ? (analysis.slice(0, i + 1).reduce((acc, curr) => acc + (Number(curr.v2025) || 0), 0) / totalRealT20) * 100 : 0
    }));

    return { analysis, totalRealT20, paretoData };
  }, [clientProjections]);

  const fetchDailyReport = async () => {
    const env = (window as any).process?.env || {};
    const apiKey = env.API_KEY || '';

    if (!apiKey) {
      setDailyReport("Conexão V4: API Key não detectada no ambiente.");
      return;
    }

    setIsConsulting(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Consultor V4 SK-G: Faturamento ${selectedYear} em ${metrics.overallPercentage.toFixed(1)}%. Mês ${selectedMonth}. Gere 3 insights industriais imediatos.`;
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt, 
        config: { tools: [{ googleSearch: {} }] } 
      });
      setDailyReport(String(response.text || "Insights offline."));
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setGroundingLinks(chunks.filter((c: any) => c.web).map((c: any) => ({ 
        title: String(c.web.title || "Link"), 
        uri: String(c.web.uri || "#") 
      })));
    } catch (e) { 
      setDailyReport("Erro na consultoria estratégica industrial."); 
    } finally { setIsConsulting(false); }
  };

  const handleInputChange = (month: string, seller: string, value: string) => {
    const numValue = parseNum(value);
    setActualData(prev => {
      const yearData = prev[String(selectedYear)] || {};
      const monthData = yearData[String(month)] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
      return {
        ...prev,
        [String(selectedYear)]: {
          ...yearData,
          [String(month)]: { ...monthData, [String(seller)]: numValue }
        }
      };
    });
  };

  const parseNum = (val: string | number) => {
    if (val === undefined || val === null || val === '') return 0;
    let clean = val.toString().replace(/[R$\s.]/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  const handleClientValueChange = (clientId: string, year: number, value: string) => {
    const numValue = parseNum(value);
    setClientProjections(prev => ({
      ...prev,
      [String(clientId)]: {
        ...(prev[String(clientId)] || {}),
        [Number(year)]: numValue
      }
    }));
  };

  const COLORS = ['#ef4444', '#10b981', '#3b82f6', '#a855f7'];

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-gray-100 pb-24">
      <header className="bg-[#cc1d1d] shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4 border-b border-red-800">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/Ky5zDy2.png" alt="SK-G" className="h-10 bg-white p-1 rounded-md" />
          <div className="hidden sm:block text-white">
            <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none">SK-G Automação</h1>
            <p className="text-[9px] uppercase font-black opacity-80 tracking-widest mt-1">Industrial Growth BI</p>
          </div>
        </div>

        <nav className="flex bg-red-900/40 p-1 rounded-xl border border-red-500/30 overflow-x-auto max-w-full">
          {['goals', 'clients', 'growth'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all uppercase whitespace-nowrap ${activeTab === tab ? 'bg-white text-red-700' : 'text-white/70 hover:bg-red-700/40'}`}>
              {tab === 'goals' ? 'Faturamento' : tab === 'clients' ? 'Top 20 Clientes' : 'Estratégia V4'}
            </button>
          ))}
        </nav>
        
        <div className="flex items-center gap-2 bg-red-800/40 p-1 rounded-xl border border-red-500/30">
          {YEARS.slice(0, 3).map(yr => (
            <button key={yr} onClick={() => setSelectedYear(String(yr))} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedYear === String(yr) ? 'bg-white text-red-700' : 'text-white/50 hover:text-white'}`}>{String(yr)}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-[1700px] mx-auto w-full">
        {activeTab === 'goals' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Realizado Total" value={String(formatBRL(metrics.totalRealizadoAcumulado))} subtitle={String(`Exercício ${selectedYear}`)} color="text-emerald-400" />
              <Card title="Atingimento" value={String(`${metrics.overallPercentage.toFixed(1)}%`)} subtitle="Meta Empresa" color="text-amber-400" />
              <Card title="Top Vendas Mês" value={String(metrics.bestSellerMonth.name).split(' ')[0]} subtitle={String(formatBRL(metrics.bestSellerMonth.realizado || 0))} color="text-blue-400" />
              <Card title="Gap p/ Meta" value={String(formatBRL(Math.max(0, metrics.totalMetaAcumulada - metrics.totalRealizadoAcumulado)))} subtitle="Volume Faltante" color="text-red-400" />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-black uppercase italic"><span className="w-1.5 h-6 bg-red-600 rounded-full inline-block mr-2"></span>Meta vs Realizado</h3>
                   <select value={selectedMonth} onChange={e => setSelectedMonth(String(e.target.value))} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-1 text-xs font-black text-red-500 uppercase outline-none cursor-pointer">
                     {MONTHS.map(m => <option key={m} value={String(m)}>{String(m)}</option>)}
                   </select>
                 </div>
                 <div className="h-[350px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={metrics.chartData}>
                       <CartesianGrid stroke="#1f2937" vertical={false} />
                       <XAxis dataKey="month" stroke="#4b5563" fontSize={11} tickMargin={10} />
                       <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                       <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                       <Legend wrapperStyle={{paddingTop: '20px'}} />
                       <Bar dataKey="meta" name="Meta" fill="#1e3a8a" radius={[4,4,0,0]} barSize={35} />
                       <Bar dataKey="realizado" name="Realizado" fill="#10b981" radius={[4,4,0,0]} barSize={35} />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl flex flex-col">
                 <h3 className="text-lg font-black mb-8 uppercase italic"><span className="w-1.5 h-6 bg-red-600 rounded-full inline-block mr-2"></span>Performance Vendedores</h3>
                 <div className="space-y-8 flex-1 overflow-y-auto">
                   {metrics.sellersMonthSummary.map((s) => (
                     <div key={String(s.id)} className="space-y-3 pr-2">
                       <div className="flex justify-between items-end">
                         <div>
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{String(s.name)}</p>
                           <p className="text-sm font-black text-white">{String(formatBRL(s.realizado))}</p>
                         </div>
                         <span className={`text-sm font-black italic ${s.atingimento >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                           {String(s.atingimento.toFixed(1))}%
                         </span>
                       </div>
                       <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-800 shadow-inner">
                         <div 
                          className={`h-full transition-all duration-1000 ${s.atingimento >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : s.atingimento >= 80 ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}
                          style={{ width: `${Math.min(100, s.atingimento)}%` }}
                         />
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            </section>

            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 bg-gray-950/40 text-white flex justify-between items-center">
                <h3 className="text-lg font-black uppercase italic tracking-widest">Painel de Lançamento Direto ({String(selectedYear)})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#0b0e14] text-gray-500 text-[10px] uppercase font-black border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-5 sticky left-0 bg-[#0b0e14] z-10">Mês</th>
                      {SELLERS.map(s => <th key={String(s.id)} className="px-4 py-5 text-center">{String(s.label)}</th>)}
                      <th className="px-6 py-5 text-center bg-gray-900/40">Realizado</th>
                      <th className="px-6 py-5 text-center">Meta Empresa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {TARGET_GOALS.map((goal) => {
                      const actual = currentYearData[String(goal.month)] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
                      const totalReal = (Number(actual.syllas) || 0) + (Number(actual.v1) || 0) + (Number(actual.v2) || 0) + (Number(actual.v3) || 0);
                      return (
                        <tr key={String(goal.month)} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 font-black text-gray-400 sticky left-0 bg-[#12161f] z-10 border-r border-gray-800/20">{String(goal.month)}</td>
                          {SELLERS.map((s) => (
                            <td key={String(s.id)} className="px-2 py-2">
                              <input 
                                type="text" 
                                className="bg-[#1a1f29] border border-gray-800 rounded-lg px-3 py-3 w-full text-center font-bold text-white transition-all outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-700"
                                placeholder="0,00" 
                                value={(actual as any)[String(s.id)] > 0 ? (actual as any)[String(s.id)].toLocaleString('pt-BR') : ''}
                                onChange={(e) => handleInputChange(String(goal.month), String(s.id), e.target.value)} 
                              />
                            </td>
                          ))}
                          <td className="px-6 py-4 text-center font-black text-emerald-400 bg-gray-900/30">{String(formatBRL(totalReal))}</td>
                          <td className="px-6 py-4 text-center text-gray-500 font-bold opacity-60">{String(formatBRL(goal.total))}</td>
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
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden relative">
                 <h3 className="text-lg font-black mb-6 uppercase italic"><span className="w-1.5 h-6 bg-red-600 rounded-full inline-block mr-2"></span>Top 5: Tendência Histórica</h3>
                 <div className="h-[400px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={HISTORICAL_YEARS.concat([2026, 2027, 2028, 2029, 2030]).map(y => {
                       const obj: any = { year: Number(y) };
                       clientAnalysis.analysis.slice(0, 5).forEach(c => {
                         obj[String(c.name)] = Number((c.history[Number(y)] || 0) || (clientProjections[String(c.id)]?.[Number(y)] || 0));
                       });
                       return obj;
                     })}>
                       <CartesianGrid stroke="#1f2937" vertical={false} />
                       <XAxis dataKey="year" stroke="#4b5563" fontSize={11} />
                       <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                       <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} formatter={(v: number) => String(formatBRL(v))} />
                       <Legend verticalAlign="top" align="right" wrapperStyle={{paddingBottom: '20px'}} />
                       <ReferenceLine x={2025.5} stroke="#cc1d1d" strokeDasharray="3 3" />
                       {clientAnalysis.analysis.slice(0, 5).map((c, i) => (
                         <Line key={String(c.id)} type="monotone" dataKey={String(c.name)} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{r: 4}} />
                       ))}
                     </LineChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden">
                 <h3 className="text-lg font-black mb-6 uppercase italic"><span className="w-1.5 h-6 bg-red-600 rounded-full inline-block mr-2"></span>Pareto T20: Concentração</h3>
                 <div className="h-[400px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={clientAnalysis.paretoData}>
                       <CartesianGrid stroke="#1f2937" vertical={false}/>
                       <XAxis dataKey="name" hide />
                       <YAxis stroke="#4b5563" fontSize={10} />
                       <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                       <Bar dataKey="value" name="Volume" fill="#1e3a8a" radius={[4,4,0,0]} />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </section>

            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 bg-gray-950/40 text-white flex justify-between items-center">
                <h3 className="text-lg font-black uppercase italic tracking-widest">Matriz Decenal de Clientes (2021-2030)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-[#0b0e14] text-gray-500 font-black uppercase border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-4 min-w-[220px] sticky left-0 bg-[#0b0e14] z-20">Cliente / Status</th>
                      {HISTORICAL_YEARS.map(y => <th key={String(y)} className="px-3 py-4 text-center">{String(y)}</th>)}
                      {YEARS.map(y => <th key={String(y)} className="px-3 py-4 text-center bg-red-900/10 text-red-200">{String(y)} (Proj.)</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {clientAnalysis.analysis.map(client => (
                      <tr key={String(client.id)} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 sticky left-0 bg-[#12161f] z-10 border-r border-gray-800/50">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-300 uppercase leading-tight truncate max-w-[200px]">{String(client.name)}</span>
                            <div className="flex gap-2 mt-1">
                               {client.status === 'STAR' && <span className="text-emerald-400 text-[8px] font-black tracking-tighter">🚀 ESTRELA</span>}
                               {client.status === 'CHURN' && <span className="text-red-400 text-[8px] font-black tracking-tighter">📉 RISCO</span>}
                               {client.status === 'ATTENTION' && <span className="text-amber-400 text-[8px] font-black tracking-tighter">⚠️ ATENÇÃO</span>}
                            </div>
                          </div>
                        </td>
                        {HISTORICAL_YEARS.map(y => (
                          <td key={String(y)} className="px-3 py-3 text-center font-bold text-gray-500 opacity-60">
                            {Number(client.history[Number(y)]) > 0 ? String(formatBRL(Number(client.history[Number(y)]))) : '-'}
                          </td>
                        ))}
                        {YEARS.map(y => (
                          <td key={String(y)} className="px-2 py-2 bg-red-900/5">
                            <input 
                              type="text" 
                              className="bg-gray-950/30 border border-gray-800/50 rounded px-2 py-1.5 w-full text-center font-black text-red-200 outline-none focus:ring-1 focus:ring-red-500 placeholder-red-900/30"
                              placeholder="0"
                              value={(clientProjections[String(client.id)] && Number(clientProjections[String(client.id)][Number(y)]) > 0) ? Number(clientProjections[String(client.id)][Number(y)]).toLocaleString('pt-BR') : ''}
                              onChange={e => handleClientValueChange(String(client.id), Number(y), e.target.value)}
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
          <div className="animate-in fade-in duration-700 space-y-8">
            <div className="bg-[#12161f] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
               <div className="p-6 bg-gradient-to-r from-gray-900 to-black flex justify-between items-center text-white border-b border-gray-800">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white text-red-600 border-2 border-red-600 shadow-xl font-black text-xl italic">V4</div>
                   <div>
                     <h2 className="text-xl font-black uppercase italic leading-none">Consultoria Growth V4</h2>
                     <p className="text-[9px] font-black opacity-60 uppercase tracking-widest mt-1">Inteligência Estratégica SK-G</p>
                   </div>
                 </div>
                 <button onClick={fetchDailyReport} disabled={isConsulting} className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50">
                   {isConsulting ? 'Consultando...' : 'Atualizar Insights'}
                 </button>
               </div>
               <div className="p-8">
                  {dailyReport ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 prose prose-invert max-w-none text-gray-300 bg-black/30 p-8 rounded-3xl border border-white/5">
                        {String(dailyReport).split('\n').map((line, i) => (
                          <p key={Number(i)} className="mb-4 leading-relaxed">{String(line)}</p>
                        ))}
                      </div>
                      <div className="space-y-6">
                        <div className="bg-gray-950 p-6 rounded-3xl border border-gray-800 shadow-xl">
                          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 italic">Mercado Industrial</h4>
                          <div className="space-y-3">
                            {groundingLinks.length > 0 ? groundingLinks.map((link, i) => (
                              <a key={Number(i)} href={String(link.uri)} target="_blank" rel="noreferrer" className="block p-3 bg-white/5 rounded-xl border border-white/5 hover:border-red-600 transition-colors group">
                                <p className="text-[10px] text-gray-400 font-bold truncate group-hover:text-red-400">{String(link.title)}</p>
                              </a>
                            )) : <p className="text-[10px] text-gray-600 italic">Sincronize para ver fontes.</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-24 text-center">
                      <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800">
                        <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="italic text-gray-500 font-black uppercase tracking-widest text-sm">Consultoria de Growth desligada. Clique para iniciar.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#008f39] p-4 z-50 shadow-2xl border-t border-emerald-400/20">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row justify-between items-center text-white gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-lg font-black text-[10px] flex flex-col items-center leading-none">
               <span>SK-G</span><span>BI</span>
             </div>
             <div className="text-xs font-bold uppercase tracking-widest leading-none">
               <span className="opacity-60">Status {String(selectedYear)}:</span> <span className="text-white">{String(formatBRL(metrics.totalRealizadoAcumulado))}</span>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end leading-none">
               <span className="text-[8px] uppercase font-black opacity-60 mb-1">Performance V4</span>
               <span className="text-xl font-black tracking-tighter">{String(metrics.overallPercentage.toFixed(1))}% de Atingimento</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente Card com defesas extras de tipo
const Card: React.FC<{title: string; value: string; subtitle: string; color: string;}> = ({ title, value, subtitle, color }) => (
  <div className="bg-[#12161f] border border-gray-800 p-6 rounded-3xl shadow-xl hover:border-red-600/30 transition-all group overflow-hidden relative">
    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 -mr-12 -mt-12 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all"></div>
    <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 italic opacity-70 leading-none">{String(title)}</h4>
    <p className={`text-3xl font-black ${String(color)} tracking-tighter leading-tight`}>{String(value)}</p>
    <p className="text-gray-600 text-[9px] mt-2 font-bold uppercase tracking-tight opacity-70">{String(subtitle)}</p>
  </div>
);

export default App;
