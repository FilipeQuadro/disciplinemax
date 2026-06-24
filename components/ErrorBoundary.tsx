"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: error.message || String(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center min-h-[50vh]" style={{ background: "var(--bg-primary)" }}>
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(217,79,79,0.1)" }}>
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-serif font-semibold tracking-tight text-white">Algo deu errado</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={this.handleRetry}
                className="btn-primary text-sm"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-ghost text-sm"
              >
                Recarregar
              </button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-4 w-full text-left">
                <summary className="text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                  Detalhes do erro
                </summary>
                <pre className="mt-2 p-3 rounded-xl text-xs overflow-auto max-h-32 glass" style={{ color: "var(--danger)" }}>
                  {this.state.errorInfo}
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