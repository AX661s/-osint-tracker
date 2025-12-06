import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.resetErrorBoundary = this.resetErrorBoundary.bind(this);
  }

  resetErrorBoundary() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  static getDerivedStateFromError(error) {
    const msg = (error && (error.stack || error.message || error.toString())) || '';
    const isExtensionError = /chrome-extension:\/\//i.test(msg) || /MetaMask/i.test(msg);
    if (isExtensionError) return null;
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const msg = (error && (error.stack || error.message || error.toString())) || '';
    const isExtensionError = /chrome-extension:\/\//i.test(msg) || /MetaMask/i.test(msg);
    if (isExtensionError) {
      // Ignore extension-originated errors to prevent noisy fallback UI
      return;
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error || new Error('Unknown error'),
      errorInfo: errorInfo || { componentStack: 'No component stack available' }
    });
    // 不要自动清除localStorage和刷新页面，让用户决定
  }

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
            <h3 className="text-sm font-semibold text-red-500 mb-2">组件错误</h3>
            <p className="text-xs text-muted-foreground mb-2">该区域出现错误，未影响其他内容。</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">错误详情</summary>
              <pre className="mt-2 overflow-auto max-h-40 bg-muted p-2 rounded">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          </div>
        );
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-2xl font-bold text-destructive mb-4">出现错误</h2>
            <p className="text-muted-foreground mb-4">
              应用程序遇到了意外错误，请刷新页面重试。
            </p>
            <button
              onClick={() => {
                try {
                  const keepTheme = localStorage.getItem('osint-theme');
                  localStorage.clear();
                  if (keepTheme) localStorage.setItem('osint-theme', keepTheme);
                } catch (_) {}
                sessionStorage.removeItem('osint-error-recovered');
                window.location.reload();
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 mr-2"
            >
              清除缓存并刷新
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              刷新页面
            </button>
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm font-mono text-muted-foreground">
                错误详情
              </summary>
              <pre className="text-xs text-destructive mt-2 overflow-auto max-h-40 bg-muted p-2 rounded">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;