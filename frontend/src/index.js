import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// ============================================================
// ResizeObserver Error Suppression
// These errors are harmless but trigger React's error overlay
// ============================================================

if (typeof window !== 'undefined') {
  // 1. Patch ResizeObserver to prevent loop errors
  const OriginalResizeObserver = window.ResizeObserver;
  if (OriginalResizeObserver) {
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        super((entries, observer) => {
          window.requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (e) {
              // Silently ignore errors
            }
          });
        });
      }
    };
  }

  // 2. Suppress console.error for ResizeObserver
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('ResizeObserver') || 
        message.includes('loop completed') ||
        message.includes('loop limit')) {
      return;
    }
    return originalConsoleError.apply(console, args);
  };

  // 3. Global error handler
  window.onerror = function(message) {
    const msg = String(message || '');
    if (msg.includes('ResizeObserver') || 
        msg.includes('loop completed') ||
        msg.includes('loop limit')) {
      return true;
    }
    return false;
  };

  // 4. Error event listener (capture phase)
  window.addEventListener('error', function(event) {
    const msg = event.message || '';
    if (msg.includes('ResizeObserver') || 
        msg.includes('loop completed') ||
        msg.includes('loop limit')) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return true;
    }
  }, true);

  // 5. Unhandled rejection handler
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    const msg = reason?.message || reason?.toString?.() || '';
    if (msg.includes('ResizeObserver')) {
      event.preventDefault();
      return;
    }
  });
}

// ============================================================
// React Application Initialization
// ============================================================

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}
