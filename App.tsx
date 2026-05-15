import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, AreaChart, Area 
} from 'recharts';
import { initialClients, initialMonthlyData, initialSalespersonData, initialCustosEficiencia, initialGestaoTop20, initialQuarterlyHistory, QuarterlyData } from './src/data';
import { ChartWrapper } from './components/ChartWrapper';

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
  { month: 'Jan', meta: 142500, r2026: 74919.58, r2027: 0, r2028: 0 },
  { month: 'Fev', meta: 192000, r2026: 128909.00, r2027: 0, r2028: 0 },
  { month: 'Mar', meta: 168000, r2026: 66982.35, r2027: 0, r2028: 0 },
  { month: 'Abr', meta: 168000, r2026: 143492.89, r2027: 0, r2028: 0 },
  { month: 'Mai', meta: 165000, r2026: 131965.14, r2027: 0, r2028: 0 },
  { month: 'Jun', meta: 160000, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Jul', meta: 187000, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Ago', meta: 196000, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Set', meta: 206000, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Out', meta: 212000, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Nov', meta: 218000, r2026: 0, r2027: 0, r2028: 0 },
  { month: 'Dez', meta: 205000, r2026: 0, r2027: 0, r2028: 0 },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('FATURAMENTO E CUSTOS');
  const [metas, setMetas] = useState(() => JSON.parse(localStorage.getItem('skg-metas') || JSON.stringify(metaMensal)));
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

  const totalBilling2026 = useMemo(() => metas.reduce((acc: any, m: any) => acc + m.r2026, 0), [metas]);
  const metaAno = useMemo(() => metas.reduce((acc: any, m: any) => acc + m.meta, 0), [metas]);
  const atingimento = useMemo(() => (metaAno > 0 ? (totalBilling2026 / metaAno) * 100 : 0), [totalBilling2026, metaAno]);
  
  // Migration: Reset local data if stale or incorrect

  const metaAnualCamozzi = useMemo(() => custos.reduce((acc: any, m: any) => acc + m.metaCamozzi, 0), [custos]);
  const custoTotalCamozzi = useMemo(() => custos.reduce((acc: any, m: any) => acc + m.custoCamozzi, 0), [custos]);
  const custoTotalOutros = useMemo(() => custos.reduce((acc: any, m: any) => acc + m.custoOutros, 0), [custos]);
  
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
          {['FATURAMENTO E CUSTOS', 'VENDEDORES', 'DASHBOARD T10', 'GESTÃO TOP 20', 'ANÁLISE TRIMESTRAL'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-bold rounded ${activeTab === tab ? 'bg-white text-red-700' : 'bg-red-900/50 text-white hover:bg-red-900'}`}>{tab}</button>
          ))}
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-red-900 text-white font-bold p-2 rounded">
             <option value="2026">2026</option>
             <option value="2027">2027</option>
             <option value="2028">2028</option>
          </select>
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2">💾 SALVAR LANÇAMENTOS</button>
        </div>
      </header>

      {activeTab === 'FATURAMENTO E CUSTOS' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <section className="grid grid-cols-5 gap-4">
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Meta Anual Camozzi</p>
                <p className="text-xl font-black mt-2 text-emerald-400">{formatBRL(400000)}</p>
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
                <p className="text-xl font-black mt-2 text-red-500">{formatBRL(custos.reduce((a,c) => a + c.materiaPrima, 0))}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Custos Logísticos</p>
                <p className="text-xl font-black mt-2 text-red-400">{formatBRL(custos.reduce((a: any,c: any) => a + c.zmExpress + c.tercExpress + c.correios, 0))}</p>
              </div>
           </section>

           <section className="grid grid-cols-2 gap-6">
              <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-emerald-400 font-bold italic mb-4">FATURAMENTO VS META</h2>
                <ChartWrapper height={300}>
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
              <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-red-400 font-bold italic mb-4 uppercase tracking-wider flex justify-between items-center">
                  <span>CUSTOS: CAMOZZI VS LOGÍSTICA</span>
                  <span className="text-[10px] text-gray-500 font-mono font-normal">Comparativo Estrutural de Custos</span>
                </h2>
                <ChartWrapper height={300}>
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
           </section>

           <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-amber-400 font-bold italic mb-4 uppercase tracking-wider flex justify-between items-center text-sm">
                  <span>COMPOSIÇÃO E TRENDS DE CUSTOS LOGÍSTICOS</span>
                  <span className="text-[10px] text-gray-500 font-mono font-normal">Análise p/ Modal de Entrega</span>
                </h2>
                <ChartWrapper height={250}>
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
             
             <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-red-500 font-bold italic mb-4 uppercase tracking-wider flex justify-between items-center text-[10px]">
                  <span>PESO LOGÍSTICO (% SOBRE FATURAMENTO)</span>
                  <span className="text-[8px] text-gray-500 font-mono font-normal">Eficiência em Tempo Real</span>
                </h2>
                <ChartWrapper height={200}>
                  <ComposedChart data={custos.map((c: any, idx: number) => ({ 
                    mes: c.mes, 
                    perc: (metas[idx]?.r2026 > 0) ? (((c.zmExpress + c.tercExpress + c.correios) / metas[idx].r2026) * 100) : 0 
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

           <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
              <h2 className="text-white font-bold italic mb-4">ANÁLISE DETALHADA E LANÇAMENTOS</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase bg-gray-800 text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Mês</th>
                      <th className="px-4 py-3">Faturamento</th>
                      <th className="px-4 py-3">Matéria-Prima (Camozzi)</th>
                      <th className="px-4 py-3">ZM Express</th>
                      <th className="px-4 py-3">Terc. Express</th>
                      <th className="px-4 py-3">Correios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {custos.map((m: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="px-4 py-3 font-bold">{m.mes}</td>
                        <td className="px-4 py-3">
                            <input 
                                type="text" 
                                value={formatBRL(metas[idx]?.r2026 || 0)} 
                                onChange={(e) => {
                                 const rawValue = e.target.value.replace(/[R$\s.]/g, '').replace(',', '.');
                                 const val = parseFloat(rawValue) || 0;
                                 setMetas(prev => prev.map((item, i) => i === idx ? {...item, r2026: val} : item));
                               }}
                               className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full text-right"
                             />
                        </td>
                        {[
                          {key: 'materiaPrima', setter: (val: number) => setCustos(prev => prev.map((item, i) => i === idx ? {...item, materiaPrima: val} : item))},
                          {key: 'zmExpress', setter: (val: number) => setCustos(prev => prev.map((item, i) => i === idx ? {...item, zmExpress: val} : item))},
                          {key: 'tercExpress', setter: (val: number) => setCustos(prev => prev.map((item, i) => i === idx ? {...item, tercExpress: val} : item))},
                          {key: 'correios', setter: (val: number) => setCustos(prev => prev.map((item, i) => i === idx ? {...item, correios: val} : item))},
                        ].map(({key, setter}) => (
                           <td key={key} className="px-4 py-3">
                             <input 
                               type="text" 
                               value={formatBRL(m[key])} 
                               onChange={(e) => {
                                 const rawValue = e.target.value.replace(/[R$\s.]/g, '').replace(',', '.');
                                 setter(parseFloat(rawValue) || 0);
                               }}
                               className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full text-right"
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

      {activeTab === 'VENDEDORES' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           {/* Section 1: Visual Performance Cards */}
           <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {(() => {
                const salespeople = [
                  { id: 'Syllas', label: 'SYLLAS (DIR.)', meta: 1389500, color: '#10b981' },
                  { id: 'V1', label: 'VENDEDORA 01', meta: 465000, color: '#3b82f6' },
                  { id: 'V2', label: 'VENDEDORA 02', meta: 339000, color: '#ef4444' }
                ];

                const totalMetaEmpresa = salespeople.reduce((acc, s) => acc + s.meta, 0);

                return salespeople.map(s => {
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

           <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
             <h2 className="text-white font-bold italic mb-4">LANÇAMENTO DE FATURAMENTO MENSAL - {selectedYear}</h2>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-gray-300">
                 <thead className="text-xs uppercase bg-gray-800 text-gray-400">
                   <tr>
                     <th className="px-6 py-3">Mês</th>
                     {Object.keys(vendedorData[0]).filter(k => k !== 'month').map(v => <th key={v} className="px-6 py-3">{v} (R$)</th>)}
                   </tr>
                 </thead>
                 <tbody>
                   {vendedorData.map((m: any, idx: number) => (
                     <tr key={idx} className="border-b border-gray-800">
                       <td className="px-6 py-4 font-bold">{m.month}</td>
                       {Object.keys(m).filter(k => k !== 'month').map((vendedor) => (
                          <td key={vendedor} className="px-6 py-4">
                            <input 
                              type="text" 
                              value={typeof m[vendedor] === 'number' ? formatBRL(m[vendedor]) : m[vendedor]} 
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/[R$\s.]/g, '').replace(',', '.');
                                const val = parseFloat(rawValue) || 0;
                                setVendedorData(prev => prev.map((item: any, i: number) => i === idx ? {...item, [vendedor]: val} : item));
                              }}
                              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full text-right"
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

      {activeTab === 'DASHBOARD T10' && (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
          {/* Section 1: Curva de Evolução Visual (ASCII-Style inspired) */}
          <section className="bg-[#0a0c10] p-8 rounded-3xl border border-gray-800 shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-white font-black italic text-3xl uppercase tracking-tighter">DASHBOARD EVOLUTIVO T10</h2>
                <p className="text-xs text-gray-500 mt-1 uppercase font-bold italic tracking-widest">Análise de Comportamento e Ciclo de Vida (2022-2028)</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Total Histórico (22-25)</p>
                  <p className="text-xl font-black text-white font-mono">
                    {formatBRL(gestaoTop20.clientes.slice(0, 10).reduce((acc: number, c: any) => 
                      acc + (Object.values(c.history) as number[]).reduce((a, b) => a + b, 0), 0
                    ))}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* The "ASCII" and Chart Area */}
              <div className="lg:col-span-3 bg-gray-950/50 p-6 rounded-2xl border border-gray-800 relative">
                <ChartWrapper height={400}>
                   <ComposedChart 
                     data={[2022, 2023, 2024, 2025, 2026, 2027, 2028].map(year => ({
                       year: String(year),
                       total: gestaoTop20.clientes.slice(0, 10).reduce((acc: number, c: any) => {
                         if (year <= 2025) return acc + (c.history[year] || 0);
                         const pKey = `projection${year}`;
                         return acc + (c[pKey] || 0);
                       }, 0)
                     }))}
                    >
                     <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                     <XAxis dataKey="year" stroke="#444" fontSize={12} tick={{ fill: '#666', fontWeight: 'bold' }} />
                     <YAxis stroke="#444" fontSize={10} width={80} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                        formatter={(v: number) => formatBRL(v)}
                     />
                     <Area type="monotone" dataKey="total" fill="#ef4444" stroke="#ef4444" fillOpacity={0.1} strokeWidth={4} />
                     <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.3} barSize={40} />
                     <Line type="monotone" dataKey="total" stroke="#fff" strokeWidth={2} dot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                   </ComposedChart>
                </ChartWrapper>
                
                {/* stylized curve ASCII summary indicator */}
                <div className="absolute top-10 right-10 text-right opacity-30 select-none pointer-events-none font-mono text-[8px] leading-tight">
                  <pre>
                    {(() => {
                      const points = [2022, 2023, 2024, 2025, 2026, 2027, 2028].map(year => 
                        gestaoTop20.clientes.slice(0, 10).reduce((acc: number, c: any) => {
                          if (year <= 2025) return acc + (c.history[year] || 0);
                          return acc + (c[`projection${year}`] || 0);
                        }, 0)
                      );
                      const max = Math.max(...points) || 1;
                      return points.map(p => {
                        const level = Math.floor((p / max) * 10);
                        return '_'.repeat(10-level) + '█' + '_'.repeat(level);
                      }).join('\n');
                    })()}
                  </pre>
                </div>
              </div>

              {/* Trend Analysis Side Panel */}
              <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 border-l-4 border-l-red-600">
                <h3 className="text-white font-black italic text-sm mb-6 uppercase">Mentoria de Crescimento (T10)</h3>
                <div className="space-y-6">
                  {(() => {
                    const topClient = gestaoTop20.clientes[0];
                    const v2025 = topClient.history[2025] || 0;
                    const v2026 = topClient.projection2026 || 0;
                    const growth = v2025 > 0 ? ((v2026/v2025)-1)*100 : 0;
                    
                    return (
                      <div className="space-y-4">
                        <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg">
                          <p className="text-[10px] text-red-400 font-black uppercase">Foco Principal: {topClient.nome}</p>
                          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                            {growth > 0 
                              ? `Crescimento projetado de ${growth.toFixed(1)}%. Mantenha a cadência de pedidos via SPIN Selling.` 
                              : `Atenção: Queda de ${Math.abs(growth).toFixed(1)}% detectada. Risco de ociosidade técnica.`}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg">
                          <p className="text-[10px] text-emerald-400 font-black uppercase">Ação Recomendada</p>
                          <p className="text-xs text-gray-400 mt-2 italic">"Use o histórico da Fertipar para contornar objeções de preço em novos contratos 2026."</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Tabela Comparativa de Lançamento */}
          <section className="bg-gray-900 p-8 rounded-3xl border border-gray-800 shadow-xl overflow-hidden">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-white font-black italic text-xl uppercase italic">Lançamento de Dados & Status de Estabilidade</h3>
               <div className="flex gap-2">
                 <button 
                   onClick={() => {
                     if(confirm("Deseja resetar o Top 20 para os valores reais do catálogo?")) {
                       localStorage.removeItem('skg-gestao-top20');
                       window.location.reload();
                     }
                   }}
                   className="bg-gray-800 hover:bg-gray-700 text-red-500 px-4 py-2 rounded-full font-black text-[10px] transition-all border border-red-900/30"
                 >
                   RESTAURAR BASE
                 </button>
                 <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full font-black text-xs transition-colors shadow-lg shadow-emerald-900/20">SALVAR ALTERAÇÕES</button>
               </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-800 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                       <th className="px-6 py-4">Cliente / Grupo Industrial</th>
                       <th className="px-6 py-4 text-center">Média Hist. (22-25)</th>
                       <th className="px-6 py-4 text-center">Real 2025</th>
                       <th className="px-6 py-4 text-center">Proj/Real 2026</th>
                       <th className="px-6 py-4 text-center">Proj 2027</th>
                       <th className="px-6 py-4 text-center">Proj 2028</th>
                       <th className="px-6 py-4 text-center">Trend Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {gestaoTop20.clientes.slice(0, 10).map((c: any, idx: number) => {
                      const hist = Object.values(c.history) as number[];
                      const avg = hist.reduce((a, b) => a + b, 0) / (hist.length || 1);
                      const real2025 = c.history[2025] || 0;
                      const real2024 = c.history[2024] || 0;
                      const real2023 = c.history[2023] || 0;
                      
                      const { status, colorBg, colorText, colorBorder } = getClienteStatus(c, c.projection2026 || 0);

                      return (
                        <tr key={c.id} className="hover:bg-gray-800/20 transition-colors group">
                          <td className="px-6 py-5">
                            <p className="text-white font-black text-sm uppercase tracking-tighter truncate w-64">{c.nome}</p>
                            <p className="text-[10px] text-gray-600 font-bold tracking-widest">{c.cidade} | ID: {c.id}</p>
                          </td>
                          <td className="px-6 py-5 text-center font-mono text-xs text-gray-400">{formatBRL(avg)}</td>
                          <td className="px-6 py-5 text-center font-mono text-xs text-gray-500">{formatBRL(real2025)}</td>
                          
                          {/* Editable Projection 2026-2028 */}
                          {[2026, 2027, 2028].map(year => (
                            <td key={year} className="px-6 py-5">
                               <input 
                                 type="text"
                                 className="bg-gray-950 border border-gray-800 text-right font-mono text-[11px] font-black text-emerald-400 p-2 w-full rounded focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                 value={c[`projection${year}`] === 0 ? '' : formatBRL(c[`projection${year}`])}
                                 placeholder="R$ 0,00"
                                 onChange={(e) => {
                                   const rawValue = e.target.value.replace(/[R$\s.]/g, '').replace(',', '.');
                                   const val = parseFloat(rawValue) || 0;
                                   const pKey = `projection${year}`;
                                   setGestaoTop20((prev: any) => ({
                                     ...prev,
                                     clientes: prev.clientes.map((item: any) => item.id === c.id ? { ...item, [pKey]: val } : item)
                                   }));
                                 }}
                               />
                            </td>
                          ))}

                          <td className="px-6 py-5 text-center">
                            <span className={`${colorBg} ${colorText} ${colorBorder || ''} border text-[9px] font-black px-3 py-1 rounded-full whitespace-nowrap`}>
                              {status}
                            </span>
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

      {activeTab === 'ANÁLISE TRIMESTRAL' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Média Histórica (Ano)</p>
                 <p className="text-2xl font-black text-white mt-1">
                   {formatBRL(quarterlySummaries.filter(s => s.year !== '2026').reduce((acc, s) => acc + s.total, 0) / (quarterlySummaries.length - 1))}
                 </p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Projetado 2026</p>
                 <p className="text-2xl font-black text-emerald-400 mt-1">
                   {formatBRL(quarterlySummaries.find(s => s.year === '2026')?.total || 0)}
                 </p>
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Growth vs 2025</p>
                 {(() => {
                   const v2025 = quarterlySummaries.find(s => s.year === '2025')?.total || 1;
                   const v2026 = quarterlySummaries.find(s => s.year === '2026')?.total || 0;
                   const diff = ((v2026 / v2025) - 1) * 100;
                   return <p className={`text-2xl font-black mt-1 ${diff >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>{diff.toFixed(1)}%</p>
                 })()}
              </div>
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Melhor Trimestre (Hist)</p>
                 <p className="text-2xl font-black text-white mt-1">
                   {formatBRL(Math.max(...quarterlyHistory.filter(d => d.ano !== 2026).map(d => d.faturamento)))}
                 </p>
              </div>
           </section>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartWrapper title="EVOLUÇÃO HISTÓRICA POR ANO (TOTAL)" height={400}>
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={quarterlySummaries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="year" stroke="#9ca3af" fontSize={12} />
                        <YAxis tickFormatter={v => `R$${v/1000}k`} stroke="#9ca3af" fontSize={12} width={80} />
                        <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="total" fill="#10b981" stroke="#10b981" fillOpacity={0.1} strokeWidth={3} />
                        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                 </ResponsiveContainer>
              </ChartWrapper>

              <ChartWrapper title="DISTRIBUIÇÃO POR TRIMESTRE (ACUMULADO)" height={400}>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quarterlyDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                        <YAxis tickFormatter={v => `R$${v/1000}k`} stroke="#9ca3af" fontSize={12} width={80} />
                        <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </ChartWrapper>
           </div>

           <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-white font-black italic uppercase text-lg">Histórico de Lançamentos Trimestrais</h2>
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                 <span className="text-[10px] text-gray-500 font-bold uppercase">Edição Habilitada para 2026</span>
               </div>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="border-b border-gray-800 text-[10px] text-gray-500 font-black uppercase">
                     <th className="px-4 py-3">Ano</th>
                     <th className="px-4 py-3">Trimestre</th>
                     <th className="px-4 py-3 text-right">Faturamento</th>
                     <th className="px-4 py-3">Trend</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-800/50">
                    {quarterlyHistory.slice().reverse().map((d, idx) => (
                      <tr key={`${d.ano}-${d.trimestre}`} className="hover:bg-gray-800/30 transition-colors group">
                        <td className="px-4 py-3 text-white font-bold text-sm">{d.ano}</td>
                        <td className="px-4 py-3 text-gray-400 font-medium text-xs">{d.trimestre} Trimestre</td>
                        <td className="px-4 py-3 text-right">
                          {d.ano === 2026 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-xs text-emerald-400 font-bold">{formatBRL(d.faturamento)}</span>
                              <span className="text-[8px] text-gray-500 uppercase italic">Sincronizado via Mensal</span>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-gray-400">{formatBRL(d.faturamento)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                           <div className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${d.ano === 2026 ? 'bg-emerald-500' : 'bg-gray-600'}`} 
                                style={{ width: `${Math.min(100, (d.faturamento / 700000) * 100)}%` }}
                              ></div>
                           </div>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
           </section>
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

           {/* Management T20 Table */}
           <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
             <h2 className="text-white font-bold italic mb-6">Tabela Mestra de Gestão T20 & Projeções</h2>
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-gray-300">
                 <thead className="text-xs uppercase bg-gray-800 text-gray-400">
                   <tr>
                     <th className="px-4 py-3">Cliente / Grupo Industrial</th>
                     <th className="px-4 py-3 text-center">Média (22-25)</th>
                     <th className="px-4 py-3 text-center">Lançar 2026</th>
                     <th className="px-4 py-3 text-center">Lançar 2027</th>
                     <th className="px-4 py-3 text-center">Lançar 2028</th>
                     <th className="px-4 py-3 text-center">Status Estabilidade</th>
                   </tr>
                 </thead>
                 <tbody>
                   {gestaoTop20.clientes.map((c: any, idx: number) => {
                     const historyArray = Object.values(c.history || {}) as number[];
                     const mediaValue = historyArray.length > 0 ? historyArray.reduce((a, b) => a + b, 0) / historyArray.length : 0;
                     
                     // Dynamic Status Logic
                     const currentBilling = (selectedYear === '2026' ? (c.projection2026 || 0) : (selectedYear === '2027' ? (c.projection2027 || 0) : (c.projection2028 || 0)));
                     
                     const { status, colorBg, colorText, colorBorder } = getClienteStatus(c, currentBilling);

                     return (
                       <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                         <td className="px-4 py-3">
                            <p className="font-bold text-white leading-tight flex items-center gap-1">
                              {c.nome || 'Cliente Sem Nome'}
                              <span className="text-blue-500 text-[8px]">[T20]</span>
                            </p>
                            <p className="text-[10px] text-gray-500">ID: {c.id || 'N/A'}</p>
                         </td>
                         <td className="px-4 py-3 text-center font-mono text-gray-400 text-xs">
                           {formatBRL(mediaValue)}
                         </td>
                         {['projection2026', 'projection2027', 'projection2028'].map(pKey => (
                           <td key={pKey} className="px-4 py-3">
                             <input 
                               type="text" 
                               value={c[pKey] === 0 ? '' : formatBRL(c[pKey])}
                               placeholder="R$ 0,00"
                               onChange={(e) => {
                                 const rawValue = e.target.value.replace(/[R$\s.]/g, '').replace(',', '.');
                                 const val = parseFloat(rawValue) || 0;
                                 setGestaoTop20((prev: any) => ({
                                   ...prev,
                                   clientes: prev.clientes.map((item: any, i: number) => i === idx ? { ...item, [pKey]: val } : item)
                                 }));
                               }}
                               className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-28 text-right font-mono text-xs focus:ring-1 focus:ring-red-500 outline-none"
                             />
                           </td>
                         ))}
                         <td className="px-4 py-3 text-center">
                           <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${colorBg} ${colorText} ${colorBorder || ''}`}>
                             {status}
                           </span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
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


    </div>
  );
};
export default App;
