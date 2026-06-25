import React, { useState } from 'react';

export const DataGrid = ({ data, setData, title, onSave }: { data: any[], setData: (data: any[]) => void, title: string, onSave?: () => void }) => {
  const [newColumnName, setNewColumnName] = useState('');

  if (!data || data.length === 0) return <div>Sem dados</div>;

  const columns = Array.from(new Set(data.flatMap(d => Object.keys(d))));

  const handleCellChange = (rowIndex: number, col: string, value: string) => {
    const newData = [...data];
    let parsedValue: any = value;
    if (col !== 'id' && col !== 'nome' && col !== 'month' && col !== 'mes' && col !== 'trimestre' && col !== 'cidade' && col !== 'ano' && col !== 'color' && col !== 'label') {
        const rawValue = value.replace(/[R$\s.]/g, '').replace(',', '.');
        const num = parseFloat(rawValue);
        if (!isNaN(num)) {
            parsedValue = num;
        } else if (value === '' || value.includes('R$')) {
            parsedValue = 0;
        }
    }
    newData[rowIndex] = { ...newData[rowIndex], [col]: parsedValue };
    setData(newData);
  };

  const formatCellValue = (col: string, val: any) => {
      if (col !== 'id' && col !== 'nome' && col !== 'month' && col !== 'mes' && col !== 'trimestre' && col !== 'cidade' && col !== 'ano' && col !== 'color' && col !== 'label') {
          if (typeof val === 'number') {
              return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(val);
          }
      }
      return val !== undefined ? val : '';
  }

  const handleAddRow = () => {
    const newRow = columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {});
    setData([...data, newRow]);
  };

  const handleDeleteRow = (rowIndex: number) => {
    setData(data.filter((_, i) => i !== rowIndex));
  };

  const handleAddColumn = () => {
    if (!newColumnName) return;
    const newData = data.map(d => ({ ...d, [newColumnName]: 0 }));
    setData(newData);
    setNewColumnName('');
  };

  const handleDeleteColumn = (colToRemove: string) => {
    const newData = data.map(d => {
      const newD = { ...d };
      delete newD[colToRemove];
      return newD;
    });
    setData(newData);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl shadow-xl overflow-hidden mb-8 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Nova Coluna" 
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="bg-gray-800 text-xs px-2 py-1 border border-gray-700 rounded text-white"
            />
            <button onClick={handleAddColumn} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded font-bold">
              + Coluna
            </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-3 group relative whitespace-nowrap">
                  {col}
                  <button 
                    onClick={() => handleDeleteColumn(col)} 
                    className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Excluir Coluna"
                  >
                    ×
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-800 hover:bg-gray-800/30">
                {columns.map(col => (
                  <td key={col} className="px-2 py-2">
                    <input
                      type="text"
                      value={formatCellValue(col, row[col])}
                      onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                      className="bg-gray-950 border border-gray-700 rounded px-2 py-1 w-full text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <button onClick={() => handleDeleteRow(rowIndex)} className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <button onClick={handleAddRow} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-xs font-bold transition-all active:scale-95 shadow">
          + Adicionar Linha
        </button>
        {onSave && (
          <button 
            onClick={onSave} 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow shadow-green-900/50"
            title="Salvar todas as planilhas no cache"
          >
            💾 Salvar Lançamentos
          </button>
        )}
      </div>
    </div>
  );
};
