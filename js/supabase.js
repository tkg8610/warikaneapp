// Supabaseクライアント初期化
const { createClient } = supabase;

// Supabaseクライアントを作成
const db = createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY
);

// グローバルにエクスポート
window.db = db;
