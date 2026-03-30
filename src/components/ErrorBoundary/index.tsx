import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[TarifaForever] Render error:', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-2xl text-center" role="alert">
          <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-4 max-w-md">
            {this.props.fallbackMessage ?? 'An unexpected error occurred. Please try refreshing.'}
          </p>
          {this.state.error && (
            <p className="text-xs text-red-400 mb-4 font-mono bg-red-50 px-3 py-1 rounded">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
