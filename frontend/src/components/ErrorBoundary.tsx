import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { ShieldAlert, RotateCcw, Home } from "lucide-react";
import { cookieStorage } from "../lib/cookieStorage";

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public handleReset = () => {
    cookieStorage.removeItem('sentrix-auth');
    cookieStorage.removeItem("sentrix-auth");
    localStorage.removeItem("sentrix-auth");
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={28} />
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              An unexpected render error occurred. Resetting cached state will
              restore the platform interface.
            </p>
            {this.state.error && (
              <pre className="p-3 mb-6 bg-black/60 rounded-xl text-left text-[11px] font-mono text-red-300 overflow-x-auto whitespace-pre-wrap max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 font-semibold text-xs text-white flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
              >
                <RotateCcw size={14} /> Reset State & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
