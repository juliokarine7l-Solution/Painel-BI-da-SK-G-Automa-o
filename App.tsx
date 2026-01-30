
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, ComposedChart, ReferenceLine, Cell
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { TARGET_GOALS, MONTHS, SELLERS, YEARS, HISTORICAL_TOP_CLIENTS, HISTORICAL_YEARS } from './constants';
import { YearlyActualData, ChartDataPoint, SellerActual } from './types';

// Helper for formatting currency with string safety (React Error #31 protection)
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
  
  // AI State
  const [isConsulting, setIsConsulting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dailyReport, setDailyReport] = useState<string | null>(() => {
    return localStorage.getItem('skg_bi_v10_cached_insight') || null;
  });
  const [groundingLinks, setGroundingLinks] = useState<{title: string, uri: string}[]>(() => {
    try {
      const saved = localStorage.getItem('skg_bi_v10_cached_links');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [lastUpdate, setLastUpdate] = useState<string | null>(() => {
    return localStorage.getItem('skg_bi_v10_cached_timestamp') || null;
  });

  // Sales Data State
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
      if (saved) return { ...initial, ...JSON.parse(saved) };
    } catch (e) { console.warn("Local storage error:", e); }
    return initial;
  });

  // Projections State for Top 20 Clients
  const [clientProjections, setClientProjections] = useState<Record<string, Record<number, number>>>(() => {
    const initial: Record<string, Record<number, number>> = {};
    HISTORICAL_TOP_CLIENTS.forEach(c => {
      initial[String(c.id)] = {};
      [2026, 2027, 2028, 2029, 2030].forEach(y => initial[String(c.id)][Number(y)] = 0);
    });
    try {
      const saved = localStorage.getItem('skg_bi_v10_projections');
      if (saved) return { ...initial, ...JSON.parse(saved) };
    } catch (e) { console.warn("Projections storage error:", e); }
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('skg_bi_v10_actuals', JSON.stringify(actualData));
    localStorage.setItem('skg_bi_v10_projections', JSON.stringify(clientProjections));
  }, [actualData, clientProjections]);

  // Derived Metrics - Faturamento
  const metrics = useMemo(() => {
    let totalMetaAcumulada = 0; 
    let totalRealizadoAcumulado = 0;
    const currentYearActuals = actualData[selectedYear] || {};
    
    const chartData: ChartDataPoint[] = TARGET_GOALS.map(goal => {
      const actual = currentYearActuals[goal.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
      const real = (Number(actual.syllas) || 0) + (Number(actual.v1) || 0) + (Number(actual.v2) || 0) + (Number(actual.v3) || 0);
      totalMetaAcumulada += (Number(goal.total) || 0); 
      totalRealizadoAcumulado += real;
      return { 
        month: goal.month, 
        meta: goal.total, 
        realizado: real, 
        percentage: goal.total > 0 ? (real / goal.total) * 100 : 0 
      };
    });

    const monthGoal = TARGET_GOALS.find(g => g.month === selectedMonth) || TARGET_GOALS[0];
    const monthActual = currentYearActuals[selectedMonth] || { syllas: 0, v1: 0, v2: 0, v3: 0 };

    const sellersMonthSummary = SELLERS.map(s => {
      const meta = Number((monthGoal as any)[s.id]) || 0;
      const real = Number((monthActual as any)[s.id]) || 0;
      return {
        id: s.id,
        name: s.label,
        meta,
        realizado: real,
        atingimento: meta > 0 ? (real / meta) * 100 : real > 0 ? 100 : 0
      };
    });

    return { 
      totalMetaAcumulada, 
      totalRealizadoAcumulado, 
      overallPercentage: totalMetaAcumulada > 0 ? (totalRealizadoAcumulado / totalMetaAcumulada) * 100 : 0, 
      chartData, 
      sellersMonthSummary,
      bestSellerMonth: sellersMonthSummary.reduce((prev, curr) => (curr.realizado > prev.realizado ? curr : prev), sellersMonthSummary[0])
    };
  }, [actualData, selectedYear, selectedMonth]);

  // Derived Metrics - Top 20 Clients & Diagnostics
  const clientAnalysis = useMemo(() => {
    const analysis = HISTORICAL_TOP_CLIENTS.map(client => {
      const v2025 = client.history[2025] || 0;
      const v2024 = client.history[2024] || 0;
      const v2023 = client.history[2023] || 0;
      
      // Churn Risk: Fall > 20% vs prev year
      // Rising Star: Significant continuous growth
      let status: 'STAR' | 'CHURN' | 'STABLE' | 'ATTENTION' = 'STABLE';
      if (v2025 > v2024 * 1.3 && v2024 > 0) status = 'STAR';
      else if (v2025 < v2024 * 0.8 && v2024 > 0) status = 'CHURN';
      else if (v2025 === 0 && v2024 > 0) status = 'ATTENTION';

      const trendData = [...HISTORICAL_YEARS, 2026, 2027, 2028, 2029, 2030].map(y => {
        const value = (client.history[y] || 0) || (clientProjections[client.id]?.[y] || 0);
        return {
          year: y,
          value,
          isProjection: y > 2025
        };
      });

      return { ...client, v2025, v2024, v2023, status, trendData };
    }).sort((a, b) => b.v2025 - a.v2025);

    const totalRealT20 = analysis.reduce((acc, c) => acc + c.v2025, 0);
    const paretoData = analysis.map((c, i) => {
      const cumulativeSum = analysis.slice(0, i + 1).reduce((sum, curr) => sum + curr.v2025, 0);
      return {
        name: c.name.split(' ')[0],
        value: c.v2025,
        cumulative: totalRealT20 > 0 ? (cumulativeSum / totalRealT20) * 100 : 0
      };
    });

    return { analysis, totalRealT20, paretoData };
  }, [clientProjections]);

  // AI Function - Manual Trigger
  const fetchDailyReport = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setApiError("Chave de API não detectada.");
      return;
    }

    setIsConsulting(true);
    setApiError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const topClientsNames = clientAnalysis.analysis.slice(0, 5).map(c => String(c.name)).join(', ');
      
      const prompt = `
        Atue como Consultor Sênior de Growth da V4 Company para a SK-G Automação Industrial.
        DIRETRIZES FIXAS: Foco em VO2 Industrial, Longevidade e Performance [Ref: 2025-12-20].
        
        Contexto Industrial:
        - Meta Anual 2026: R$ 2.180.000
        - Desempenho Atual: ${String(metrics.overallPercentage.toFixed(1))}% da meta atingida.
        - Volume Realizado: ${formatBRL(metrics.totalRealizadoAcumulado)}
        - Principais Clientes (T20): ${String(topClientsNames)}.
        
        Objetivo:
        1. Diagnosticar riscos de churn baseado no histórico recente.
        2. Sugerir 3 ações táticas de growth para o próximo trimestre.
        3. Identificar tendências de mercado industrial (usando Google Search) que afetam nossos clientes estrela (ex: Fertipar, Maccaferri).
        
        Seja técnico, direto e evite introduções longas.
      `;

      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt, 
        config: { 
          tools: [{ googleSearch: {} }],
          temperature: 0.7
        } 
      });

      const text = String(response.text || "Análise concluída, mas sem texto de retorno.");
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const links = chunks.filter((c: any) => c.web).map((c: any) => ({ 
        title: String(c.web.title || "Fonte Industrial"), 
        uri: String(c.web.uri || "#") 
      }));
      const timestamp = new Date().toLocaleString('pt-BR');

      setDailyReport(text);
      setGroundingLinks(links);
      setLastUpdate(timestamp);

      localStorage.setItem('skg_bi_v10_cached_insight', text);
      localStorage.setItem('skg_bi_v10_cached_links', JSON.stringify(links));
      localStorage.setItem('skg_bi_v10_cached_timestamp', timestamp);

    } catch (e: any) {
      console.error("Growth API Error:", e);
      if (e.message?.includes('429') || e.status === 429) {
        setApiError("Sistema em resfriamento. Tente novamente em 1 minuto.");
      } else {
        setApiError("Falha na conexão estratégica. Verifique sua rede.");
      }
    } finally {
      setIsConsulting(false);
    }
  };

  const parseNum = (val: string) => {
    let clean = val.replace(/[R$\s.]/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  const handleInputChange = (month: string, seller: string, value: string) => {
    const numValue = parseNum(value);
    setActualData(prev => ({
      ...prev,
      [selectedYear]: {
        ...(prev[selectedYear] || {}),
        [month]: { ...(prev[selectedYear]?.[month] || { syllas: 0, v1: 0, v2: 0, v3: 0 }), [seller]: numValue }
      }
    }));
  };

  const handleClientValueChange = (clientId: string, year: number, value: string) => {
    const numValue = parseNum(value);
    setClientProjections(prev => ({
      ...prev,
      [clientId]: { ...(prev[clientId] || {}), [year]: numValue }
    }));
  };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Mês;Syllas;V1;V2;V3;Total\n";
    TARGET_GOALS.forEach(goal => {
      const actual = (actualData[selectedYear] || {})[goal.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
      const total = Object.values(actual).reduce((a: number, b) => a + Number(b), 0);
      csvContent += `${goal.month};${actual.syllas};${actual.v1};${actual.v2};${actual.v3};${total}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SKG_Faturamento_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-gray-100 pb-24">
      <header className="bg-[#cc1d1d] shadow-2xl p-4 flex flex-col lg:flex-row items-center justify-between sticky top-0 z-50 gap-4 border-b border-red-800">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/Ky5zDy2.png" alt="SK-G" className="h-10 bg-white p-1 rounded-md" />
          <div className="hidden sm:block">
            <h1 className="text-xl font-black uppercase italic text-white tracking-tighter leading-none">SK-G Automação</h1>
            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mt-1">Industrial Intelligence BI</p>
          </div>
        </div>

        <nav className="flex bg-red-900/40 p-1 rounded-xl border border-red-500/30 overflow-x-auto max-w-full">
          {[
            { id: 'goals', label: 'Dashboard Geral' },
            { id: 'clients', label: 'Top 20 Clientes' },
            { id: 'growth', label: 'Estratégia V4' }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-red-700 shadow-lg' : 'text-white/70 hover:bg-red-700/40'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="flex items-center gap-2 bg-red-800/40 p-1 rounded-xl border border-red-500/30">
          {YEARS.slice(0, 3).map(yr => (
            <button 
              key={yr} 
              onClick={() => setSelectedYear(yr)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedYear === yr ? 'bg-white text-red-700' : 'text-white/50 hover:text-white'}`}
            >
              {yr}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto w-full">
        {activeTab === 'goals' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Realizado Total" value={String(formatBRL(metrics.totalRealizadoAcumulado))} subtitle={String(`Exercício ${selectedYear}`)} color="text-emerald-400" icon="💰" />
              <Card title="Atingimento Anual" value={String(`${metrics.overallPercentage.toFixed(1)}%`)} subtitle="Meta R$ 2.18M" color="text-amber-400" icon="📈" />
              <Card title="Melhor Vendedor" value={String(metrics.bestSellerMonth.name.split(' ')[0])} subtitle={String(formatBRL(metrics.bestSellerMonth.realizado))} color="text-blue-400" icon="🏆" />
              <Card title="Gap p/ Meta" value={String(formatBRL(Math.max(0, metrics.totalMetaAcumulada - metrics.totalRealizadoAcumulado)))} subtitle="Volume Pendente" color="text-red-400" icon="🎯" />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden relative group">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-black uppercase italic tracking-widest"><span className="text-red-600 mr-2">/</span>Meta vs Realizado</h3>
                   <select 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value)} 
                    className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-xs font-black text-red-500 outline-none cursor-pointer hover:border-red-600 transition-colors"
                   >
                     {MONTHS.map(m => <option key={m} value={m}>{String(m)}</option>)}
                   </select>
                 </div>
                 <div className="h-[380px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={metrics.chartData}>
                       <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                       <XAxis dataKey="month" stroke="#4b5563" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                       <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} axisLine={false} tickLine={false} />
                       <Tooltip cursor={{fill: '#1a1f29'}} contentStyle={{backgroundColor: '#030712', border: '1px solid #374151', borderRadius: '12px'}} />
                       <Legend verticalAlign="top" align="right" wrapperStyle={{paddingBottom: '20px'}} />
                       <Bar dataKey="meta" name="Meta Estipulada" fill="#1e3a8a" radius={[4,4,0,0]} barSize={35} />
                       <Bar dataKey="realizado" name="Volume Realizado" fill="#10b981" radius={[4,4,0,0]} barSize={35} />
                       <Line type="monotone" dataKey="realizado" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl flex flex-col relative overflow-hidden">
                 <h3 className="text-lg font-black mb-8 uppercase italic tracking-widest"><span className="text-red-600 mr-2">/</span>Performance Equipe</h3>
                 <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                   {metrics.sellersMonthSummary.map((s) => (
                     <div key={s.id} className="space-y-3">
                       <div className="flex justify-between items-end">
                         <div className="flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{String(s.name)}</span>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-white">{String(formatBRL(s.realizado))}</span>
                            <span className={`text-[10px] font-black italic ${s.atingimento >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {String(s.atingimento.toFixed(1))}% da Meta
                            </span>
                         </div>
                       </div>
                       <div className="h-3 bg-gray-900 rounded-full border border-gray-800 overflow-hidden shadow-inner">
                         <div 
                          className={`h-full transition-all duration-1000 ${s.atingimento >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : s.atingimento >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${Math.min(100, s.atingimento)}%` }} 
                         />
                       </div>
                     </div>
                   ))}
                 </div>
                 <div className="mt-8 pt-6 border-t border-gray-800">
                    <button onClick={exportCSV} className="w-full py-3 bg-gray-900 hover:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-800">
                      📦 Exportar Relatório Consolidado (CSV)
                    </button>
                 </div>
              </div>
            </section>

            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden border-t-2 border-t-red-600">
              <div className="p-6 border-b border-gray-800 bg-gray-950/40 flex justify-between items-center">
                <h3 className="text-lg font-black uppercase italic tracking-widest text-white">Lançamento Direto de Vendas ({String(selectedYear)})</h3>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-900 px-3 py-1 rounded-full">Edição Ativa</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#0b0e14] text-gray-500 text-[10px] uppercase font-black border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-5 sticky left-0 bg-[#0b0e14] z-10">Mês do Exercício</th>
                      {SELLERS.map(s => <th key={s.id} className="px-4 py-5 text-center">{String(s.label)}</th>)}
                      <th className="px-6 py-5 text-center bg-gray-900/40">Realizado</th>
                      <th className="px-6 py-5 text-center text-red-500/50">Meta Mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {TARGET_GOALS.map((goal) => {
                      const actual = (actualData[selectedYear] || {})[goal.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
                      const totalReal = Object.values(actual).reduce((a: number, b) => a + (Number(b) || 0), 0);
                      return (
                        <tr key={goal.month} className="hover:bg-white/[0.01] transition-colors group">
                          <td className="px-6 py-4 font-black text-gray-400 sticky left-0 bg-[#12161f] z-10 border-r border-gray-800/20 group-hover:text-red-500 transition-colors">{String(goal.month)}</td>
                          {SELLERS.map((s) => (
                            <td key={s.id} className="px-2 py-2">
                              <input 
                                type="text" 
                                className="bg-[#1a1f29] border border-gray-800 rounded-lg px-3 py-3 w-full text-center font-bold text-white outline-none focus:ring-1 focus:ring-red-600 transition-all placeholder-gray-800"
                                placeholder="0,00" 
                                value={(actual as any)[s.id] > 0 ? (actual as any)[s.id].toLocaleString('pt-BR') : ''}
                                onChange={(e) => handleInputChange(goal.month, s.id, e.target.value)} 
                              />
                            </td>
                          ))}
                          <td className="px-6 py-4 text-center font-black text-emerald-400 bg-gray-900/30">{String(formatBRL(totalReal))}</td>
                          <td className="px-6 py-4 text-center text-gray-500 font-bold opacity-60 italic">{String(formatBRL(goal.total))}</td>
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
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden h-[450px]">
                 <h3 className="text-lg font-black mb-6 uppercase italic tracking-widest"><span className="text-red-600 mr-2">/</span>Tendência Histórica vs Projeção</h3>
                 <div className="h-full pb-8">
                   <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={HISTORICAL_YEARS.concat([2026, 2027, 2028, 2029, 2030]).map(y => {
                       const obj: any = { year: y };
                       clientAnalysis.analysis.slice(0, 4).forEach(c => {
                         obj[c.name] = (c.history[y] || 0) || (clientProjections[c.id]?.[y] || 0);
                       });
                       return obj;
                     })}>
                       <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                       <XAxis dataKey="year" stroke="#4b5563" fontSize={11} />
                       <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                       <Tooltip 
                        contentStyle={{backgroundColor: '#030712', border: '1px solid #374151', borderRadius: '12px'}} 
                        formatter={(v: any) => formatBRL(Number(v))}
                       />
                       <Legend verticalAlign="top" align="right" />
                       <ReferenceLine x={2025} stroke="#cc1d1d" strokeDasharray="5 5" label={{ value: 'Projeção', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
                       {clientAnalysis.analysis.slice(0, 4).map((c, i) => (
                         <Line 
                          key={c.id} 
                          type="monotone" 
                          dataKey={c.name} 
                          stroke={['#ef4444', '#10b981', '#3b82f6', '#a855f7'][i]} 
                          strokeWidth={3} 
                          dot={{r: 4}} 
                          strokeDasharray={ (y: number) => y > 2025 ? '5 5' : '0' }
                         />
                       ))}
                     </LineChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden h-[450px]">
                 <h3 className="text-lg font-black mb-6 uppercase italic tracking-widest"><span className="text-red-600 mr-2">/</span>Pareto de Representatividade T20</h3>
                 <div className="h-full pb-8">
                   <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={clientAnalysis.paretoData}>
                       <CartesianGrid stroke="#1f2937" vertical={false} />
                       <XAxis dataKey="name" hide />
                       <YAxis yAxisId="left" stroke="#4b5563" fontSize={10} />
                       <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} tickFormatter={v => `${v}%`} />
                       <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                       <Bar yAxisId="left" dataKey="value" name="Volume Anual" fill="#1e3a8a" radius={[4,4,0,0]}>
                         {clientAnalysis.paretoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value > 100000 ? '#10b981' : '#1e3a8a'} />
                          ))}
                       </Bar>
                       <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Acumulado %" stroke="#10b981" strokeWidth={3} dot={{r: 3}} />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </section>

            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden border-t-2 border-t-emerald-600">
              <div className="p-6 border-b border-gray-800 bg-gray-950/40 flex justify-between items-center">
                <h3 className="text-lg font-black uppercase italic tracking-widest text-white">Matriz de Performance e Projeção Decenal (2021-2030)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-[#0b0e14] text-gray-500 font-black uppercase border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-4 min-w-[240px] sticky left-0 bg-[#0b0e14] z-20">Cliente / Status Estratégico</th>
                      {HISTORICAL_YEARS.map(y => <th key={y} className="px-3 py-4 text-center">{String(y)}</th>)}
                      {YEARS.map(y => <th key={y} className="px-3 py-4 text-center bg-red-900/10 text-red-200">{String(y)} (Proj.)</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {clientAnalysis.analysis.map(client => (
                      <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 sticky left-0 bg-[#12161f] z-10 border-r border-gray-800/50">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-300 uppercase leading-tight truncate max-w-[220px]">{String(client.name)}</span>
                            <div className="flex gap-2 mt-1">
                               {client.status === 'STAR' && <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20">🚀 ESTRELA</span>}
                               {client.status === 'CHURN' && <span className="bg-red-500/10 text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-500/20">📉 RISCO CHURN</span>}
                               {client.status === 'ATTENTION' && <span className="bg-amber-500/10 text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-500/20">⚠️ ATENÇÃO</span>}
                               {client.status === 'STABLE' && <span className="bg-blue-500/10 text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-blue-500/20">⚖️ ESTÁVEL</span>}
                            </div>
                          </div>
                        </td>
                        {HISTORICAL_YEARS.map(y => {
                          const val = Number(client.history[y]) || 0;
                          return (
                            <td 
                              key={y} 
                              className={`px-3 py-3 text-center font-bold text-gray-500 ${val === 0 ? 'bg-red-500/10 text-red-900/40' : ''}`}
                            >
                              {val > 0 ? String(formatBRL(val)) : '-'}
                            </td>
                          );
                        })}
                        {YEARS.map(y => (
                          <td key={y} className="px-2 py-2 bg-red-900/5">
                            <input 
                              type="text" 
                              className="bg-gray-950/30 border border-gray-800/50 rounded px-2 py-1.5 w-full text-center font-black text-red-200 outline-none focus:ring-1 focus:ring-red-500 placeholder-red-900/20"
                              placeholder="0"
                              value={(clientProjections[client.id] && Number(clientProjections[client.id][Number(y)]) > 0) ? Number(clientProjections[client.id][Number(y)]).toLocaleString('pt-BR') : ''}
                              onChange={e => handleClientValueChange(client.id, Number(y), e.target.value)}
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
            <div className="bg-[#12161f] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden border-t-2 border-t-red-600">
               <div className="p-6 bg-gradient-to-r from-gray-900 to-black flex flex-col md:flex-row justify-between items-center text-white border-b border-gray-800 gap-6">
                 <div className="flex items-center gap-4">
                   <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white text-red-600 border-2 border-red-600 shadow-xl font-black text-2xl italic">V4</div>
                   <div>
                     <h2 className="text-xl font-black uppercase italic leading-none tracking-tighter">Growth Strategy V4</h2>
                     {lastUpdate && <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mt-2">Sincronizado em: {String(lastUpdate)}</p>}
                   </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-2">
                    <button 
                      onClick={fetchDailyReport} 
                      disabled={isConsulting} 
                      className="px-10 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-[0_10px_20px_rgba(220,38,38,0.2)] active:scale-95"
                    >
                      {isConsulting ? 'Sincronizando...' : 'GERAR ANÁLISE V4'}
                    </button>
                    {apiError && <span className="text-[10px] text-red-400 font-black uppercase animate-pulse tracking-tighter">{String(apiError)}</span>}
                 </div>
               </div>

               <div className="p-8">
                  {isConsulting ? (
                    <div className="py-32 text-center">
                       <div className="w-20 h-20 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-inner"></div>
                       <p className="font-black uppercase text-red-500 animate-pulse tracking-widest">Processando Big Data Industrial...</p>
                       <p className="text-[10px] text-gray-600 font-black uppercase mt-2">Cruzando histórico Top 20 com tendências globais</p>
                    </div>
                  ) : dailyReport ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-2 text-gray-300 bg-black/40 p-10 rounded-3xl border border-white/5 whitespace-pre-line leading-relaxed text-base font-medium shadow-inner">
                        <div className="mb-8 border-l-4 border-red-600 pl-6 py-2 bg-red-900/5">
                           <h4 className="text-xs font-black uppercase text-red-500 mb-1">Diagnóstico Executivo</h4>
                           <p className="text-gray-400 italic text-sm">Baseado em VO2 Industrial e Longevidade Estratégica.</p>
                        </div>
                        {String(dailyReport)}
                      </div>
                      <div className="space-y-6">
                        <div className="bg-gray-950 p-6 rounded-3xl border border-gray-800 shadow-xl">
                          <h4 className="text-[11px] font-black text-gray-500 uppercase mb-6 italic tracking-widest border-b border-gray-800 pb-3">Grounding & Notícias 2026</h4>
                          <div className="space-y-4">
                            {groundingLinks.length > 0 ? groundingLinks.map((link, i) => (
                              <a key={String(i)} href={String(link.uri)} target="_blank" rel="noreferrer" className="block p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-red-600 transition-all group hover:bg-red-950/20">
                                <p className="text-[10px] text-gray-400 font-black truncate group-hover:text-red-400 uppercase leading-snug">{String(link.title)}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-[8px] text-gray-700 uppercase font-black truncate max-w-[150px]">{String(link.uri)}</p>
                                  <span className="text-[8px] text-red-500 font-black">LEITURA ↗</span>
                                </div>
                              </a>
                            )) : (
                              <div className="py-12 text-center border-2 border-dashed border-gray-900 rounded-3xl">
                                <p className="text-[9px] text-gray-700 font-black uppercase">Nenhuma fonte indexada.</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-red-900/10 p-6 rounded-3xl border border-red-500/20 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                             <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 11-2 0 1 1 0 012 0zM8 16v-1a1 1 0 10-2 0v1a1 1 0 102 0zM13.464 15.657l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414-1.414zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1z"/></svg>
                           </div>
                           <h4 className="text-[11px] font-black text-red-400 uppercase tracking-widest mb-3 italic">Longevidade VO2</h4>
                           <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
                             Monitoramento em tempo real de churn industrial. O Top 20 deve representar no máximo 70% do faturamento para garantir a saúde do portfólio a longo prazo.
                           </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-40 text-center border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/10">
                      <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800 shadow-xl">
                        <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="italic text-gray-500 font-black uppercase tracking-widest">Estratégia V4 Desconectada.</p>
                      <p className="text-[10px] text-gray-700 mt-3 font-black uppercase">Acione o botão "GERAR ANÁLISE V4" para diagnóstico industrial.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#008f39] p-4 z-50 border-t border-emerald-400/20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center text-white gap-4 md:gap-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <div className="text-xs font-black uppercase tracking-widest leading-none">
                <span className="opacity-60 block text-[8px] mb-1">Meta Anual 2026</span>
                R$ 2.180.000
              </div>
            </div>
            <div className="h-6 w-px bg-white/10 hidden md:block"></div>
            <div className="text-xs font-black uppercase tracking-widest leading-none">
              <span className="opacity-60 block text-[8px] mb-1">Volume Realizado</span>
              {String(formatBRL(metrics.totalRealizadoAcumulado))}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end leading-none">
               <span className="text-[9px] uppercase font-black opacity-60 mb-1 tracking-widest">Performance Global</span>
               <span className="text-2xl font-black tracking-tighter italic">{String(metrics.overallPercentage.toFixed(1))}% de Atingimento</span>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/5">
               <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Card: React.FC<{title: string; value: string; subtitle: string; color: string; icon: string;}> = ({ title, value, subtitle, color, icon }) => (
  <div className="bg-[#12161f] border border-gray-800 p-6 rounded-3xl shadow-xl hover:border-red-600/30 transition-all group overflow-hidden relative">
    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 -mr-12 -mt-12 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all"></div>
    <div className="flex justify-between items-start mb-4">
      <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic opacity-70 leading-none">{String(title)}</h4>
      <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{String(icon)}</span>
    </div>
    <p className={`text-3xl font-black ${String(color)} tracking-tighter leading-tight`}>{String(value)}</p>
    <p className="text-gray-600 text-[9px] mt-2 font-black uppercase tracking-tight opacity-70">{String(subtitle)}</p>
  </div>
);

export default App;
