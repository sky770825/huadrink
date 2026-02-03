import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 全域錯誤邊界：當 React 渲染發生未捕捉錯誤時，顯示友善提示而非全白畫面。
 * 協助使用者排查「部分手機呈現空白」的問題。
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

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
          padding: 24,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#fafafa',
          color: '#333',
        }}
      >
        <h1 style={{ fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
          頁面載入發生問題
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 320, marginBottom: 20 }}>
          若您看到此畫面，代表程式在您的裝置上無法正常執行。請嘗試以下方式：
        </p>
        <ul
          style={{
            fontSize: 14,
            lineHeight: 2,
            textAlign: 'left',
            maxWidth: 320,
            marginBottom: 24,
            paddingLeft: 20,
          }}
        >
          <li>使用 Chrome 或 Safari 瀏覽器的最新版本</li>
          <li>將連結<strong>複製到瀏覽器</strong>開啟（避免在 Line、微信等 App 內嵌網頁開啟）</li>
          <li>清除瀏覽器快取後重新整理</li>
          <li>關閉省流量、無痕模式後重試</li>
          <li>改用 Wi‑Fi 或其他網路環境</li>
        </ul>
        <p style={{ fontSize: 12, color: '#666' }}>
          報名頁面：<a href="/">huadrink.pages.dev</a>
        </p>
      </div>
    );
  }
}
