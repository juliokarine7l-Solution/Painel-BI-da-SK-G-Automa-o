import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const formatBRL = (value: number): string => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value || 0);

export const YoYComparison = ({ metas }: { metas: any[] }) => {
  const [selectedYears, setSelectedYears] = useState(['2024', '2025', '2026']);
  const [chartType, setChartType] = useState('line');

  // Hardcoded 2024 data based on prompt
  const data2024 = [
    79972.17, 144928.24, 199457.25, 141213.46, 165108.55, 177301.12,
    109459.93, 155366.78, 83484.13, 116519.48, 102426.40, 85824.65
  ];

  // Mock 2025 data (around 15% higher)
  const data2025 = data2024.map(v => v * 1.15);

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const chartData = useMemo(() => {
    return months.map((month, idx) => {
      const data: any = { month };
      
      if (selectedYears.includes('2024')) data['2024'] = data2024[idx];
      if (selectedYears.includes('2025')) data['2025'] = data2025[idx];
      
      // Dynamic 2026 data from metas
      if (selectedYears.includes('2026')) {
        const val2026 = metas[idx]?.r2026 || 0;
        data['2026'] = val2026 > 0 ? val2026 : null;
      }
      
      if (selectedYears.includes('2027')) {
        const val2027 = metas[idx]?.r2027 || 0;
        data['2027'] = val2027 > 0 ? val2027 : null;
      }

      if (selectedYears.includes('2028')) {
        const val2028 = metas[idx]?.r2028 || 0;
        data['2028'] = val2028 > 0 ? val2028 : null;
      }

      return data;
    });
  }, [metas, selectedYears]);

  const toggleYear = (year: string) => {
    setSelectedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const colors = {
    '2024': '#9ca3af', // gray
    '2025': '#f59e0b', // amber
    '2026': '#10b981', // emerald
    '2027': '#3b82f6', // blue
    '2028': '#8b5cf6', // purple
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-4 rounded shadow-xl">
          <p className="text-white font-bold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
             <div key={index} className="flex flex-col mb-2">
                <span style={{ color: entry.color }} className="font-bold text-sm">
                   {entry.name}: {formatBRL(entry.value)}
                </span>
             </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="bg-[#0a0c10] p-8 rounded-3xl border border-gray-800 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-gray-800 pb-6">
          <div>
            <h2 className="text-white font-black italic text-3xl uppercase tracking-tighter">Faturamento mensal — comparação 2024–2028</h2>
            <p className="text-xs text-gray-500 mt-1 uppercase font-bold italic tracking-widest">Análise de Sazonalidade e Crescimento (YoY / MoM)</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex gap-2 bg-gray-950 p-2 rounded-xl border border-gray-800">
                {['2024', '2025', '2026', '2027', '2028'].map(year => (
                  <button 
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${selectedYears.includes(year) ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-400'}`}
                    style={selectedYears.includes(year) ? { borderBottom: `2px solid ${colors[year as keyof typeof colors]}` } : {}}
                  >
                    {year}
                  </button>
                ))}
             </div>
             <select 
               value={chartType} 
               onChange={e => setChartType(e.target.value)}
               className="bg-gray-950 text-white font-bold p-2 rounded-xl border border-gray-700 outline-none"
             >
               <option value="line">Linhas (Tendência)</option>
               <option value="bar">Barras Agrupadas</option>
             </select>
          </div>
        </div>

        <div className="h-[450px] w-full bg-gray-950/50 p-6 rounded-2xl border border-gray-800 relative">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="month" stroke="#444" fontSize={12} tick={{ fill: '#9ca3af', fontWeight: 'bold' }} />
                <YAxis stroke="#444" fontSize={10} width={80} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {['2024', '2025', '2026', '2027', '2028'].map(year => (
                  selectedYears.includes(year) && (
                    <Line 
                      key={year}
                      type="monotone" 
                      dataKey={year} 
                      name={year} 
                      stroke={colors[year as keyof typeof colors]} 
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  )
                ))}
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="month" stroke="#444" fontSize={12} tick={{ fill: '#9ca3af', fontWeight: 'bold' }} />
                <YAxis stroke="#444" fontSize={10} width={80} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {['2024', '2025', '2026', '2027', '2028'].map(year => (
                  selectedYears.includes(year) && (
                    <Bar 
                      key={year}
                      dataKey={year} 
                      name={year} 
                      fill={colors[year as keyof typeof colors]} 
                      radius={[4, 4, 0, 0]}
                    />
                  )
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>
      
      <section className="bg-[#0a0c10] p-6 rounded-3xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
        <h2 className="text-white font-bold italic text-sm uppercase tracking-widest mb-6 border-b border-gray-800 pb-2">Valores Mensais e Comparações (YoY)</h2>
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-950 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
               <tr>
                  <th className="px-4 py-3">Mês</th>
                  {selectedYears.map(year => (
                    <th key={year} className="px-4 py-3 text-right" style={{ color: colors[year as keyof typeof colors] }}>{year}</th>
                  ))}
                  {selectedYears.includes('2025') && selectedYears.includes('2026') && (
                    <th className="px-4 py-3 text-right text-emerald-400">YoY 26 vs 25</th>
                  )}
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
               {chartData.map((row, idx) => {
                 let yoy = null;
                 if (row['2026'] && row['2025']) {
                   yoy = ((row['2026'] - row['2025']) / row['2025']) * 100;
                 }
                 
                 return (
                   <tr key={idx} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-bold text-xs">{row.month}</td>
                      {selectedYears.map(year => (
                        <td key={year} className="px-4 py-3 text-right font-mono text-xs">
                          {row[year] ? formatBRL(row[year]) : <span className="text-gray-700 italic">n/a</span>}
                        </td>
                      ))}
                      {selectedYears.includes('2025') && selectedYears.includes('2026') && (
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {yoy !== null ? (
                            <span className={yoy >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                              {yoy > 0 ? '+' : ''}{yoy.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                      )}
                   </tr>
                 );
               })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
