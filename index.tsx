
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
const loadingOverlay = document.getElementById('loading-overlay');

if (!rootElement) {
  console.error("Could not find root element with id 'root'");
} else {
  const root = ReactDOM.createRoot(rootElement);
  
  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Hide the loader once React starts rendering
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.pointerEvents = 'none';
        setTimeout(() => loadingOverlay.remove(), 500);
      }, 300);
    }
  } catch (error) {
    console.error("Mounting error:", error);
    if (loadingOverlay) {
      loadingOverlay.innerHTML = '<div class="text-rose-500 font-arcade text-xs">MODULE LOAD FAILED</div>';
    }
  }
}
