import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

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
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path || 'unknown path'}`;
            isFirestoreError = true;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-urdu">کچھ غلط ہو گیا!</h2>
            <p className="text-gray-500 mb-6 text-sm">
              {isFirestoreError ? 'سسٹم کو ڈیٹا تک رسائی میں دشواری ہو رہی ہے۔' : 'ایپلی کیشن میں ایک غیر متوقع خرابی پیش آئی ہے۔'}
            </p>
            <div className="bg-red-50 rounded-xl p-4 mb-8 text-left">
              <p className="text-xs font-mono text-red-800 break-all">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              <RefreshCcw className="w-4 h-4" />
              دوبارہ کوشش کریں
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
