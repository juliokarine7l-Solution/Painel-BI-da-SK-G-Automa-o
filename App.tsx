
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
  const [apiError, setApiError] = useState<string | null>(null);

  // Sistema de Cache de Insights (LocalStorage)
  const [dailyReport, setDailyReport] = useState<string | null>(() => {
    const cached = localStorage.getItem('skg_bi_v10_cached_insight');
    return cached ? String(cached) : null;
  });
  const [groundingLinks, setGroundingLinks] = useState<{title: string, uri: string}[]>(() => {
    try {
      const saved = localStorage.getItem('skg_bi_v10_cached_links');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [lastUpdate, setLastUpdate] = useState<string | null>(() => {
    const saved = localStorage.getItem('skg_bi_v10_cached_timestamp');
    return saved ? String(saved) : null;
  });

  // Persistência de Dados de Vendas e Projeções
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
      if (saved) return { ...initial, ...JSON.parse(saved) };
    } catch (e) { console.warn("Erro projections:", e); }
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('skg_bi_v10_actuals', JSON.stringify(actualData));
    localStorage.setItem('skg_bi_v10_actuals', JSON.stringify(actualData));
    localStorage.setItem('skg_bi_v10_projections', JSON.stringify(clientProjections));
  }, [actualData, clientProjections]);

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

  const clientAnalysis = useMemo(() => {
    const analysis = HISTORICAL_TOP_CLIENTS.map(client => {
      const v2025 = client.history[2025] || 0;
      const v2024 = client.history[2024] || 0;
      const trendData = [...HISTORICAL_YEARS, 2026, 2027, 2028, 2029, 2030].map(y => ({
        year: y,
        value: (client.history[y] || 0) || (clientProjections[client.id]?.[y] || 0),
        isProjection: y > 2025
      }));

      return { ...client, v2025, v2024, trendData };
    }).sort((a, b) => b.v2025 - a.v2025);

    const totalRealT20 = analysis.reduce((acc, c) => acc + c.v2025, 0);
    const paretoData = analysis.map((c, i) => ({
      name: c.name.split(' ')[0],
      value: c.v2025,
      cumulative: totalRealT20 > 0 ? (analysis.slice(0, i + 1).reduce((acc, curr) => acc + curr.v2025, 0) / totalRealT20) * 100 : 0
    }));

    return { analysis, totalRealT20, paretoData };
  }, [clientProjections]);

  // Função para acionamento MANUAL da Análise V4
  const fetchDailyReport = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setApiError("Chave de API não configurada.");
      return;
    }

    setIsConsulting(true);
    setApiError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const topClientsNames = clientAnalysis.analysis.slice(0, 5).map(c => String(c.name)).join(', ');
      
      const prompt = `
        Atue como Consultor Sênior de Growth da V4 Company para a SK-G Automação Industrial.
        Foco Invariável: Longevidade Estratégica e VO2 Industrial.
        Contexto Atual:
        - Exercício: ${String(selectedYear)}
        - Mês: ${String(selectedMonth)}
        - Performance de Meta: ${String(metrics.overallPercentage.toFixed(1))}%
        - Clientes Estratégicos (T20): ${String(topClientsNames)} (Ex: Maccaferri, Fertipar, Ajinomoto).
        
        Objetivo:
        Gere 3 insights práticos e técnicos para 2026. Use ferramentas de busca para tendências recentes.
        Entregue um texto direto, sem introduções longas. Foco em resultados.
      `;

      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt, 
        config: { 
          tools: [{ googleSearch: {} }],
          temperature: 0.7
        } 
      });

      const text = String(response.text || "");
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const links = chunks.filter((c: any) => c.web).map((c: any) => ({ 
        title: String(c.web.title || "Fonte Industrial"), 
        uri: String(c.web.uri || "#") 
      }));
      const timestamp = new Date().toLocaleString('pt-BR');

      // Atualiza Estados e Cache
      setDailyReport(text);
      setGroundingLinks(links);
      setLastUpdate(timestamp);

      localStorage.setItem('skg_bi_v10_cached_insight', text);
      localStorage.setItem('skg_bi_v10_cached_links', JSON.stringify(links));
      localStorage.setItem('skg_bi_v10_cached_timestamp', timestamp);

    } catch (e: any) {
      console.error("Erro API Growth:", e);
      // Tratamento específico de erro 429
      if (e.message?.includes('429') || e.status === 429) {
        setApiError("Sistema em resfriamento. Tente novamente em 1 minuto.");
      } else {
        setApiError("Erro na conexão com a consultoria estratégica. Exibindo dados de cache.");
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

  const COLORS = ['#ef4444', '#10b981', '#3b82f6', '#a855f7'];

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-gray-100 pb-24">
      <header className="bg-[#cc1d1d] shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4 border-b border-red-800">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/Ky5zDy2.png" alt="SK-G" className="h-10 bg-white p-1 rounded-md" />
          <h1 className="text-xl font-black uppercase italic text-white hidden sm:block">SK-G Automação</h1>
        </div>
        <nav className="flex bg-red-900/40 p-1 rounded-xl border border-red-500/30">
          {['goals', 'clients', 'growth'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-red-700' : 'text-white/70 hover:bg-red-700/40'}`}>
              {tab === 'goals' ? 'Faturamento' : tab === 'clients' ? 'Top 20 Clientes' : 'Estratégia V4'}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {YEARS.slice(0, 3).map(yr => (
            <button key={yr} onClick={() => setSelectedYear(yr)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedYear === yr ? 'bg-white text-red-700' : 'text-white/50 hover:text-white'}`}>{yr}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-[1700px] mx-auto w-full">
        {activeTab === 'goals' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Realizado Total" value={String(formatBRL(metrics.totalRealizadoAcumulado))} subtitle={String(`Exercício ${selectedYear}`)} color="text-emerald-400" />
              <Card title="Atingimento" value={String(`${metrics.overallPercentage.toFixed(1)}%`)} subtitle="Meta Empresa" color="text-amber-400" />
              <Card title="Top Vendas Mês" value={String(metrics.bestSellerMonth.name.split(' ')[0])} subtitle={String(formatBRL(metrics.bestSellerMonth.realizado))} color="text-blue-400" />
              <Card title="Gap p/ Meta" value={String(formatBRL(Math.max(0, metrics.totalMetaAcumulada - metrics.totalRealizadoAcumulado)))} subtitle="Volume Faltante" color="text-red-400" />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-black uppercase italic">Meta vs Realizado</h3>
                   <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-1 text-xs font-black text-red-500 outline-none">
                     {MONTHS.map(m => <option key={m} value={m}>{String(m)}</option>)}
                   </select>
                 </div>
                 <div className="h-[350px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={metrics.chartData}>
                       <CartesianGrid stroke="#1f2937" vertical={false} />
                       <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                       <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                       <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                       <Bar dataKey="meta" name="Meta" fill="#1e3a8a" radius={[4,4,0,0]} barSize={35} />
                       <Bar dataKey="realizado" name="Realizado" fill="#10b981" radius={[4,4,0,0]} barSize={35} />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl flex flex-col">
                 <h3 className="text-lg font-black mb-8 uppercase italic">Performance Vendedores</h3>
                 <div className="space-y-8 flex-1 overflow-y-auto">
                   {metrics.sellersMonthSummary.map((s) => (
                     <div key={s.id} className="space-y-3 pr-2">
                       <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black text-gray-500 uppercase">{String(s.name)}</span>
                         <span className={`text-sm font-black italic ${s.atingimento >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>{String(s.atingimento.toFixed(1))}%</span>
                       </div>
                       <div className="h-4 bg-gray-900 rounded-full border border-gray-800 overflow-hidden">
                         <div className={`h-full transition-all duration-1000 ${s.atingimento >= 100 ? 'bg-emerald-500' : s.atingimento >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, s.atingimento)}%` }} />
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            </section>

            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 bg-gray-950/40 text-white"><h3 className="text-lg font-black uppercase italic">Lançamento Direto ({String(selectedYear)})</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#0b0e14] text-gray-500 text-[10px] uppercase font-black">
                    <tr>
                      <th className="px-6 py-5 sticky left-0 bg-[#0b0e14]">Mês</th>
                      {SELLERS.map(s => <th key={s.id} className="px-4 py-5 text-center">{String(s.label)}</th>)}
                      <th className="px-6 py-5 text-center bg-gray-900/40">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {TARGET_GOALS.map((goal) => {
                      const actual = (actualData[selectedYear] || {})[goal.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
                      const totalReal = Object.values(actual).reduce((a: number, b) => a + (Number(b) || 0), 0);
                      return (
                        <tr key={goal.month} className="hover:bg-white/[0.01]">
                          <td className="px-6 py-4 font-black text-gray-400 sticky left-0 bg-[#12161f]">{String(goal.month)}</td>
                          {SELLERS.map((s) => (
                            <td key={s.id} className="px-2 py-2">
                              <input type="text" className="bg-[#1a1f29] border border-gray-800 rounded-lg px-3 py-3 w-full text-center font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="0,00" 
                                value={(actual as any)[s.id] > 0 ? (actual as any)[s.id].toLocaleString('pt-BR') : ''}
                                onChange={(e) => handleInputChange(goal.month, s.id, e.target.value)} />
                            </td>
                          ))}
                          <td className="px-6 py-4 text-center font-black text-emerald-400 bg-gray-900/30">{String(formatBRL(totalReal))}</td>
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
            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 bg-gray-950/40 text-white"><h3 className="text-lg font-black uppercase italic">Top 20 Clientes e Projeções</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-[#0b0e14] text-gray-500 font-black uppercase border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-4 min-w-[220px] sticky left-0 bg-[#0b0e14] z-20">Cliente</th>
                      {HISTORICAL_YEARS.slice(-2).map(y => <th key={String(y)} className="px-3 py-4 text-center">{String(y)}</th>)}
                      {YEARS.map(y => <th key={String(y)} className="px-3 py-4 text-center bg-red-900/10 text-red-200">{String(y)} (Proj.)</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {clientAnalysis.analysis.map(client => (
                      <tr key={client.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 sticky left-0 bg-[#12161f] font-black text-gray-300 truncate">{String(client.name)}</td>
                        <td className="px-3 py-3 text-center text-gray-500">{String(formatBRL(client.v2024))}</td>
                        <td className="px-3 py-3 text-center text-gray-400 font-bold">{String(formatBRL(client.v2025))}</td>
                        {YEARS.map(y => {
                          const currentProj = clientProjections[client.id]?.[Number(y)];
                          return (
                            <td key={String(y)} className="px-2 py-2 bg-red-900/5">
                              <input type="text" className="bg-gray-950/30 border border-gray-800/50 rounded px-2 py-1.5 w-full text-center font-black text-red-200 outline-none focus:ring-1 focus:ring-red-500" placeholder="0"
                                value={currentProj && currentProj > 0 ? currentProj.toLocaleString('pt-BR') : ''}
                                onChange={e => handleClientValueChange(client.id, Number(y), e.target.value)} />
                            </td>
                          );
                        })}
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
               <div className="p-6 bg-gradient-to-r from-gray-900 to-black flex flex-col md:flex-row justify-between items-center text-white border-b border-gray-800 gap-6">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white text-red-600 border-2 border-red-600 shadow-xl font-black text-xl italic">V4</div>
                   <div>
                     <h2 className="text-xl font-black uppercase italic leading-none">Consultoria Growth</h2>
                     {lastUpdate && <p className="text-[9px] font-black opacity-60 uppercase tracking-widest mt-2">Última Análise: {String(lastUpdate)}</p>}
                   </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-2">
                    <button 
                      onClick={fetchDailyReport} 
                      disabled={isConsulting} 
                      className="px-10 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-black text-sm uppercase transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(220,38,38,0.4)] active:scale-95"
                    >
                      {isConsulting ? 'ANALISANDO...' : 'GERAR ANÁLISE V4'}
                    </button>
                    {apiError && <span className="text-[10px] text-red-400 font-black uppercase animate-pulse">{String(apiError)}</span>}
                 </div>
               </div>

               <div className="p-8">
                  {isConsulting ? (
                    <div className="py-32 text-center">
                       <div className="w-20 h-20 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_15px_rgba(220,38,38,0.2)]"></div>
                       <p className="font-black uppercase text-red-500 animate-pulse tracking-widest">Sincronizando Big Data Industrial V4...</p>
                    </div>
                  ) : dailyReport ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 text-gray-300 bg-black/40 p-10 rounded-3xl border border-white/5 whitespace-pre-line leading-relaxed text-base font-medium">
                        {String(dailyReport)}
                      </div>
                      <div className="space-y-6">
                        <div className="bg-gray-950 p-6 rounded-3xl border border-gray-800">
                          <h4 className="text-[10px] font-black text-gray-500 uppercase mb-5 italic tracking-widest border-b border-gray-800 pb-2">Fontes de Pesquisa</h4>
                          <div className="space-y-4">
                            {groundingLinks.length > 0 ? groundingLinks.map((link, i) => (
                              /* Fix: Use String() conversion for key to handle case where index 'i' might be inferred as unknown */
                              <a key={String(i)} href={String(link.uri)} target="_blank" rel="noreferrer" className="block p-4 bg-white/5 rounded-xl border border-white/5 hover:border-red-600 transition-all group">
                                <p className="text-[10px] text-gray-400 font-bold truncate group-hover:text-red-400">{String(link.title)}</p>
                                <p className="text-[8px] text-gray-700 mt-1 uppercase font-black truncate">{String(link.uri)}</p>
                              </a>
                            )) : <p className="text-[9px] text-gray-700 font-black uppercase text-center py-4">Nenhuma fonte vinculada nesta sessão.</p>}
                          </div>
                        </div>
                        <div className="bg-red-900/5 p-6 rounded-3xl border border-red-500/10">
                           <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 italic">Longevidade VO2</h4>
                           <p className="text-[11px] text-gray-500 font-bold leading-snug">
                             A análise atual prioriza a retenção do Top 20 e a expansão de margem em clientes estrela como Fertipar e Maccaferri.
                           </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-32 text-center border-2 border-dashed border-gray-800 rounded-3xl">
                      <div className="w-20 h-20 bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800">
                        <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="italic text-gray-500 font-black uppercase tracking-widest">Aguardando Acionamento Estratégico.</p>
                      <p className="text-[10px] text-gray-700 mt-3 font-black uppercase">Clique em "GERAR ANÁLISE V4" para processar os dados.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#008f39] p-4 z-50 border-t border-emerald-400/20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1700px] mx-auto flex justify-between items-center text-white">
          <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
            Meta Anual 2026: R$ 2.180.000
          </div>
          <div className="text-xl font-black tracking-tighter flex items-end gap-1">
            {String(metrics.overallPercentage.toFixed(1))}% <span className="text-[10px] uppercase opacity-60 mb-1">Atingido</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Card: React.FC<{title: string; value: string; subtitle: string; color: string;}> = ({ title, value, subtitle, color }) => (
  <div className="bg-[#12161f] border border-gray-800 p-6 rounded-3xl shadow-xl hover:border-red-600/30 transition-all group overflow-hidden relative">
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 -mr-10 -mt-10 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all"></div>
    <h4 className="text-gray-500 text-[10px] font-black uppercase mb-1 italic opacity-70 leading-none tracking-widest">{String(title)}</h4>
    <p className={`text-3xl font-black ${String(color)} tracking-tighter leading-tight`}>{String(value)}</p>
    <p className="text-gray-600 text-[9px] mt-2 font-bold uppercase opacity-70">{String(subtitle)}</p>
  </div>
);

export default App;
