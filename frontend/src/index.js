import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Fix ResizeObserver loop error (common with Radix UI components)
// This error is harmless but causes React error overlay to show
if (typeof window !== 'undefined') {
  // Patch ResizeObserver to prevent the loop error
  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class ResizeObserver extends OriginalResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        // Use requestAnimationFrame to batch notifications
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

  // Suppress the error in window.onerror
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && message.toString().includes('ResizeObserver')) {
      return true;
    }
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Suppress in unhandledrejection
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('ResizeObserver')) {
      event.preventDefault();
    }
  });

  // Suppress in error event
  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver')) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return true;
    }
  }, true);
}

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
