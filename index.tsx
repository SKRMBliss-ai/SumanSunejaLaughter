import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}


const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
console.log('[App Start] API Key:', key ? key.substring(0, 4) + '...' : 'MISSING');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
