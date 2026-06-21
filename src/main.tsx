import { registerSW } from 'virtual:pwa-register';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

registerSW({
  onOfflineReady() {
    console.log('Service worker installed and app is ready for offline use.');
  },
  onNeedRefresh() {
    console.log('New content is available; please refresh.');
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);