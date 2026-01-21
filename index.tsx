
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

/**
 * Robust Entry Point
 * Clears the loading overlay specifically once the virtual DOM is ready.
 */
const mount = () => {
  const rootElement = document.getElementById('root');
  const loadingOverlay = document.getElementById('loading-overlay');

  if (!rootElement) {
    console.error("FATAL: Root element not found");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Fade out and remove loading overlay after a short delay
    // to allow initial assets to settle.
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.pointerEvents = 'none';
        setTimeout(() => {
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
          }
        }, 500);
      }, 500);
    }
  } catch (error) {
    console.error("Mounting error caught:", error);
    if (loadingOverlay) {
      const subtext = document.getElementById('loading-subtext');
      if (subtext) subtext.innerHTML = '<span class="text-rose-500">RUNTIME ERROR</span>';
    }
  }
};

// Execute mount
mount();
