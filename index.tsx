
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App'; // Path might need adjustment if App.tsx moves, but import map handles it

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Ensure #root exists within the dashboard's main content area in index.html.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
