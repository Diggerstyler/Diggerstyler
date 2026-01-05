import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// ============================================================
// CRITICAL: ResizeObserver Error Suppression
// This MUST run before any other code to prevent React Error Overlay
// ============================================================

// 1. Patch ResizeObserver itself
if (typeof window !== 'undefined') {
  const OriginalResizeObserver = window.ResizeObserver;
  
  if (OriginalResizeObserver) {
    window.ResizeObserver = class PatchedResizeObserver extends OriginalResizeObserver {
      constructor(callback) {
        super((entries, observer) => {
          // Use requestAnimationFrame to batch notifications and prevent loop errors
          window.requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (e) {
              // Silently ignore errors in callback
            }
          });
        });
      }
    };
  }

  // 2. Override console.error to filter ResizeObserver messages
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    if (message.includes('ResizeObserver')) {
      return; // Suppress ResizeObserver errors in console
    }
    originalConsoleError.apply(console, args);
  };

  // 3. Global error handler - catches synchronous errors
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && (
      message.toString().includes('ResizeObserver') ||
      message.toString().includes('loop completed') ||
      message.toString().includes('loop limit exceeded')
    )) {
      return true; // Prevent default handling
    }
    return false;
  };

  // 4. Error event listener - catches before React Error Overlay
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('ResizeObserver') ||
      event.message.includes('loop completed') ||
      event.message.includes('loop limit exceeded')
    )) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return true;
    }
  }, true); // Use capture phase to catch before React

  // 5. Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason?.toString() || '';
    if (reason.includes('ResizeObserver')) {
      event.preventDefault();
    }
  });

  // 6. Override ErrorEvent to filter ResizeObserver before it reaches React
  // This is the nuclear option for React's error overlay
  const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function(event) {
    if (event.type === 'error' && event.message?.includes('ResizeObserver')) {
      return true;
    }
    return originalDispatchEvent.call(this, event);
  };
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
