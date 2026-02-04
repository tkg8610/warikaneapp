-- 割り勘アプリ DBマイグレーション
-- このSQLをSupabaseダッシュボードのSQL Editorで実行してください
-- 注意: 既存データは削除されます

-- 1. user_idカラム追加
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. インデックス追加
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- 3. RLS有効化
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. 既存のRLSポリシーがあれば削除
DROP POLICY IF EXISTS "Users can view own members" ON members;
DROP POLICY IF EXISTS "Users can insert own members" ON members;
DROP POLICY IF EXISTS "Users can update own members" ON members;
DROP POLICY IF EXISTS "Users can delete own members" ON members;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- 5. membersテーブルのRLSポリシー
CREATE POLICY "Users can view own members" ON members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own members" ON members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own members" ON members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own members" ON members FOR DELETE USING (auth.uid() = user_id);

-- 6. transactionsテーブルのRLSポリシー
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- 7. 既存データ削除（user_idがNULLのデータ）
DELETE FROM transactions WHERE user_id IS NULL;
DELETE FROM members WHERE user_id IS NULL;

-- 8. NOT NULL制約追加
ALTER TABLE members ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
