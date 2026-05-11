import React from 'react';
import { ResponsiveContainer } from 'recharts';

export const ChartWrapper = ({ children, height = 450 }: { children: React.ReactNode, height?: number }) => (
  <div style={{ width: '100%', height, minHeight: height, minWidth: 0 }}>
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
);
