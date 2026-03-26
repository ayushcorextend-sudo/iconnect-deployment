/**
 * AppErrorBoundary.jsx — App-level error boundary with Sentry integration.
 * Provides a user-friendly fallback UI on unhandled React errors.
 */
import { Component } from 'react';
import { captureException } from '../../lib/sentry';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    captureException(error, { extra: errorInfo });
    this.setState({ errorInfo });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#F9FAFB', padding: 24, fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, textAlign: 'center', maxWidth: 400 }}>
          An unexpected error occurred. Your data is safe. Please reload to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', background: '#4F46E5', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload App
        </button>
        {this.state.error && import.meta.env.DEV && (
          <details style={{ marginTop: 24, maxWidth: 500, width: '100%' }}>
            <summary style={{ fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}>
              Error details (dev only)
            </summary>
            <pre style={{
              fontSize: 11, color: '#6B7280', background: '#F3F4F6',
              padding: 12, borderRadius: 6, marginTop: 8, overflow: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {this.state.error.message}
              {'\n\n--- Component Stack ---\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
