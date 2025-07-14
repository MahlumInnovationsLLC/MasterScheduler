import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: string) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo: errorInfo.componentStack
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="p-6">
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred while loading this page. Common causes include:
            </p>
            <ul className="text-left text-sm text-gray-500 mb-6">
              <li>• JavaScript compatibility issues</li>
              <li>• Data format problems</li>
              <li>• Missing dependencies</li>
              <li>• Network connectivity issues</li>
            </ul>
            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} variant="default">
                Refresh Page
              </Button>
            </div>
            <details className="mt-4 text-xs text-gray-400">
              <summary className="cursor-pointer">Technical Details</summary>
              <div className="mt-2 text-left bg-gray-100 p-3 rounded max-w-lg">
                <p><strong>Error:</strong> {this.state.error?.message}</p>
                <p><strong>Stack:</strong> {this.state.error?.stack}</p>
                {this.state.errorInfo && (
                  <p><strong>Component Stack:</strong> {this.state.errorInfo}</p>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;