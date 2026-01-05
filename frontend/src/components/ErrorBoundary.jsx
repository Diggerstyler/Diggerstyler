import React from 'react';

// Error Boundary that suppresses ResizeObserver errors
// These errors are harmless but can trigger React's error overlay
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a ResizeObserver error - don't treat as real error
    if (error?.message?.includes('ResizeObserver')) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Suppress ResizeObserver errors
    if (error?.message?.includes('ResizeObserver')) {
      return;
    }
    // Log other errors
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Etwas ist schiefgelaufen</h1>
            <p className="text-muted-foreground mb-4">Bitte laden Sie die Seite neu.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
