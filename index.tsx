
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

/**
 * Robust Entry Point
 * Clears the loading overlay specifically once the virtual DOM is ready.
 */
const mount = () => {
  console.log("GeoArcade: Starting boot sequence...");
  
  const rootElement = document.getElementById('root');
  const loadingOverlay = document.getElementById('loading-overlay');

  if (!rootElement) {
    console.error("GeoArcade FATAL: Root element not found in DOM.");
    return;
  }

  try {
    console.log("GeoArcade: Creating React Root...");
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log("GeoArcade: Initial render triggered.");

    // Fade out and remove loading overlay after a short delay
    // to allow initial assets to settle.
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.pointerEvents = 'none';
        console.log("GeoArcade: UI ready, clearing loader.");
        setTimeout(() => {
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
          }
        }, 500);
      }, 800);
    }
  } catch (error) {
    console.error("GeoArcade: Mounting error caught:", error);
    if (loadingOverlay) {
      const subtext = document.getElementById('loading-subtext');
      if (subtext) subtext.innerHTML = '<span class="text-rose-500">RUNTIME BOOT ERROR</span>';
    }
  }
};

// Execute mount
mount();
