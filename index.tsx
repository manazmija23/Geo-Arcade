
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
    
    console.log("GeoArcade: Attempting initial render of App component...");
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log("GeoArcade: Render triggered. Waiting for reconciliation...");

    // Fade out and remove loading overlay after a short delay
    // to allow initial assets to settle.
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.pointerEvents = 'none';
        console.log("GeoArcade: Boot successful. UI active.");
        setTimeout(() => {
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
          }
        }, 500);
      }, 1000);
    }
  } catch (error: any) {
    console.error("GeoArcade: Mounting error caught:", error);
    const subtext = document.getElementById('loading-subtext');
    if (subtext) {
      subtext.classList.remove('blink');
      subtext.innerHTML = `<span class="text-rose-500">BOOT EXCEPTION: ${error.message || 'Unknown Error'}</span>`;
    }
  }
};

// Execute mount
mount();
