import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught unhandled error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-4xl">⚠️</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Application Error</h1>
              <p className="text-sm text-gray-500 mt-0.5">An unexpected error occurred in the application.</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Error Details</p>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 font-mono overflow-auto max-h-40 whitespace-pre-wrap break-all">
              {this.state.error?.message || 'An unknown error occurred.'}
            </pre>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-150 text-sm"
          >
            Reload Application
          </button>

          <p className="text-xs text-center text-gray-400 mt-4">
            If this problem persists, contact support@iconnect.in
          </p>
        </div>
      </div>
    );
  }
}
