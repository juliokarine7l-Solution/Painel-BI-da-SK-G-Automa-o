
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Cell, PieChart, Pie, ReferenceLine, LineChart, Line, ComposedChart, AreaChart, Area
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { TARGET_GOALS, MONTHS, SELLERS, YEARS, HISTORICAL_TOP_CLIENTS, HISTORICAL_YEARS } from './constants';
import { YearlyActualData, ChartDataPoint, SellerActual } from './types';

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'goals' | 'clients' | 'growth'>('goals');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()] || 'Jan');
  const [isConsulting, setIsConsulting] = useState(false);
  const [dailyReport, setDailyReport] = useState<string | null>(null);
  const [groundingLinks, setGroundingLinks] = useState<{title: string, uri: string}[]>([]);

  // PERSISTÊNCIA INTEGRADA (v12)
  const [actualData, setActualData] = useState<YearlyActualData>(() => {
    const saved = localStorage.getItem('skg_bi_v12_actuals');
    if (saved) return JSON.parse(saved);
    const initial: YearlyActualData = {};
    YEARS.forEach(yr => {
      initial[yr] = {};
      MONTHS.forEach(m => { initial[yr][m] = { syllas: 0, v1: 0, v2: 0, v3: 0 }; });
    });
    return initial;
  });

  const [clientProjections, setClientProjections] = useState<Record<string, Record<number, number>>>(() => {
    const saved = localStorage.getItem('skg_bi_v12_projections');
    if (saved) return JSON.parse(saved);
    const initial: Record<string, Record<number, number>> = {};
    HISTORICAL_TOP_CLIENTS.forEach(c => {
      initial[c.id] = {};
      [2026, 2027, 2028, 2029, 2030].forEach(y => initial[c.id][y] = 0);
    });
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('skg_bi_v12_actuals', JSON.stringify(actualData));
    localStorage.setItem('skg_bi_v12_projections', JSON.stringify(clientProjections));
  }, [actualData, clientProjections]);

  const currentYearData = useMemo(() => actualData[selectedYear] || {}, [actualData, selectedYear]);

  // MÉTRICAS DE FATURAMENTO E VENDEDORES
  const metrics = useMemo(() => {
    let totalMetaAcumulada = 0; let totalRealizadoAcumulado = 0;
    
    const chartData: ChartDataPoint[] = TARGET_GOALS.map(goal => {
      const actual = currentYearData[goal.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
      const real = actual.syllas + actual.v1 + actual.v2 + actual.v3;
      totalMetaAcumulada += goal.total; totalRealizadoAcumulado += real;
      return { 
        month: goal.month, 
        meta: goal.total, 
        realizado: real, 
        percentage: goal.total > 0 ? (real / goal.total) * 100 : 0 
      };
    });

    // Performance por Vendedor no Mês Selecionado
    const monthGoal = TARGET_GOALS.find(g => g.month === selectedMonth) || TARGET_GOALS[0];
    const monthActual = currentYearData[selectedMonth] || { syllas: 0, v1: 0, v2: 0, v3: 0 };

    const sellersMonthSummary = SELLERS.map(s => {
      const k = s.id as keyof SellerActual;
      const meta = Number((monthGoal as any)[k]) || 0;
      const real = Number(monthActual[k]) || 0;
      return {
        id: s.id,
        name: s.label,
        meta,
        realizado: real,
        atingimento: meta > 0 ? (real / meta) * 100 : real > 0 ? 100 : 0
      };
    });

    // Performance Anual por Vendedor
    const sellersYearSummary = SELLERS.map(s => {
      const k = s.id as keyof SellerActual;
      // Fixed: Explicitly typed 'acc' as number in reduce to prevent 'unknown' operator issues (Fixing line 89)
      const metaTotal = TARGET_GOALS.reduce((acc: number, curr) => acc + (Number((curr as any)[k]) || 0), 0);
      // Fixed: Explicitly typed 'acc' as number and cast 'curr' to avoid inference issues (Fixing lines 90+)
      const realizadoTotal = Object.values(currentYearData).reduce((acc: number, curr) => acc + (Number((curr as any)[k]) || 0), 0);
      return {
        id: s.id,
        name: s.label,
        metaTotal,
        realizadoTotal,
        atingimento: metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : realizadoTotal > 0 ? 100 : 0
      };
    });

    const bestSellerMonth = sellersMonthSummary.reduce((prev, curr) => (curr.realizado > prev.realizado ? curr : prev), sellersMonthSummary[0]);

    return { 
      totalMetaAcumulada, 
      totalRealizadoAcumulado, 
      overallPercentage: totalMetaAcumulada > 0 ? (totalRealizadoAcumulado / totalMetaAcumulada) * 100 : 0, 
      chartData, 
      sellersMonthSummary, 
      sellersYearSummary,
      bestSellerMonth,
      monthGoal
    };
  }, [currentYearData, selectedMonth]);

  // ANÁLISE TOP 20 CLIENTES
  const clientAnalysis = useMemo(() => {
    const analysis = HISTORICAL_TOP_CLIENTS.map(client => {
      const v2025 = client.history[2025] || 0;
      const v2024 = client.history[2024] || 0;
      const growth = v2024 > 0 ? ((v2025 - v2024) / v2024) * 100 : 0;
      
      let status: 'STAR' | 'CHURN' | 'STABLE' | 'ATTENTION' = 'STABLE';
      if (v2025 > v2024 * 1.3 && v2025 > 0) status = 'STAR';
      else if (v2025 < v2024 * 0.7 && v2025 > 0) status = 'CHURN';
      if (v2025 === 0 && v2024 > 0) status = 'ATTENTION';

      const trendData = [...HISTORICAL_YEARS, 2026, 2027, 2028, 2029, 2030].map(y => ({
        year: y,
        value: (client.history[y] || 0) || (clientProjections[client.id]?.[y] || 0),
        isProjection: y > 2025
      }));

      return { ...client, status, growth, v2025, v2024, trendData };
    }).sort((a, b) => b.v2025 - a.v2025);

    const totalRealT20 = analysis.reduce((acc, c) => acc + c.v2025, 0);
    const paretoData = analysis.map((c, i) => ({
      name: c.name.split(' ')[0],
      value: c.v2025,
      cumulative: (analysis.slice(0, i + 1).reduce((acc, curr) => acc + curr.v2025, 0) / totalRealT20) * 100
    }));

    return { analysis, totalRealT20, paretoData };
  }, [clientProjections]);

  const fetchDailyReport = async () => {
    setIsConsulting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Você é o "Monitor Industrial Diário". SK-G Automação status ${selectedMonth}/${selectedYear}: Faturamento ${formatCurrency(metrics.totalRealizadoAcumulado)}. Analise o mercado de automação industrial hoje via Google Search e dê insights para Syllas, V1 e V2 com base no atingimento de meta de ${metrics.overallPercentage.toFixed(1)}%.`;
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: prompt, 
        config: { tools: [{ googleSearch: {} }] } 
      });
      setDailyReport(response.text || "Sem dados.");
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setGroundingLinks(chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri })));
    } catch (e) { setDailyReport("Erro na API."); } finally { setIsConsulting(false); }
  };

  const handleInputChange = (month: string, seller: string, value: string) => {
    const numValue = parseNum(value);
    setActualData(prev => ({
      ...prev, [selectedYear]: { ...prev[selectedYear], [month]: { ...prev[selectedYear][month], [seller]: numValue } }
    }));
  };

  const parseNum = (val: string) => {
    let clean = val.replace(/[R$\s.]/g, '').replace(',', '.');
    return isNaN(parseFloat(clean)) ? 0 : parseFloat(clean);
  };

  const handleClientValueChange = (clientId: string, year: number, value: string) => {
    setClientProjections(prev => ({ ...prev, [clientId]: { ...prev[clientId], [year]: parseNum(value) } }));
  };

  const COLORS = ['#ef4444', '#10b981', '#3b82f6', '#a855f7'];

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-gray-100 pb-24 font-sans">
      {/* NAV / HEADER */}
      <header className="bg-[#cc1d1d] shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4 border-b border-red-800">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/Ky5zDy2.png" alt="SK-G" className="h-10 bg-white p-1 rounded-md" />
          <div className="hidden sm:block text-white">
            <h1 className="text-xl font-black uppercase tracking-tighter italic">SK-G Automação</h1>
            <p className="text-[9px] uppercase font-black opacity-80 tracking-widest leading-none mt-1">Strategic BI Platform</p>
          </div>
        </div>

        <nav className="flex bg-red-900/40 p-1 rounded-xl border border-red-500/30 overflow-x-auto">
          {['goals', 'clients', 'growth'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all uppercase whitespace-nowrap ${activeTab === tab ? 'bg-white text-red-700' : 'text-white/70 hover:bg-red-700/40'}`}>
              {tab === 'goals' ? 'Faturamento' : tab === 'clients' ? 'Top 20 Clientes' : 'Estratégia Growth'}
            </button>
          ))}
        </nav>
        
        <div className="flex items-center gap-2 bg-red-800/40 p-1 rounded-xl border border-red-500/30">
          {YEARS.slice(0, 3).map(yr => (
            <button key={yr} onClick={() => setSelectedYear(yr)} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedYear === yr ? 'bg-white text-red-700' : 'text-white/50 hover:text-white'}`}>{yr}</button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-[1700px] mx-auto w-full">
        
        {activeTab === 'goals' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Realizado Acumulado" value={formatCurrency(metrics.totalRealizadoAcumulado)} subtitle={`Exercício ${selectedYear}`} color="text-emerald-400" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <Card title="Atingimento Global" value={`${metrics.overallPercentage.toFixed(1)}%`} subtitle="Meta Empresa" color="text-amber-400" icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              <Card title="Melhor do Mês" value={metrics.bestSellerMonth.name.split(' ')[0]} subtitle={formatCurrency(metrics.bestSellerMonth.realizado)} color="text-blue-400" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              <Card title="Gap p/ Meta" value={formatCurrency(Math.max(0, metrics.totalMetaAcumulada - metrics.totalRealizadoAcumulado))} subtitle="Faltante" color="text-red-400" icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* GRÁFICO META VS REALIZADO MENSAL */}
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-black flex items-center gap-3 uppercase italic italic"><span className="w-1.5 h-6 bg-red-600 rounded-full"></span>Meta vs Realizado (Empresa)</h3>
                   <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-1 text-xs font-black text-red-500 uppercase outline-none">
                     {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                   </select>
                 </div>
                 <div className="h-[350px]">
                   <ResponsiveContainer>
                     <ComposedChart data={metrics.chartData}>
                       <CartesianGrid stroke="#1f2937" vertical={false} />
                       <XAxis dataKey="month" stroke="#4b5563" fontSize={12} />
                       <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                       <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none'}} />
                       <Legend />
                       <Bar dataKey="meta" fill="#1e3a8a" radius={[4,4,0,0]} barSize={35} />
                       <Bar dataKey="realizado" fill="#10b981" radius={[4,4,0,0]} barSize={35} />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              {/* PROGRESSO POR VENDEDOR NO MÊS */}
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl flex flex-col">
                 <h3 className="text-lg font-black mb-8 flex items-center gap-3 uppercase italic"><span className="w-1.5 h-6 bg-red-600 rounded-full"></span>Performance Vendedores ({selectedMonth})</h3>
                 <div className="space-y-8 flex-1">
                   {metrics.sellersMonthSummary.map((s, i) => (
                     <div key={s.id} className="space-y-3">
                       <div className="flex justify-between items-end">
                         <div>
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">{s.name}</p>
                           <p className="text-sm font-black text-white">{formatCurrency(s.realizado)} / <span className="text-gray-600 text-[10px]">{formatCurrency(s.meta)}</span></p>
                         </div>
                         <span className={`text-sm font-black italic ${s.atingimento >= 100 ? 'text-emerald-400' : s.atingimento >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                           {s.atingimento.toFixed(1)}%
                         </span>
                       </div>
                       <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-800 shadow-inner">
                         <div 
                          className={`h-full transition-all duration-1000 shadow-lg ${s.atingimento >= 100 ? 'bg-emerald-500' : s.atingimento >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, s.atingimento)}%` }}
                         />
                       </div>
                     </div>
                   ))}
                 </div>
                 <div className="mt-8 pt-8 border-t border-gray-800 flex justify-around">
                    <div className="text-center">
                       <p className="text-[9px] font-black text-gray-500 uppercase italic">Meta Mensal Total</p>
                       <p className="text-lg font-black text-white">{formatCurrency(metrics.monthGoal.total)}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[9px] font-black text-gray-500 uppercase italic">Atingimento Mês</p>
                       <p className={`text-lg font-black ${(metrics.chartData.find(d => d.month === selectedMonth)?.percentage || 0) >= 100 ? 'text-emerald-400' : 'text-red-500'}`}>
                        {(metrics.chartData.find(d => d.month === selectedMonth)?.percentage || 0).toFixed(1)}%
                       </p>
                    </div>
                 </div>
              </div>
            </section>

            {/* TABELA DE INPUT INTELIGENTE (FONTE ÚNICA) */}
            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 bg-gray-950/40 text-white flex justify-between items-center">
                <h3 className="text-lg font-black uppercase italic italic tracking-widest">Painel de Lançamento Direto ({selectedYear})</h3>
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Single Source of Truth</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0b0e14] text-gray-500 text-[10px] uppercase font-black border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-5">Mês</th>
                      {SELLERS.map(s => <th key={s.id} className="px-4 py-5 text-center">{s.label}</th>)}
                      <th className="px-6 py-5 text-center bg-gray-900/40">Realizado</th>
                      <th className="px-6 py-5 text-center">Meta Bruta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {TARGET_GOALS.map((goal) => {
                      const actual = currentYearData[goal.month] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
                      const totalReal = actual.syllas + actual.v1 + actual.v2 + actual.v3;
                      const pct = goal.total > 0 ? (totalReal / goal.total) * 100 : 0;
                      return (
                        <tr key={goal.month} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 font-black text-gray-400">{goal.month}</td>
                          {SELLERS.map((s) => (
                            <td key={s.id} className="px-2 py-2">
                              <input 
                                type="text" 
                                className={`bg-[#1a1f29] border border-gray-800 rounded-lg px-3 py-3 w-full text-center font-bold text-white transition-all shadow-inner focus:ring-1 outline-none ${totalReal < goal.total && totalReal > 0 ? 'focus:ring-red-500' : 'focus:ring-emerald-500'}`}
                                placeholder="0,00" 
                                value={actual[s.id as keyof SellerActual] > 0 ? actual[s.id as keyof SellerActual].toLocaleString('pt-BR') : ''}
                                onChange={(e) => handleInputChange(goal.month, s.id, e.target.value)} 
                              />
                            </td>
                          ))}
                          <td className={`px-6 py-4 text-center font-black ${pct >= 100 ? 'text-emerald-400' : 'text-amber-400'} bg-gray-900/30`}>{formatCurrency(totalReal)}</td>
                          <td className="px-6 py-4 text-center text-gray-500 font-bold opacity-60">{formatCurrency(goal.total)}</td>
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
              {/* TENDÊNCIA HISTÓRICA VS PROJEÇÃO */}
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden relative">
                 <h3 className="text-lg font-black mb-6 flex items-center gap-3 uppercase italic"><span className="w-1.5 h-6 bg-red-600 rounded-full"></span>Tendência Decenal: Top 5</h3>
                 <div className="h-[400px]">
                   <ResponsiveContainer>
                     <LineChart data={HISTORICAL_YEARS.concat([2026, 2027, 2028, 2029, 2030]).map(y => {
                       const obj: any = { year: y };
                       clientAnalysis.analysis.slice(0, 5).forEach(c => {
                         obj[c.name] = (c.history[y] || 0) || (clientProjections[c.id]?.[y] || 0);
                       });
                       return obj;
                     })}>
                       <CartesianGrid stroke="#1f2937" vertical={false} />
                       <XAxis dataKey="year" stroke="#4b5563" fontSize={12} />
                       <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                       <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none'}} formatter={(v: number) => formatCurrency(v)} />
                       <Legend verticalAlign="top" align="right" />
                       <ReferenceLine x={2025.5} stroke="#cc1d1d" strokeDasharray="3 3" />
                       {clientAnalysis.analysis.slice(0, 5).map((c, i) => (
                         <Line 
                          key={c.id} 
                          type="monotone" 
                          dataKey={c.name} 
                          stroke={COLORS[i % COLORS.length]} 
                          strokeWidth={3} 
                          dot={{r: 4}} 
                          strokeDasharray={y => 0} // Custom dynamic dash logic not possible in simple Recharts prop, but we indicate proj with ReferenceLine
                         />
                       ))}
                     </LineChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              {/* PARETO CONCENTRAÇÃO */}
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden">
                 <h3 className="text-lg font-black mb-6 flex items-center gap-3 uppercase italic"><span className="w-1.5 h-6 bg-red-600 rounded-full"></span>Pareto T20 (Concentração 2025)</h3>
                 <div className="h-[400px]">
                   <ResponsiveContainer>
                     <ComposedChart data={clientAnalysis.paretoData}>
                       <CartesianGrid stroke="#1f2937" vertical={false}/>
                       <XAxis dataKey="name" hide />
                       <YAxis yAxisId="left" stroke="#4b5563" fontSize={10} />
                       <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} tickFormatter={v => `${v.toFixed(0)}%`} />
                       <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none'}} />
                       <Bar yAxisId="left" dataKey="value" fill="#1e3a8a" radius={[4,4,0,0]} />
                       <Line yAxisId="right" dataKey="cumulative" stroke="#10b981" strokeWidth={3} dot={{fill: '#10b981'}} />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </section>

            {/* MATRIZ DECENAL E DIAGNÓSTICOS */}
            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 bg-gray-950/40 text-white flex justify-between items-center">
                <h3 className="text-lg font-black uppercase italic italic tracking-widest">Matriz Estratégica Decenal (2021-2030)</h3>
                <div className="flex gap-4 items-center">
                  <span className="text-[10px] text-emerald-400 font-black">🚀 ESTRELA</span>
                  <span className="text-[10px] text-amber-400 font-black">⚠️ ATENÇÃO</span>
                  <span className="text-[10px] text-red-400 font-black">📉 RISCO</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-[#0b0e14] text-gray-500 font-black uppercase border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-4 min-w-[220px] sticky left-0 bg-[#0b0e14] z-20">Cliente / Diagnóstico IA</th>
                      {HISTORICAL_YEARS.map(y => <th key={y} className="px-3 py-4 text-center">{y}</th>)}
                      {YEARS.map(y => <th key={y} className="px-3 py-4 text-center bg-red-900/10 text-red-200">{y} (Proj.)</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {clientAnalysis.analysis.map(client => (
                      <tr key={client.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3 sticky left-0 bg-[#12161f] z-10 border-r border-gray-800">
                          <div className="flex flex-col">
                            <span className="font-black text-gray-300 truncate group-hover:text-white uppercase leading-tight">{client.name}</span>
                            <div className="flex gap-2 mt-1">
                               {client.status === 'STAR' && <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-black">🚀 ESTRELA</span>}
                               {client.status === 'CHURN' && <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-[8px] font-black">📉 RISCO</span>}
                               {client.status === 'ATTENTION' && <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-black">⚠️ ATENÇÃO</span>}
                               <span className={`text-[9px] font-black ${client.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{client.growth.toFixed(1)}%</span>
                            </div>
                          </div>
                        </td>
                        {HISTORICAL_YEARS.map(y => (
                          <td key={y} className={`px-3 py-3 text-center font-bold ${client.history[y] === 0 ? 'text-red-900 opacity-20' : 'text-gray-500'}`}>
                            {client.history[y] > 0 ? formatCurrency(client.history[y]) : '-'}
                          </td>
                        ))}
                        {YEARS.map(y => (
                          <td key={y} className="px-2 py-2 bg-red-900/5">
                            <input 
                              type="text" 
                              className="bg-gray-950/30 border border-gray-800/50 rounded px-2 py-1.5 w-full text-center font-black text-red-200 outline-none focus:ring-1 focus:ring-red-500 transition-all"
                              placeholder="0"
                              value={clientProjections[client.id][Number(y)] > 0 ? clientProjections[client.id][Number(y)].toLocaleString('pt-BR') : ''}
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
            <div className="bg-[#12161f] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">
               <div className="p-6 bg-gradient-to-r from-gray-900 to-black flex justify-between items-center text-white border-b border-gray-800">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white text-red-600 border-2 border-red-600 shadow-xl font-black text-xl italic">V4</div>
                   <div>
                     <h2 className="text-xl font-black uppercase italic leading-none">Monitor Industrial Diário</h2>
                     <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mt-1">Status: Inteligência Ativa</p>
                   </div>
                 </div>
                 <button onClick={fetchDailyReport} disabled={isConsulting} className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg">
                   {isConsulting ? 'Processando...' : 'Atualizar Monitor'}
                 </button>
               </div>
               <div className="p-8">
                  {dailyReport ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="bg-black/40 border border-white/5 p-8 rounded-3xl shadow-inner prose prose-invert max-w-none text-gray-300">
                          {dailyReport.split('\n').map((line, i) => <p key={i} className="mb-2 leading-relaxed">{line}</p>)}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="bg-gray-950 p-6 rounded-3xl border border-gray-800 shadow-xl">
                          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 italic italic">Sinais do Mercado (Search)</h4>
                          <div className="space-y-3">
                            {groundingLinks.map((link, i) => (
                              <a key={i} href={link.uri} target="_blank" className="block p-3 bg-white/5 rounded-xl border border-white/5 hover:border-red-600 transition-all group">
                                <p className="text-[10px] text-gray-400 font-bold group-hover:text-red-400 transition-colors truncate">{link.title}</p>
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-24 text-center bg-gray-950/20 rounded-3xl border border-gray-800/30">
                      <p className="text-gray-500 font-black uppercase tracking-widest text-sm italic">Clique em "Atualizar" para gerar o relatório estratégico V4.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER FIXO */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#008f39] p-4 z-50 shadow-2xl border-t border-emerald-400/20">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row justify-between items-center text-white gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-lg font-black text-[10px] flex flex-col items-center leading-none">
               <span>SK-G</span><span>BI</span>
             </div>
             <p className="text-xs font-bold uppercase tracking-widest opacity-80 leading-none">Performance {selectedYear}: {formatCurrency(metrics.totalRealizadoAcumulado)}</p>
          </div>
          <div className="flex items-center gap-6 sm:gap-12">
            <div className="text-right">
              <p className="text-[9px] uppercase opacity-70 font-black tracking-widest leading-none mb-1">Atingimento Global</p>
              <p className="text-xl font-black leading-none tracking-tighter">{metrics.overallPercentage.toFixed(1)}%</p>
            </div>
            <div className="h-10 w-px bg-white/20"></div>
            <div className="text-right">
              <p className="text-[9px] uppercase opacity-70 font-black tracking-widest leading-none mb-1">Gap Performance</p>
              <p className={`text-xl font-black leading-none tracking-tighter ${metrics.totalMetaAcumulada - metrics.totalRealizadoAcumulado > 0 ? 'text-red-200' : 'text-emerald-100'}`}>
                {formatCurrency(Math.abs(metrics.totalMetaAcumulada - metrics.totalRealizadoAcumulado))}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Card: React.FC<{title: string; value: string; subtitle: string; icon: string; color: string;}> = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-[#12161f] border border-gray-800 p-6 rounded-3xl shadow-xl hover:border-red-600/30 transition-all group overflow-hidden relative">
    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 -mr-12 -mt-12 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all"></div>
    <div className="p-3 bg-gray-900 rounded-2xl border border-gray-800 mb-4 inline-block shadow-inner">
      <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
    </div>
    <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 italic opacity-70 leading-none">{title}</h4>
    <p className={`text-3xl font-black ${color} tracking-tighter leading-tight`}>{value}</p>
    <p className="text-gray-600 text-[9px] mt-2 font-bold uppercase tracking-tight opacity-70">{subtitle}</p>
  </div>
);

export default App;
