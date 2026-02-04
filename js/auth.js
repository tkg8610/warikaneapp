// 認証関連のロジック

const Auth = {
    // 現在のユーザーを取得
    async getCurrentUser() {
        const { data: { user } } = await db.auth.getUser();
        return user;
    },

    // セッションを取得
    async getSession() {
        const { data: { session } } = await db.auth.getSession();
        return session;
    },

    // メール/パスワードでサインアップ
    async signUp(email, password) {
        const { data, error } = await db.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${CONFIG.SITE_URL}/index.html`
            }
        });
        return { data, error };
    },

    // メール/パスワードでサインイン
    async signIn(email, password) {
        const { data, error } = await db.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    // Googleでサインイン
    async signInWithGoogle() {
        const { data, error } = await db.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${CONFIG.SITE_URL}/index.html`
            }
        });
        return { data, error };
    },

    // サインアウト
    async signOut() {
        const { error } = await db.auth.signOut();
        if (!error) {
            window.location.href = 'login.html';
        }
        return { error };
    },

    // 認証状態の変更を監視
    onAuthStateChange(callback) {
        return db.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    // メールアドレスが許可リストにあるかチェック（DB）
    async isEmailAllowed(email) {
        // 管理者メールは常に許可
        if (email === CONFIG.ADMIN_EMAIL) {
            return { allowed: true, isAdmin: true };
        }

        const { data, error } = await db
            .from('allowed_users')
            .select('email, is_admin')
            .eq('email', email)
            .single();

        if (error || !data) {
            return { allowed: false, isAdmin: false };
        }
        return { allowed: true, isAdmin: data.is_admin };
    },

    // 管理者を初期登録（存在しなければ）
    async ensureAdminExists() {
        if (!CONFIG.ADMIN_EMAIL) return;

        const { data } = await db
            .from('allowed_users')
            .select('email')
            .eq('email', CONFIG.ADMIN_EMAIL)
            .single();

        if (!data) {
            await db.from('allowed_users').insert({
                email: CONFIG.ADMIN_EMAIL,
                is_admin: true,
                added_by: 'system'
            });
        }
    },

    // 認証ガード（未認証時にログインページへリダイレクト）
    async requireAuth() {
        const user = await this.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }

        // 管理者の初期登録を試行
        await this.ensureAdminExists();

        // ホワイトリストチェック
        const { allowed, isAdmin } = await this.isEmailAllowed(user.email);
        if (!allowed) {
            window.location.href = 'request.html';
            return null;
        }

        // ユーザーオブジェクトにisAdmin情報を追加
        user.isAdmin = isAdmin;
        return user;
    },

    // 認証済みの場合メインページへリダイレクト
    async redirectIfAuthenticated() {
        const user = await this.getCurrentUser();
        if (user) {
            window.location.href = 'index.html';
            return true;
        }
        return false;
    }
};

// グローバルにエクスポート
window.Auth = Auth;
