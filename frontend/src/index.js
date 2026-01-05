import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// ============================================================
// CRITICAL: ResizeObserver Error Suppression
// This MUST run IMMEDIATELY before any other code
// ============================================================

// Immediately suppress ResizeObserver errors before React loads
(function() {
  if (typeof window === 'undefined') return;
  
  // Store if we should suppress error overlay
  window.__SUPPRESS_RESIZE_OBSERVER__ = true;

  // 1. Patch ResizeObserver constructor
  const OriginalResizeObserver = window.ResizeObserver;
  if (OriginalResizeObserver) {
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        super((entries, observer) => {
          window.requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (e) {
              // Silently ignore
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

  // 3. Global onerror handler
  const originalOnerror = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const msg = String(message || '');
    if (msg.includes('ResizeObserver') || 
        msg.includes('loop completed') ||
        msg.includes('loop limit')) {
      return true;
    }
    return originalOnerror ? originalOnerror.apply(this, arguments) : false;
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

  // 6. CRITICAL: Disable React Error Overlay for ResizeObserver
  // This intercepts the iframe that React Dev Overlay uses
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.tagName === 'IFRAME' && node.id === 'react-refresh-overlay') {
          // Check if the error is a ResizeObserver error
          setTimeout(() => {
            try {
              const iframeDoc = node.contentDocument || node.contentWindow?.document;
              if (iframeDoc) {
                const bodyText = iframeDoc.body?.innerText || '';
                if (bodyText.includes('ResizeObserver') || 
                    bodyText.includes('loop completed') ||
                    bodyText.includes('loop limit')) {
                  node.remove();
                }
              }
            } catch (e) {
              // Cross-origin, try removing anyway if we have flag set
              if (window.__SUPPRESS_RESIZE_OBSERVER__) {
                // Check parent document for error
                const overlays = document.querySelectorAll('[class*="error-overlay"], [id*="error"]');
                overlays.forEach(el => {
                  if (el.textContent?.includes('ResizeObserver')) {
                    el.remove();
                  }
                });
              }
            }
          }, 100);
        }
      });
    });
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  // 7. Also try to catch the webpack overlay
  if (typeof __webpack_dev_server_client__ !== 'undefined') {
    try {
      const originalShowOverlay = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.showOverlay;
      if (originalShowOverlay) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.showOverlay = function(error) {
          if (error?.message?.includes('ResizeObserver')) {
            return;
          }
          return originalShowOverlay.apply(this, arguments);
        };
      }
    } catch (e) {}
  }
})();

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
