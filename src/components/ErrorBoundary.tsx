import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * 根级错误边界。
 *
 * 作用：任何子树在渲染/生命周期中抛出的异常，都会被捕获并显示一个可读的「出错了」页面
 * （带重试按钮），而不是让 React 卸载整棵树导致白屏。
 *
 * 这是「绝不白屏」的第二道防线（第一道是 index.html 里的全局错误兜底脚本，
 * 第三道是 safeStorage 等具体抛点的修复）。
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // 输出到控制台，便于真机/审核环境通过日志定位
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] App crashed:', error, info);
  }

  private handleReload = () => {
    try {
      this.setState({ hasError: false, message: '' });
      window.location.reload();
    } catch {
      this.setState({ hasError: false, message: '' });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          background: '#0f172a',
          color: '#e2e8f0',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
          出了点问题 / Something went wrong
        </h1>
        <p style={{ fontSize: '14px', opacity: 0.8, maxWidth: '320px', margin: '0 0 24px', lineHeight: 1.5 }}>
          应用启动时遇到一个错误。请点击下方按钮重试。
          <br />
          The app hit an error on launch. Please retry.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            background: '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: '9999px',
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          重试 / Retry
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
