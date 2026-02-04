
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, Area, Cell, PieChart, Pie
} from 'recharts';
import { TARGET_GOALS, MONTHS, SELLERS, YEARS, HISTORICAL_TOP_CLIENTS, INDIVIDUAL_METAS } from './constants';
import { YearlyActualData, SellerActual, YearlyOperationalData, MonthlyOperational } from './types';

// Proteção Erro #31 - Garante saída String e Formatação Monetária
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

interface SKGDatabase {
  revenue: YearlyActualData;
  operational: YearlyOperationalData;
  t20Projections: Record<string, Record<number, number>>; // ClientID -> Year -> Value
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'goals' | 'performance' | 't20' | 'efficiency'>('goals');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [saveFeedback, setSaveFeedback] = useState<boolean>(false);

  // Database Engine - Persistência Global SK-G via LocalStorage
  const [db, setDb] = useState<SKGDatabase>(() => {
    const initialRevenue: YearlyActualData = {};
    const initialOp: YearlyOperationalData = {};
    const initialT20: Record<string, Record<number, number>> = {};

    YEARS.forEach(yr => {
      initialRevenue[String(yr)] = {};
      initialOp[String(yr)] = {};
      MONTHS.forEach(m => { 
        initialRevenue[String(yr)][String(m)] = { syllas: 0, v1: 0, v2: 0, v3: 0 }; 
        initialOp[String(yr)][String(m)] = { zm: 0, terceiro: 0, correios: 0, mercadoria: 0 };
      });
    });

    HISTORICAL_TOP_CLIENTS.forEach(c => {
      initialT20[String(c.id)] = { 2026: 0, 2027: 0, 2028: 0 };
    });

    try {
      const saved = localStorage.getItem('SKG_DATABASE_V23_FINAL');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          revenue: { ...initialRevenue, ...parsed.revenue },
          operational: { ...initialOp, ...parsed.operational },
          t20Projections: { ...initialT20, ...parsed.t20Projections }
        };
      }
    } catch (e) { console.warn("Database sync error:", e); }
    return { revenue: initialRevenue, operational: initialOp, t20Projections: initialT20 };
  });

  const handleGlobalSave = () => {
    localStorage.setItem('SKG_DATABASE_V23_FINAL', JSON.stringify(db));
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  // BI Metrics - Consolidação de Faturamento, Custos e Performance 2026
  const biMetrics = useMemo(() => {
    const currentYearRevenue = db.revenue[selectedYear] || {};
    const currentYearOp = db.operational[selectedYear] || {};
    let totalRealizado = 0;
    let totalLogistica = 0;
    let totalMercadoria = 0;
    const metaAnualFixa = 2180000;

    const monthlyData = MONTHS.map(m => {
      const actual = (currentYearRevenue[m] || { syllas: 0, v1: 0, v2: 0, v3: 0 }) as SellerActual;
      const op = (currentYearOp[m] || { zm: 0, terceiro: 0, correios: 0, mercadoria: 0 }) as MonthlyOperational;
      
      const realMes = (Number(actual.syllas) || 0) + (Number(actual.v1) || 0) + (Number(actual.v2) || 0) + (Number(actual.v3) || 0);
      const logMes = (Number(op.zm) || 0) + (Number(op.terceiro) || 0) + (Number(op.correios) || 0);
      const mercMes = (Number(op.mercadoria) || 0);

      totalRealizado += realMes;
      totalLogistica += logMes;
      totalMercadoria += mercMes;

      const metaMesTotal = TARGET_GOALS.find(g => g.month === m)?.total || 0;
      const percLog = realMes > 0 ? (logMes / realMes) * 100 : 0;

      return { 
        month: m, 
        meta: metaMesTotal, 
        realizado: realMes,
        logistica: logMes,
        mercadoria: mercMes,
        margem: realMes - logMes - mercMes,
        percLog,
        syllas: actual.syllas,
        v1: actual.v1,
        v2: actual.v2,
        v3: actual.v3
      };
    });

    return { 
      monthlyData, 
      totalRealizado, 
      atingimento: (totalRealizado / metaAnualFixa) * 100,
      totalLogistica,
      margemBrutaAnual: totalRealizado - totalLogistica - totalMercadoria,
      avgLogPerc: totalRealizado > 0 ? (totalLogistica / totalRealizado) * 100 : 0
    };
  }, [db, selectedYear]);

  // Gestão T20 - Análise de Histórico (2021-2025) vs Projeção (2026-2028)
  const t20Analysis = useMemo(() => {
    const analysis = HISTORICAL_TOP_CLIENTS.map(client => {
      const histTotal = client.history['aggregate'] || 0;
      const mediaHistoricaAnual = histTotal / 5;

      const val26 = db.t20Projections[client.id]?.[2026] || 0;
      const val27 = db.t20Projections[client.id]?.[2027] || 0;
      const val28 = db.t20Projections[client.id]?.[2028] || 0;

      const isOcioso = val26 === 0;
      const opportunityCost = isOcioso ? mediaHistoricaAnual : 0;
      const performanceVsHist = mediaHistoricaAnual > 0 ? ((val26 / mediaHistoricaAnual) - 1) * 100 : 0;

      return { 
        ...client, 
        histTotal,
        mediaHistoricaAnual, 
        val26, val27, val28, 
        isOcioso, 
        opportunityCost,
        performanceVsHist
      };
    }).sort((a, b) => b.histTotal - a.histTotal);

    const totalOpportunityCost = analysis.reduce((sum, c) => sum + c.opportunityCost, 0);

    return { analysis, totalOpportunityCost };
  }, [db]);

  // Performance por Vendedor
  const sellerPerformance = useMemo(() => {
    return SELLERS.map(s => {
      let realizadoVendedor = 0;
      let metaVendedor = 0;
      MONTHS.forEach(m => {
        const rev = db.revenue[selectedYear]?.[m] || { syllas: 0, v1: 0, v2: 0, v3: 0 };
        realizadoVendedor += rev[s.id] || 0;
        metaVendedor += INDIVIDUAL_METAS[s.id]?.[m] || 0;
      });
      return { id: s.id, label: s.label, realizado: realizadoVendedor, meta: metaVendedor, atingimento: metaVendedor > 0 ? (realizadoVendedor / metaVendedor) * 100 : 0 };
    });
  }, [db, selectedYear]);

  // Input Handlers
  const handleRevenueInput = (month: string, seller: string, value: string) => {
    const num = parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    setDb(prev => ({
      ...prev,
      revenue: {
        ...prev.revenue,
        [selectedYear]: { ...prev.revenue[selectedYear], [month]: { ...prev.revenue[selectedYear][month], [seller]: num } }
      }
    }));
  };

  const handleOpInput = (month: string, field: string, value: string) => {
    const num = parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    setDb(prev => ({
      ...prev,
      operational: {
        ...prev.operational,
        [selectedYear]: { ...prev.operational[selectedYear], [month]: { ...prev.operational[selectedYear][month], [field]: num } }
      }
    }));
  };

  const handleT20Input = (clientId: string, year: number, value: string) => {
    const num = parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    setDb(prev => ({
      ...prev,
      t20Projections: {
        ...prev.t20Projections,
        [clientId]: { ...prev.t20Projections[clientId], [year]: num }
      }
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-gray-100 pb-24 font-sans custom-scrollbar">
      {/* HEADER CORPORATIVO SK-G */}
      <header className="bg-[#cc1d1d] shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4 border-b border-red-800">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/Ky5zDy2.png" alt="SK-G" className="h-10 bg-white p-1 rounded-md" />
          <h1 className="text-xl font-black uppercase italic tracking-tighter">SK-G Intelligence BI</h1>
        </div>
        <nav className="flex bg-red-900/40 p-1 rounded-xl border border-red-500/30 overflow-x-auto">
          {['goals', 'performance', 't20', 'efficiency'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === t ? 'bg-white text-red-700 shadow-md' : 'text-white/70 hover:bg-red-700/40'}`}>
              {t === 'goals' ? 'Faturamento' : t === 'performance' ? 'Vendedores' : t === 't20' ? 'Gestão Top 20' : 'Custos e Margem'}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
           <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-red-900 border border-red-500 text-white rounded-lg px-3 py-1 text-xs font-black uppercase outline-none">
              {YEARS.map(y => <option key={y} value={y}>{String(y)}</option>)}
           </select>
           <button onClick={handleGlobalSave} className={`px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 ${saveFeedback ? 'bg-emerald-600' : 'bg-[#008f39] hover:bg-emerald-500'}`}>
             {saveFeedback ? '✓ SINCRONIZADO' : '💾 SALVAR BANCO'}
           </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto w-full">
        {/* KPI CARDS - 4 COLUNAS WIDE */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Receita Bruta {String(selectedYear)}</p>
            <p className="text-3xl font-black text-emerald-400">{formatBRL(biMetrics.totalRealizado)}</p>
            <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Consolidado Mensal</p>
          </div>
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-amber-500">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Atingimento de Meta</p>
            <p className="text-3xl font-black text-amber-400">{String(biMetrics.atingimento.toFixed(1))}%</p>
            <div className="h-1.5 w-full bg-gray-900 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-amber-500" style={{width: `${Math.min(100, biMetrics.atingimento)}%`}}></div>
            </div>
          </div>
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-red-500">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Logística Consolidada</p>
            <p className="text-3xl font-black text-red-400">{formatBRL(biMetrics.totalLogistica)}</p>
            <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Impacto: {String(biMetrics.avgLogPerc.toFixed(1))}%</p>
          </div>
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-t-4 border-t-blue-600">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Custo Oportunidade T20</p>
            <p className="text-3xl font-black text-purple-400">{formatBRL(t20Analysis.totalOpportunityCost)}</p>
            <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Faturamento Perdido</p>
          </div>
        </section>

        {activeTab === 'goals' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                 <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-emerald-400">Curva de Faturamento vs Meta</h3>
                 <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={biMetrics.monthlyData}>
                        <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                        <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                        <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                        <Bar dataKey="realizado" name="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                        <Line type="monotone" dataKey="meta" name="Meta Geral" stroke="#1e3a8a" strokeWidth={3} dot={{r: 4}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                 </div>
              </div>
              <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                <h3 className="text-lg font-black uppercase italic mb-6 tracking-widest">Input de Faturamento Mensal - {String(selectedYear)}</h3>
                <div className="overflow-x-auto max-h-[350px] custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0b0e14] text-gray-500 uppercase font-black sticky top-0 z-10 border-b border-gray-800">
                      <tr>
                        <th className="px-4 py-4 border-r border-gray-800 sticky left-0 bg-[#0b0e14]">Mês</th>
                        {SELLERS.map(s => <th key={s.id} className="px-4 py-4 text-center">{String(s.label)}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {biMetrics.monthlyData.map((row) => (
                        <tr key={row.month} className="hover:bg-white/[0.01]">
                          <td className="px-4 py-3 font-black text-gray-400 border-r border-gray-800 sticky left-0 bg-[#12161f]">{String(row.month)}</td>
                          {SELLERS.map((s) => (
                            <td key={s.id} className="px-2 py-2">
                              <input type="text" className="bg-gray-950 border border-gray-800 rounded px-3 py-2 w-full text-center font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" value={String(row[s.id as keyof typeof row] || '')} onChange={(e) => handleRevenueInput(row.month, s.id, e.target.value)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {sellerPerformance.map(s => (
                <div key={s.id} className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">{String(s.label)}</p>
                  <p className="text-2xl font-black text-white">{formatBRL(s.realizado)}</p>
                  <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Meta Fixa: {formatBRL(s.meta)}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-xs font-black ${s.atingimento >= 100 ? 'text-emerald-400' : 'text-red-500'}`}>{String(s.atingimento.toFixed(1))}%</span>
                    <div className="flex-1 h-1.5 bg-gray-900 ml-4 rounded-full overflow-hidden">
                      <div className={`h-full ${s.atingimento >= 100 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{width: `${Math.min(100, s.atingimento)}%`}}></div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
            <section className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
               <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-emerald-400">Comparativo Comercial de Equipe</h3>
               <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={biMetrics.monthlyData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                      <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                      <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Legend />
                      <Bar dataKey="syllas" name="Syllas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="v1" name="V01" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="v2" name="V02" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </section>
          </div>
        )}

        {activeTab === 't20' && (
          <div className="animate-in slide-in-from-bottom duration-500 space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                  <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-blue-400">Análise de Fidelidade T20</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={t20Analysis.analysis.slice(0, 10)} layout="vertical" margin={{left: 20}}>
                        <CartesianGrid stroke="#1f2937" horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                        <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={9} width={100} tickFormatter={v => v.split(' ')[0]} />
                        <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                        <Bar dataKey="histTotal" name="Total 21-25" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                  <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-purple-400">Custo de Oportunidade Mensal</h3>
                  <div className="flex-1 flex flex-col justify-center items-center h-full">
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Total Projetado Recuperável</p>
                     <p className="text-6xl font-black text-purple-500 tracking-tighter mb-4">{formatBRL(t20Analysis.totalOpportunityCost)}</p>
                     <p className="text-xs text-gray-600 font-bold uppercase text-center max-w-xs">Representa o faturamento médio industrial não realizado por clientes ociosos.</p>
                  </div>
               </div>
            </section>

            <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-gray-800 bg-gray-950/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-widest text-blue-400">Gestão Top 20: Histórico vs Projeção</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead className="bg-[#0b0e14] text-gray-500 font-black uppercase border-b border-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left sticky left-0 bg-[#0b0e14] border-r border-gray-800">Empresa Cliente</th>
                      <th className="px-4 py-4 text-center">Total 21-25 (Hist.)</th>
                      <th className="px-4 py-4 text-center bg-blue-900/10 text-blue-200">Proj 2026</th>
                      <th className="px-4 py-4 text-center bg-blue-800/10 text-blue-100">Proj 2027</th>
                      <th className="px-4 py-4 text-center bg-blue-700/10 text-blue-50">Proj 2028</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {t20Analysis.analysis.map(client => (
                      <tr key={client.id} className={`hover:bg-white/[0.02] ${client.isOcioso ? 'bg-red-950/5' : ''}`}>
                        <td className="px-6 py-4 sticky left-0 bg-[#12161f] font-black text-gray-300 border-r border-gray-800 truncate max-w-[250px]">{String(client.name)}</td>
                        <td className="px-4 py-4 text-center text-gray-500 font-bold">{formatBRL(client.histTotal)}</td>
                        <td className="px-2 py-2">
                           <input type="text" className={`bg-gray-950/60 border rounded px-2 py-1.5 w-full text-center font-black outline-none ${client.isOcioso ? 'border-red-500/30 text-red-400' : 'border-blue-500/30 text-blue-200 focus:ring-1 focus:ring-blue-500'}`} value={String(client.val26 || '')} onChange={e => handleT20Input(client.id, 2026, e.target.value)} />
                        </td>
                        <td className="px-2 py-2">
                           <input type="text" className="bg-gray-950/40 border border-gray-800/50 rounded px-2 py-1.5 w-full text-center font-black text-blue-100 outline-none" value={String(client.val27 || '')} onChange={e => handleT20Input(client.id, 2027, e.target.value)} />
                        </td>
                        <td className="px-2 py-2">
                           <input type="text" className="bg-gray-950/40 border border-gray-800/50 rounded px-2 py-1.5 w-full text-center font-black text-blue-50 outline-none" value={String(client.val28 || '')} onChange={e => handleT20Input(client.id, 2028, e.target.value)} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          {client.isOcioso ? (
                            <span className="text-[9px] font-black text-red-500 uppercase animate-pulse">OCIOSO</span>
                          ) : (
                            <span className={`text-[9px] font-black uppercase ${client.performanceVsHist >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {client.performanceVsHist >= 0 ? 'CRESCIMENTO' : 'RETRAÇÃO'}
                            </span>
                          )}
                        </td>
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
            <section className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
                 <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-red-500">Fluxo Operacional: Receita vs Logística vs % Frete</h3>
                 <div className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={biMetrics.monthlyData}>
                        <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                        <YAxis yAxisId="left" stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#facc15" fontSize={10} tickFormatter={v => `${v}%`} />
                        <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="realizado" name="Faturamento" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar yAxisId="left" dataKey="logistica" name="Logística" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={15} />
                        <Line yAxisId="right" type="monotone" dataKey="percLog" name="Peso Logístico %" stroke="#facc15" strokeWidth={4} dot={{r: 6}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                 </div>
            </section>

            <section className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-x-auto">
               <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-red-500">Detalhamento Operacional - {String(selectedYear)}</h3>
               <table className="w-full text-left text-sm">
                  <thead className="bg-[#0b0e14] text-gray-500 text-[10px] uppercase font-black">
                    <tr>
                      <th className="px-6 py-5 border-r border-gray-800">Mês</th>
                      <th className="px-4 py-5 text-center">ZM Express</th>
                      <th className="px-4 py-5 text-center">Terc. Express</th>
                      <th className="px-4 py-5 text-center text-amber-400">Correios</th>
                      <th className="px-4 py-5 text-center bg-gray-900/40 text-blue-400">Insumos (MP)</th>
                      <th className="px-6 py-5 text-center font-black">Peso Log %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {biMetrics.monthlyData.map(row => {
                      const op = (db.operational[selectedYear][row.month] || { zm: 0, terceiro: 0, correios: 0, mercadoria: 0 }) as MonthlyOperational;
                      return (
                        <tr key={row.month}>
                          <td className="px-6 py-4 font-black text-gray-400 border-r border-gray-800">{String(row.month)}</td>
                          <td className="px-2 py-2"><input type="text" className="bg-gray-950 border border-gray-800 rounded px-3 py-2 w-full text-center font-bold" value={String(op.zm || '')} onChange={e => handleOpInput(row.month, 'zm', e.target.value)} /></td>
                          <td className="px-2 py-2"><input type="text" className="bg-gray-950 border border-gray-800 rounded px-3 py-2 w-full text-center font-bold" value={String(op.terceiro || '')} onChange={e => handleOpInput(row.month, 'terceiro', e.target.value)} /></td>
                          <td className="px-2 py-2"><input type="text" className="bg-gray-950 border border-amber-500/20 rounded px-3 py-2 w-full text-center font-black text-amber-400" value={String(op.correios || '')} onChange={e => handleOpInput(row.month, 'correios', e.target.value)} /></td>
                          <td className="px-2 py-2 bg-gray-900/10"><input type="text" className="bg-gray-950 border border-gray-800 rounded px-3 py-2 w-full text-center font-bold text-blue-400 opacity-70" value={String(op.mercadoria || '')} onChange={e => handleOpInput(row.month, 'mercadoria', e.target.value)} /></td>
                          <td className={`px-6 py-4 text-center font-black ${row.percLog > 9 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>{String(row.percLog.toFixed(1))}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER FINANCEIRO GLOBAL */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#008f39] p-4 z-50 border-t border-emerald-400/20 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center text-white gap-2">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-glow"></div>
             <span className="text-xs font-black uppercase tracking-widest italic">SK-G BI v23.0 | ENGINE PERSISTENTE | Meta {String(selectedYear)}: {formatBRL(2180000)}</span>
          </div>
          <div className="flex gap-10 items-center">
             <div className="text-right">
                <p className="text-[9px] font-black uppercase opacity-60 italic">Custo Oportunidade T20</p>
                <p className="text-xl font-black">{formatBRL(t20Analysis.totalOpportunityCost)}</p>
             </div>
             <div className="w-px h-8 bg-white/20"></div>
             <div className="text-right">
                <p className="text-[9px] font-black uppercase opacity-60 italic">Margem Bruta {String(selectedYear)}</p>
                <p className="text-xl font-black">{formatBRL(biMetrics.margemBrutaAnual)}</p>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
