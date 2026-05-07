import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h3>
          <p className="text-sm text-red-700 mb-3">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <p className="text-xs text-red-600 mb-4">
            Try refreshing the page. If the problem persists, please contact support and share a screenshot of this message.
          </p>
          <Button variant="outline" onClick={this.reset}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
