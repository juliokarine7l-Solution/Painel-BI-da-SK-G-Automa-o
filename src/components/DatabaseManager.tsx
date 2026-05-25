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
            <DataGrid title="Planilha: Histórico Trimestral" data={quarterlyHistory} setData={setQuarterlyHistory} />
            <DataGrid title="Planilha: Gestão Top 20" data={flattenedTop20} setData={setFlattenedTop20} />

        </div>
    );
};
