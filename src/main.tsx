/** @jsxImportSource react */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Toaster position="top-right" toastOptions={{
      style: { background: '#111', color: '#fff', border: '1px solid #333' }
    }} />
    <App />
  </React.StrictMode>
);