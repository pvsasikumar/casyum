import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 select-none">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-xl font-extrabold font-display text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-white/50 text-center max-w-md mb-6">
            An unexpected error occurred while loading this page. Please try again or go back.
          </p>
          {this.state.error && (
            <p className="text-[11px] text-rose-400/60 bg-rose-500/5 px-4 py-2 rounded-xl border border-rose-500/10 mb-6 max-w-md truncate font-mono">
              {this.state.error.message}
            </p>
          )}
          <div className="flex items-center gap-3">
            {this.props.onBack && (
              <button
                onClick={this.props.onBack}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Go Back</span>
              </button>
            )}
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
