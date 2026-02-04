// 環境変数設定
// Vercelでは環境変数がビルド時に注入される
// ローカル開発時は.env.localから読み込む

const CONFIG = {
    // Supabase設定
    // 本番環境ではVercelの環境変数から取得
    // ローカル開発時はこのファイルを直接編集するか、.env.localを使用
    SUPABASE_URL: 'https://yzwdtpzmqwpezqhpfedc.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2R0cHptcXdwZXpxaHBmZWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODAyMjcsImV4cCI6MjA4NTc1NjIyN30.8wcne9jT3tfLUGYjxZuGwM_QkctFmjFsHycjxUqkp-0',

    // サイトURL（OAuth リダイレクト用）
    SITE_URL: window.location.origin
};

// 環境変数をグローバルにエクスポート
window.CONFIG = CONFIG;
