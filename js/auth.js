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

    // 認証ガード（未認証時にログインページへリダイレクト）
    async requireAuth() {
        const user = await this.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return null;
        }
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
