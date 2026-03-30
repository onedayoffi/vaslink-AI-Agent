import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4 text-center">
          <div className="max-w-md p-8 bg-[#1A2335] border border-red-500/20 rounded-2xl shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
            <p className="text-[#8096B0] mb-6">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              className="bg-[#ffd700] text-[#0B0F17] font-bold py-2 px-6 rounded-xl hover:bg-[#F0C45A] transition-all"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
