import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeProps {
  value: number; // percentage 0-100
}

export const GaugeChart: React.FC<GaugeProps> = ({ value }) => {
  const data = [
    { name: 'Low', value: 33, color: '#C0504D' }, // Dark Red
    { name: 'Medium', value: 34, color: '#EEDB68' }, // Yellow/Gold
    { name: 'High', value: 33, color: '#16C4C1' } // Teal/Cyan
  ];
  
  // Calculate needle angle
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const totalAngle = 180;
  // 180 degrees corresponds to 0, 0 degrees corresponds to 100
  const needleAngle = 180 - (clampedValue / 100) * totalAngle;
  
  const RADIAN = Math.PI / 180;
  // The center based on 300x300 viewBox
  const cx = 150;
  const cy = 150;
  
  const needleLength = 70;
  // The tip of the needle
  const tipX = cx + needleLength * Math.cos(needleAngle * RADIAN);
  const tipY = cy - needleLength * Math.sin(needleAngle * RADIAN);

  const needleSvg = (
    <g>
      {/* Outer base semi-circle */}
      <path d={`M ${cx - 20} ${cy} A 20 20 0 0 1 ${cx + 20} ${cy}`} fill="none" stroke="#2F3E46" strokeWidth={10} />
      {/* Needle Line */}
      <line x1={cx} y1={cy - 10} x2={tipX} y2={tipY} stroke="#999" strokeWidth={4} strokeLinecap="round" />
    </g>
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-transparent rounded-xl p-2 min-h-[250px]">
       <div className="w-[300px] h-[160px] relative mt-4">
         <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy={150}
                startAngle={180}
                endAngle={0}
                innerRadius={65}
                outerRadius={100}
                stroke="none"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
         </ResponsiveContainer>
         <svg viewBox="0 0 300 300" className="absolute top-0 left-0 w-full h-[300px] pointer-events-none">
            {needleSvg}
         </svg>
       </div>
       <div className="flex justify-between w-[220px] px-2 relative -top-[10px] text-gray-400 text-xs font-medium">
          <span>0.00%</span>
          <span>100.00%</span>
       </div>
       <p className="text-[32px] font-normal relative top-1 tracking-tight text-white mb-2 font-mono">{value.toFixed(2)}%</p>
    </div>
  );
};
