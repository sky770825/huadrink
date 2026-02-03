import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * 全域錯誤邊界：當 React 渲染發生未捕捉錯誤時，顯示友善提示而非全白畫面。
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const text = [
      error?.message || '',
      error?.stack || '',
      errorInfo?.componentStack || '',
    ].filter(Boolean).join('\n\n');
    navigator.clipboard?.writeText(text || '無錯誤詳情').then(() => {
      const btn = document.getElementById('copy-error-btn');
      if (btn) {
        btn.textContent = '已複製';
        setTimeout(() => { btn.textContent = '複製錯誤資訊'; }, 2000);
      }
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    const errorSummary = error?.message?.slice(0, 80) || '';

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#fafafa',
          color: '#333',
        }}
      >
        <h1 style={{ fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
          頁面載入發生問題
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 360, marginBottom: 12, textAlign: 'center' }}>
          程式在您的網路或裝置環境下無法正常執行。若使用<strong>電腦 Chrome</strong>仍出現此畫面，可能是：
        </p>
        <ul
          style={{
            fontSize: 13,
            lineHeight: 1.8,
            textAlign: 'left',
            maxWidth: 360,
            marginBottom: 16,
            paddingLeft: 20,
          }}
        >
          <li><strong>網路限制</strong>：公司、學校網路或 VPN 可能封鎖連線</li>
          <li><strong>中國大陸</strong>：部分網路無法連線至國外服務</li>
          <li><strong>瀏覽器擴充功能</strong>：請關閉廣告攔截、隱私擴充後重試</li>
          <li><strong>無痕模式</strong>：請改用一般模式開啟</li>
        </ul>
        <p style={{ fontSize: 13, marginBottom: 16 }}>
          請嘗試：<strong>清除快取</strong>、<strong>換網路</strong>（如手機熱點），或<strong>換一台裝置</strong>測試。
        </p>
        {errorSummary && (
          <div style={{ marginBottom: 16, width: '100%', maxWidth: 360 }}>
            <button
              id="copy-error-btn"
              type="button"
              onClick={this.handleCopyError}
              style={{
                padding: '8px 16px',
                fontSize: 12,
                color: '#666',
                backgroundColor: '#eee',
                border: '1px solid #ddd',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              複製錯誤資訊
            </button>
            <p style={{ fontSize: 11, color: '#999', marginTop: 8, wordBreak: 'break-all' }}>
              {errorSummary}
            </p>
          </div>
        )}
        <a
          href="https://play.google.com/store/apps/details?id=com.android.chrome"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#1a73e8',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          手機請安裝 Chrome（Google Play）
        </a>
        <p style={{ fontSize: 12, color: '#666', marginTop: 24 }}>
          報名頁面：<a href="/">huadrink.pages.dev</a>
        </p>
      </div>
    );
  }
}
