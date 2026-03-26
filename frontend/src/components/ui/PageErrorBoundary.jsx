/**
 * PageErrorBoundary.jsx — Lightweight error boundary for lazy-loaded page components.
 * Resets automatically when the `resetKey` prop changes (e.g. on page navigation).
 */
import { Component } from 'react';
import { captureException } from '../../lib/sentry';

export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(props, state) {
    // Auto-reset when the user navigates to a different page
    if (state.hasError && props.resetKey !== state.lastResetKey) {
      return { hasError: false, error: null, lastResetKey: props.resetKey };
    }
    return { lastResetKey: props.resetKey };
  }

  componentDidCatch(error, errorInfo) {
    captureException(error, { extra: errorInfo });
    this.setState({ errorInfo });
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isChunkError = this.state.error?.message?.includes('Failed to fetch dynamically imported module')
      || this.state.error?.message?.includes('Loading chunk');

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 320, padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>{isChunkError ? '🔌' : '⚠️'}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          {isChunkError ? 'Failed to load this page' : 'Something went wrong'}
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, maxWidth: 360 }}>
          {isChunkError
            ? 'A network error prevented loading. Please check your connection and try again.'
            : 'An unexpected error occurred on this page.'}
        </p>
        <button
          onClick={isChunkError ? () => window.location.reload() : this.reset}
          style={{
            padding: '9px 22px', background: '#4F46E5', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {isChunkError ? 'Reload App' : 'Try Again'}
        </button>
        {this.state.error && import.meta.env.DEV && (
          <details style={{ marginTop: 16, maxWidth: 600, width: '100%', textAlign: 'left' }}>
            <summary style={{ fontSize: 11, color: '#9CA3AF', cursor: 'pointer' }}>Error details (dev only)</summary>
            <pre style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: 10, borderRadius: 6, marginTop: 6, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error.message}{'\n\n'}{this.state.errorInfo?.componentStack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
