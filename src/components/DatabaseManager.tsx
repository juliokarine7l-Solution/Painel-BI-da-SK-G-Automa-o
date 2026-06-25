import React, { useState } from 'react';
import { DataGrid } from './DataGrid';

export const DatabaseManager = ({ 
    vendedoresConfig, setVendedoresConfig,
    metas, setMetas, 
    vendedorData, setVendedorData,
    custos, setCustos,
    quarterlyHistory, setQuarterlyHistory,
    gestaoTop20, setGestaoTop20
}: any) => {

    const flattenedTop20 = gestaoTop20.clientes.map((c: any) => ({
        id: c.id,
        nome: c.nome,
        cidade: c.cidade,
        cluster: c.cluster,
        relevancia: c.relevancia,
        'Histórico 2022': c.history['2022'] || 0,
        'Histórico 2023': c.history['2023'] || 0,
        'Histórico 2024': c.history['2024'] || 0,
        'Histórico 2025': c.history['2025'] || 0,
        projection2026: c.projection2026 || 0,
        projection2027: c.projection2027 || 0,
        projection2028: c.projection2028 || 0,
        x: c.x || 0,
        y: c.y || 0
    }));

    const setFlattenedTop20 = (newData: any[]) => {
        const unflattened = newData.map(c => ({
            id: c.id,
            nome: c.nome,
            cidade: c.cidade,
            cluster: c.cluster,
            history: {
               "2022": c['Histórico 2022'],
               "2023": c['Histórico 2023'],
               "2024": c['Histórico 2024'],
               "2025": c['Histórico 2025']
            },
            relevancia: c.relevancia,
            projection2026: c.projection2026,
            projection2027: c.projection2027,
            projection2028: c.projection2028,
            x: c.x,
            y: c.y
        }));
        setGestaoTop20({ ...gestaoTop20, clientes: unflattened });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-2xl font-black italic border-b border-gray-800 pb-2 flex items-center gap-2">
                🗄️ GERENCIADOR DE BANCO DE DADOS (PLANILHAS NATIVAS)
            </h2>
            <p className="text-gray-400 text-sm">
                Edite os dados nativamente no formato de planilha abaixo. Todas as alterações serão refletidas em tempo real nos painéis.
                Não se esqueça de clicar em "Salvar Lançamentos" no menu superior para perpetuar no cache.
            </p>

            <DataGrid title="Planilha: Configuração de Vendedores (Campos ID, Label, Meta, Color)" data={vendedoresConfig} setData={setVendedoresConfig} />
            <DataGrid title="Planilha: Metas Mensais" data={metas} setData={setMetas} />
            <DataGrid title="Planilha: Lançamentos de Vendedores" data={vendedorData} setData={setVendedorData} />
            <DataGrid title="Planilha: Custos e Logística" data={custos} setData={setCustos} />
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl mt-4 overflow-hidden shadow-xl">
               <h3 className="text-white font-bold p-4 text-base italic border-b border-gray-800">Desempenho Mensal (Matéria-Prima Camozzi)</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#1f2937] text-gray-400 text-xs uppercase font-bold">
                       <tr>
                          <th className="px-4 py-3">MÊS</th>
                          <th className="px-4 py-3">META CAMOZZI</th>
                          <th className="px-4 py-3">REALIZADO</th>
                          <th className="px-4 py-3">% ATINGIMENTO</th>
                       </tr>
                    </thead>
                    <tbody>
                       {custos.map((row: any, i: number) => {
                          const meta = row.metaCamozzi || 0;
                          const realizado = row.Camozzi || 0;
                          let atingimento = "0.00%";
                          let atingimentoClass = "text-amber-500";
                          if (meta > 0) {
                              const perc = (realizado / meta) * 100;
                              atingimento = perc.toFixed(2) + "%";
                              if (realizado === 0 && (row.mes !== 'Jan' && row.mes !== 'Fev' && row.mes !== 'Mar' && row.mes !== 'Abr' && row.mes !== 'Mai')) {
                                  atingimento = "0.00%";
                                  atingimentoClass = "text-amber-500";
                              } else {
                                  atingimentoClass = perc < 50 ? 'text-red-500' : 'text-amber-500';
                              }
                          }
                          return (
                             <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                                <td className="px-4 py-3 font-medium text-white">{row.mes}</td>
                                <td className="px-4 py-3">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(meta)}</td>
                                <td className="px-4 py-3 text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(realizado)}</td>
                                <td className={`px-4 py-3 font-black ${atingimentoClass}`}>{atingimento}</td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
               </div>
            </div>
            <DataGrid title="Planilha: Histórico Trimestral" data={quarterlyHistory} setData={setQuarterlyHistory} />
            <DataGrid title="Planilha: Gestão Top 20" data={flattenedTop20} setData={setFlattenedTop20} />

        </div>
    );
};
