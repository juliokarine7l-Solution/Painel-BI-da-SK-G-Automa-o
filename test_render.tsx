import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

global.localStorage = {
  getItem: (key) => null,
  setItem: () => {},
  removeItem: () => {}
} as any;

global.window = {
  ...global.window,
  localStorage: global.localStorage,
  location: { reload: () => {} },
  confirm: () => true
} as any;

try {
  const html = renderToString(React.createElement(App));
  console.log("Rendered without localstorage, length:", html.length);
} catch (e: any) {
  console.error("Render error without localstorage:", e.message);
}

const mockGestao = {
  clientes: [
    { history: {2022:0, 2023:0, 2024:0, 2025:0}, relevancia: 'ESTABILIDADE', nome: 'A', id: 1 }
  ]
};

global.localStorage.getItem = (k) => k === 'skg-gestao-top20' ? JSON.stringify(mockGestao) : null;

try {
  const html2 = renderToString(React.createElement(App));
  console.log("Rendered WITH localstorage, length:", html2.length);
} catch (e: any) {
  console.error("Render error WITH localstorage:", e.message);
}
