import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-3xl flex items-center justify-center text-3xl mb-4 border border-amber-500/30">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Что-то пошло не так</h2>
          <p className="text-slate-400 text-xs max-w-xs mb-6">
            Произошла непредвиденная ошибка при отображении страницы.
          </p>

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <i className="fa-solid fa-rotate-right"></i>
              <span>Перезагрузить приложение</span>
            </button>

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs border border-slate-700 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-trash-can"></i>
              <span>Сбросить данные и кэш</span>
            </button>
          </div>

          {this.state.error && (
            <div className="mt-8 text-left w-full max-w-xs bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-rose-400 font-mono break-all max-h-32 overflow-y-auto">
              <span className="font-bold text-slate-400 block mb-1">Информация об ошибке:</span>
              {this.state.error.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
