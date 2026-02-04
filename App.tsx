
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, Area, Cell
} from 'recharts';
import { TARGET_GOALS, MONTHS, SELLERS, YEARS, HISTORICAL_TOP_CLIENTS, INDIVIDUAL_METAS } from './constants';
import { YearlyActualData, SellerActual, YearlyOperationalData, MonthlyOperational } from './types';

// Proteção Erro #31 - Garante saída String e Formatação Monetária BR
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

  // Database Engine - Persistência Total SK-G (2026-2028)
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
      const saved = localStorage.getItem('SKG_BI_INDUSTRIAL_V24_SECURE');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          revenue: { ...initialRevenue, ...parsed.revenue },
          operational: { ...initialOp, ...parsed.operational },
          t20Projections: { ...initialT20, ...parsed.t20Projections }
        };
      }
    } catch (e) { console.warn("Database sync fail:", e); }
    return { revenue: initialRevenue, operational: initialOp, t20Projections: initialT20 };
  });

  const handleGlobalSave = () => {
    localStorage.setItem('SKG_BI_INDUSTRIAL_V24_SECURE', JSON.stringify(db));
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  // BI Metrics - Consolidação Industrial (Faturamento, Metas e Custos Operacionais)
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
      const percCustoMes = realMes > 0 ? ((logMes + mercMes) / realMes) * 100 : 0;

      return { 
        month: m, 
        meta: metaMesTotal, 
        realizado: realMes,
        logistica: logMes,
        mercadoria: mercMes,
        custoTotal: logMes + mercMes,
        percCusto: percCustoMes,
        syllas: actual.syllas,
        v1: actual.v1,
        v2: actual.v2,
        v3: actual.v3
      };
    });

    const totalCustoGeral = totalLogistica + totalMercadoria;
    const percEficienciaGeral = totalRealizado > 0 ? (totalCustoGeral / totalRealizado) * 100 : 0;

    return { 
      monthlyData, 
      totalRealizado, 
      atingimento: (totalRealizado / metaAnualFixa) * 100,
      totalLogistica,
      totalCustoGeral,
      percEficienciaGeral,
      totalMercadoria
    };
  }, [db, selectedYear]);

  // Gestão T20 - Análise Histórica vs Projeção
  const t20Analysis = useMemo(() => {
    const analysis = HISTORICAL_TOP_CLIENTS.map(client => {
      const histTotal = (client.history as any).aggregate || 0;
      const mediaHistoricaAnual = histTotal / 5;

      const currentYearKey = parseInt(selectedYear);
      const valProj = db.t20Projections[client.id]?.[currentYearKey] || 0;

      const isOcioso = valProj === 0;
      const opportunityCost = isOcioso ? mediaHistoricaAnual : 0;
      const performanceVsHist = mediaHistoricaAnual > 0 ? ((valProj / mediaHistoricaAnual) - 1) * 100 : 0;

      return { 
        ...client, 
        histTotal,
        mediaHistoricaAnual, 
        valProj, 
        isOcioso, 
        opportunityCost,
        performanceVsHist
      };
    }).sort((a, b) => b.histTotal - a.histTotal);

    const totalOpportunityCost = analysis.reduce((sum, c) => sum + c.opportunityCost, 0);

    return { analysis, totalOpportunityCost };
  }, [db, selectedYear]);

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
      {/* HEADER BI CORPORATIVO SK-G */}
      <header className="bg-[#cc1d1d] shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 gap-4 border-b border-red-800">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/Ky5zDy2.png" alt="SK-G" className="h-10 bg-white p-1 rounded-md" />
          <h1 className="text-xl font-black uppercase italic tracking-tighter">SK-G Industrial Intelligence</h1>
        </div>
        <nav className="flex bg-red-900/40 p-1 rounded-xl border border-red-500/30 overflow-x-auto">
          {['goals', 'performance', 't20', 'efficiency'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === t ? 'bg-white text-red-700 shadow-md' : 'text-white/70 hover:bg-red-700/40'}`}>
              {t === 'goals' ? 'Faturamento' : t === 'performance' ? 'Vendedores' : t === 't20' ? 'Gestão Top 20' : 'Custos e Eficiência'}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
           <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-red-900 border border-red-500 text-white rounded-lg px-3 py-1 text-xs font-black uppercase outline-none">
              {YEARS.map(y => <option key={y} value={y}>{String(y)}</option>)}
           </select>
           <button onClick={handleGlobalSave} className={`px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 ${saveFeedback ? 'bg-emerald-600' : 'bg-[#008f39] hover:bg-emerald-500'}`}>
             {saveFeedback ? '✓ DADOS SINCRONIZADOS' : '💾 SALVAR LANÇAMENTOS'}
           </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto w-full">
        {/* KPI CARDS REESTRUTURADOS - 4 COLUNAS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Faturamento {String(selectedYear)}</p>
            <p className="text-3xl font-black text-emerald-400">{formatBRL(biMetrics.totalRealizado)}</p>
            <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Volume Lançado por Time</p>
          </div>
          
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-amber-500">
            {activeTab === 'efficiency' ? (
              <>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Custo Matéria Prima</p>
                <p className="text-3xl font-black text-amber-400">{formatBRL(biMetrics.totalMercadoria)}</p>
                <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Insumos Industriais</p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Atingimento da Meta</p>
                <p className="text-3xl font-black text-amber-400">{String(biMetrics.atingimento.toFixed(1))}%</p>
                <div className="h-1.5 w-full bg-gray-900 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{width: `${Math.min(100, biMetrics.atingimento)}%`}}></div>
                </div>
              </>
            )}
          </div>

          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-l-4 border-l-red-500">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Logística Total</p>
            <p className="text-3xl font-black text-red-400">{formatBRL(biMetrics.totalLogistica)}</p>
            <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">ZM + Terceiro + Correios</p>
          </div>
          <div className="bg-[#12161f] p-6 rounded-3xl border border-gray-800 shadow-xl border-t-4 border-t-blue-600">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Eficiência Operacional</p>
            <p className="text-3xl font-black text-blue-400">{formatBRL(biMetrics.totalCustoGeral)}</p>
            <div className="flex items-center justify-between mt-2">
               <span className="text-[10px] text-gray-400 font-black uppercase">Peso sobre Fat:</span>
               <span className="text-xs font-black text-blue-300">{String(biMetrics.percEficienciaGeral.toFixed(1))}%</span>
            </div>
          </div>
        </section>

        {activeTab === 'goals' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            <section className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl">
               <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-emerald-400">Curva de Faturamento vs Meta Industrial</h3>
               <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={biMetrics.monthlyData}>
                      <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                      <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Bar dataKey="realizado" name="Faturamento Real" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                      <Line type="monotone" dataKey="meta" name="Meta de Vendas" stroke="#1e3a8a" strokeWidth={3} dot={{r: 4}} />
                    </ComposedChart>
                  </ResponsiveContainer>
               </div>
            </section>

            <section className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-x-auto">
                <h3 className="text-lg font-black uppercase italic mb-6 tracking-widest">Lançamento de Faturamento Mensal - {String(selectedYear)}</h3>
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
                          <td key={s.id} className="px-1 py-1">
                            <input type="text" className="bg-gray-950 border border-gray-800 rounded px-3 py-2 w-full text-center font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500" value={String(row[s.id as keyof typeof row] || '')} onChange={(e) => handleRevenueInput(row.month, s.id, e.target.value)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase">Meta Comercial: {formatBRL(s.meta)}</p>
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
               <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-emerald-400">Benchmarking de Vendedores</h3>
               <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={biMetrics.monthlyData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                      <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                      <YAxis stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                      <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                      <Legend />
                      <Bar dataKey="syllas" name="Syllas (Dir)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="v1" name="Vendedora 01" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="v2" name="Vendedora 02" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </section>
          </div>
        )}

        {activeTab === 't20' && (
          <div className="animate-in slide-in-from-bottom duration-500 space-y-8">
             <section className="bg-[#12161f] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-gray-800 bg-gray-950/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-widest text-blue-400">Gestão Top 20: Faturamento vs Ociosidade</h3>
                    <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase italic">Foco Industrial Séries 61/63</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-red-500 uppercase">Custo Oportunidade (Projetado)</p>
                    <p className="text-2xl font-black text-white">{formatBRL(t20Analysis.totalOpportunityCost)}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-[#0b0e14] text-gray-500 font-black uppercase border-b border-gray-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left sticky left-0 bg-[#0b0e14] border-r border-gray-800">Cliente Principal</th>
                        <th className="px-4 py-4 text-center">Média Hist. (21-25)</th>
                        <th className="px-4 py-4 text-center bg-blue-900/10 text-blue-200">Realizado {String(selectedYear)}</th>
                        <th className="px-6 py-4 text-center">Status Industrial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {t20Analysis.analysis.map(client => (
                        <tr key={client.id} className={`hover:bg-white/[0.02] ${client.isOcioso ? 'bg-red-950/5' : ''}`}>
                          <td className="px-6 py-4 sticky left-0 bg-[#12161f] font-black text-gray-300 border-r border-gray-800 truncate max-w-[250px]">{String(client.name)}</td>
                          <td className="px-4 py-4 text-center text-gray-500 font-bold">{formatBRL(client.mediaHistoricaAnual)}</td>
                          <td className="px-2 py-2">
                             <input type="text" className={`bg-gray-950/60 border rounded px-2 py-1.5 w-full text-center font-black outline-none ${client.isOcioso ? 'border-red-500/30 text-red-400' : 'border-blue-500/30 text-blue-200 focus:ring-1 focus:ring-blue-500'}`} value={String(client.valProj || '')} onChange={e => handleT20Input(client.id, parseInt(selectedYear), e.target.value)} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            {client.isOcioso ? (
                              <span className="text-[9px] font-black text-red-500 uppercase animate-pulse">OCIOSIDADE TOTAL</span>
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
                 <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-blue-400">Eficiência Operacional: Receita vs Custos Industriais</h3>
                 <div className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={biMetrics.monthlyData}>
                        <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="#4b5563" fontSize={11} />
                        <YAxis yAxisId="left" stroke="#4b5563" fontSize={10} tickFormatter={v => `R$${v/1000}k`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} tickFormatter={v => `${v}%`} />
                        <Tooltip contentStyle={{backgroundColor: '#030712', border: 'none', borderRadius: '12px'}} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="realizado" name="Faturamento" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar yAxisId="left" dataKey="custoTotal" name="Custo Operacional" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={15} />
                        <Line yAxisId="right" type="monotone" dataKey="percCusto" name="% Custo/Fat" stroke="#10b981" strokeWidth={4} dot={{r: 6}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                 </div>
            </section>

            <section className="bg-[#12161f] p-8 rounded-3xl border border-gray-800 shadow-xl overflow-x-auto">
               <h3 className="text-lg font-black uppercase italic mb-8 tracking-widest text-red-500">Lançamento de Custos Operacionais - {String(selectedYear)}</h3>
               <table className="w-full text-left text-sm">
                  <thead className="bg-[#0b0e14] text-gray-500 text-[10px] uppercase font-black">
                    <tr>
                      <th className="px-6 py-5 border-r border-gray-800 sticky left-0 bg-[#0b0e14]">Mês</th>
                      <th className="px-4 py-5 text-center">Matéria-Prima</th>
                      <th className="px-4 py-5 text-center">ZM Express</th>
                      <th className="px-4 py-5 text-center">Terc. Express</th>
                      <th className="px-4 py-5 text-center text-amber-400">Correios</th>
                      <th className="px-6 py-5 text-center font-black">Custo Op %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {biMetrics.monthlyData.map(row => {
                      const op = (db.operational[selectedYear][row.month] || { zm: 0, terceiro: 0, correios: 0, mercadoria: 0 }) as MonthlyOperational;
                      return (
                        <tr key={row.month}>
                          <td className="px-6 py-4 font-black text-gray-400 border-r border-gray-800 sticky left-0 bg-[#12161f]">{String(row.month)}</td>
                          <td className="px-2 py-2 bg-gray-900/10"><input type="text" className="bg-gray-950 border border-gray-800 rounded px-3 py-2 w-full text-center font-bold text-emerald-400" value={String(op.mercadoria || '')} onChange={e => handleOpInput(row.month, 'mercadoria', e.target.value)} /></td>
                          <td className="px-2 py-2"><input type="text" className="bg-gray-950 border border-gray-800 rounded px-3 py-2 w-full text-center font-bold" value={String(op.zm || '')} onChange={e => handleOpInput(row.month, 'zm', e.target.value)} /></td>
                          <td className="px-2 py-2"><input type="text" className="bg-gray-950 border border-gray-800 rounded px-3 py-2 w-full text-center font-bold" value={String(op.terceiro || '')} onChange={e => handleOpInput(row.month, 'terceiro', e.target.value)} /></td>
                          <td className="px-2 py-2"><input type="text" className="bg-gray-950 border border-amber-500/20 rounded px-3 py-2 w-full text-center font-black text-amber-400" value={String(op.correios || '')} onChange={e => handleOpInput(row.month, 'correios', e.target.value)} /></td>
                          <td className={`px-6 py-4 text-center font-black ${row.percCusto > 40 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>{String(row.percCusto.toFixed(1))}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER FINANCEIRO INDUSTRIAL */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#008f39] p-4 z-50 border-t border-emerald-400/20 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center text-white gap-2">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-glow"></div>
             <span className="text-xs font-black uppercase tracking-widest italic">SK-G BI v24.0 | PERSISTENTE | Meta {String(selectedYear)}: {formatBRL(2180000)}</span>
          </div>
          <div className="flex gap-10 items-center">
             <div className="text-right">
                <p className="text-[9px] font-black uppercase opacity-60 italic">Custo Op. Total ({String(selectedYear)})</p>
                <p className="text-xl font-black">{formatBRL(biMetrics.totalCustoGeral)}</p>
             </div>
             <div className="w-px h-8 bg-white/20"></div>
             <div className="text-right">
                <p className="text-[9px] font-black uppercase opacity-60 italic">Margem Est. Bruta</p>
                <p className="text-xl font-black">{formatBRL(biMetrics.totalRealizado - biMetrics.totalCustoGeral)}</p>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
