import React from 'react';
import { ResponsiveContainer } from 'recharts';

export const ChartWrapper = ({ children, height = 450, title }: { children: React.ReactNode, height?: number, title?: string }) => (
  <div className="w-full flex flex-col gap-2">
    {title && <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</h3>}
    <div style={{ width: '100%', height, minHeight: height, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  </div>
);
