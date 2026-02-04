-- 許可ユーザーテーブル
CREATE TABLE IF NOT EXISTS allowed_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    added_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS（Row Level Security）を有効化
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- 許可されたユーザーのみ読み取り可能
CREATE POLICY "Allowed users can read" ON allowed_users
    FOR SELECT
    USING (
        auth.jwt() ->> 'email' IN (SELECT email FROM allowed_users)
    );

-- 管理者のみ追加可能
CREATE POLICY "Admins can insert" ON allowed_users
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'email' IN (SELECT email FROM allowed_users WHERE is_admin = TRUE)
    );

-- 管理者のみ削除可能（自分自身は削除不可）
CREATE POLICY "Admins can delete" ON allowed_users
    FOR DELETE
    USING (
        auth.jwt() ->> 'email' IN (SELECT email FROM allowed_users WHERE is_admin = TRUE)
        AND email != auth.jwt() ->> 'email'
    );

-- インデックス
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON allowed_users(email);
