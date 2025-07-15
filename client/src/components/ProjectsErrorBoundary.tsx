import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ProjectsErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Projects Error Boundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Force a page reload to clear any corrupted state
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {this.props.fallbackMessage || 'An unexpected error occurred while loading the projects.'}
            </p>
            
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg max-w-2xl mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                This could be due to:
              </p>
              <ul className="text-left text-sm text-gray-500 dark:text-gray-500">
                <li>• Temporary network issues</li>
                <li>• Data format inconsistencies</li>
                <li>• Browser cache problems</li>
                <li>• Server connectivity issues</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <Button onClick={() => window.history.back()} variant="outline">
                Go Back
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left max-w-2xl">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Technical Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}