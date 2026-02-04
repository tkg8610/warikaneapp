-- アクセス申請テーブル
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT
);

-- RLSを有効化
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは自分の申請を作成可能
CREATE POLICY "Users can insert own request" ON access_requests
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'email' = email);

-- 認証済みユーザーは自分の申請を読み取り可能
CREATE POLICY "Users can read own request" ON access_requests
    FOR SELECT
    USING (
        auth.jwt() ->> 'email' = email
        OR is_admin()
    );

-- 管理者のみ更新可能
CREATE POLICY "Admins can update" ON access_requests
    FOR UPDATE
    USING (is_admin());

-- 管理者のみ削除可能
CREATE POLICY "Admins can delete" ON access_requests
    FOR DELETE
    USING (is_admin());

-- インデックス
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
