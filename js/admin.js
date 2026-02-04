// 管理画面ロジック

document.addEventListener('DOMContentLoaded', async () => {
    // 認証チェック
    const user = await Auth.requireAuth();
    if (!user) return;

    // 管理者でなければメインページへリダイレクト
    if (!user.isAdmin) {
        window.location.href = 'index.html';
        return;
    }

    // ローディングを非表示にしてコンテンツを表示
    const loadingIndicator = document.getElementById('loading-indicator');
    const mainContent = document.querySelector('main');
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    if (mainContent) mainContent.classList.remove('hidden');

    // DOM要素
    const accessRequestsList = document.getElementById('access-requests-list');
    const requestCount = document.getElementById('request-count');
    const allowedUsersList = document.getElementById('allowed-users-list');
    const newUserEmailEl = document.getElementById('new-user-email');
    const addUserBtn = document.getElementById('add-user-btn');

    // 状態
    let state = {
        accessRequests: [],
        allowedUsers: []
    };

    // イベントリスナー
    addUserBtn.addEventListener('click', () => addAllowedUser());
    newUserEmailEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addAllowedUser();
        }
    });

    allowedUsersList.addEventListener('click', (e) => {
        if (e.target.closest('.delete-user-btn')) {
            const email = e.target.closest('.delete-user-btn').dataset.email;
            deleteAllowedUser(email);
        }
    });

    accessRequestsList.addEventListener('click', (e) => {
        if (e.target.closest('.approve-btn')) {
            const id = e.target.closest('.approve-btn').dataset.id;
            approveRequest(id);
        }
        if (e.target.closest('.reject-btn')) {
            const id = e.target.closest('.reject-btn').dataset.id;
            rejectRequest(id);
        }
    });

    // --- 関数 ---

    // エラー表示（トースト）
    function showError(message) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in';
        toast.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('animate-slide-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 成功表示（トースト）
    function showSuccess(message) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in';
        toast.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('animate-slide-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 申請一覧を読み込み
    async function loadAccessRequests() {
        const { data, error } = await db
            .from('access_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at');

        if (error) {
            console.error('Failed to load access requests:', error);
            return;
        }
        state.accessRequests = data || [];
        renderAccessRequests();
    }

    // 申請一覧を描画
    function renderAccessRequests() {
        if (state.accessRequests.length === 0) {
            accessRequestsList.innerHTML = '<p class="text-slate-500 text-center py-4">新しい申請はありません</p>';
            requestCount.classList.add('hidden');
            return;
        }

        requestCount.textContent = state.accessRequests.length;
        requestCount.classList.remove('hidden');

        accessRequestsList.innerHTML = state.accessRequests.map(r => `
            <div class="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div class="flex-1">
                    <p class="font-medium text-slate-800">${r.name || '名前未設定'}</p>
                    <p class="text-sm text-slate-600">${r.email}</p>
                    ${r.message ? `<p class="text-xs text-slate-500 mt-1 bg-white p-2 rounded">${r.message}</p>` : ''}
                    <p class="text-xs text-slate-400 mt-2">${new Date(r.created_at).toLocaleString('ja-JP')}</p>
                </div>
                <div class="flex flex-col gap-2 ml-4">
                    <button data-id="${r.id}" class="approve-btn px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors">
                        承認
                    </button>
                    <button data-id="${r.id}" class="reject-btn px-4 py-2 bg-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                        拒否
                    </button>
                </div>
            </div>
        `).join('');
    }

    // 許可ユーザー一覧を読み込み
    async function loadAllowedUsers() {
        const { data, error } = await db.from('allowed_users').select('*').order('created_at');
        if (error) {
            console.error('Failed to load allowed users:', error);
            return;
        }
        state.allowedUsers = data || [];
        renderAllowedUsers();
    }

    // 許可ユーザー一覧を描画
    function renderAllowedUsers() {
        if (state.allowedUsers.length === 0) {
            allowedUsersList.innerHTML = '<p class="text-slate-500 text-center py-4">許可ユーザーがいません</p>';
            return;
        }

        allowedUsersList.innerHTML = state.allowedUsers.map(u => `
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div class="flex items-center gap-2">
                    <span class="text-sm">${u.email}</span>
                    ${u.is_admin ? '<span class="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">管理者</span>' : ''}
                </div>
                ${u.email !== user.email ? `
                    <button data-email="${u.email}" class="delete-user-btn p-2 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    // ユーザーを追加
    async function addAllowedUser() {
        const email = newUserEmailEl.value.trim().toLowerCase();

        if (!email) {
            showError('メールアドレスを入力してください。');
            return;
        }

        if (!email.includes('@')) {
            showError('有効なメールアドレスを入力してください。');
            return;
        }

        if (state.allowedUsers.some(u => u.email === email)) {
            showError('このユーザーは既に追加されています。');
            return;
        }

        const { data, error } = await db.from('allowed_users').insert({
            email,
            is_admin: false,
            added_by: user.email
        }).select().single();

        if (error) {
            showError('ユーザーの追加に失敗しました。');
            console.error(error);
            return;
        }

        state.allowedUsers.push(data);
        newUserEmailEl.value = '';
        renderAllowedUsers();
        showSuccess('ユーザーを追加しました');
    }

    // ユーザーを削除
    async function deleteAllowedUser(email) {
        if (email === user.email) {
            showError('自分自身は削除できません。');
            return;
        }

        if (!confirm(`${email} を削除しますか？`)) {
            return;
        }

        // allowed_usersから削除
        const { error } = await db.from('allowed_users').delete().eq('email', email);
        if (error) {
            showError('ユーザーの削除に失敗しました。');
            console.error(error);
            return;
        }

        // access_requestsからも削除（再申請を可能にするため）
        await db.from('access_requests').delete().eq('email', email);

        state.allowedUsers = state.allowedUsers.filter(u => u.email !== email);
        renderAllowedUsers();
        showSuccess('ユーザーを削除しました');
    }

    // 申請を承認
    async function approveRequest(id) {
        const request = state.accessRequests.find(r => r.id === id);
        if (!request) return;

        // allowed_usersに追加
        const { error: insertError } = await db.from('allowed_users').insert({
            email: request.email,
            is_admin: false,
            added_by: user.email
        });

        if (insertError) {
            showError('ユーザーの追加に失敗しました。');
            console.error(insertError);
            return;
        }

        // 申請ステータスを更新
        await db.from('access_requests').update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.email
        }).eq('id', id);

        // 一覧を更新
        state.accessRequests = state.accessRequests.filter(r => r.id !== id);
        renderAccessRequests();
        loadAllowedUsers();
        showSuccess(`${request.email} を承認しました`);
    }

    // 申請を拒否
    async function rejectRequest(id) {
        const request = state.accessRequests.find(r => r.id === id);
        if (!request) return;

        if (!confirm(`${request.email} の申請を拒否しますか？`)) {
            return;
        }

        const { error } = await db.from('access_requests').update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.email
        }).eq('id', id);

        if (error) {
            showError('申請の拒否に失敗しました。');
            console.error(error);
            return;
        }

        state.accessRequests = state.accessRequests.filter(r => r.id !== id);
        renderAccessRequests();
        showSuccess('申請を拒否しました');
    }

    // 初期読み込み
    loadAccessRequests();
    loadAllowedUsers();
});
