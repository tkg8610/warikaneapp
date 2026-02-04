// メインアプリロジック

document.addEventListener('DOMContentLoaded', async () => {
    // 認証チェック
    const user = await Auth.requireAuth();
    if (!user) return;

    // 認証成功後、ローディングを非表示にしてコンテンツを表示
    const loadingIndicator = document.getElementById('loading-indicator');
    const mainContent = document.querySelector('main');
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    if (mainContent) mainContent.classList.remove('hidden');

    // ユーザー情報を表示
    displayUserInfo(user);

    // --- DOM要素の取得 ---
    const modeXBtn = document.getElementById('mode-x-btn');
    const modeYBtn = document.getElementById('mode-y-btn');
    const yModeFields = document.getElementById('y-mode-fields');
    const form = document.getElementById('transaction-form');
    const paidByEl = document.getElementById('paid-by');
    const itemEl = document.getElementById('item');
    const amountEl = document.getElementById('amount');
    const burdenInputsEl = document.getElementById('burden-inputs');
    const historyList = document.getElementById('history-list');
    const settlementOutput = document.getElementById('settlement-output');
    const errorMessage = document.getElementById('error-message');
    const membersList = document.getElementById('members-list');
    const newMemberNameEl = document.getElementById('new-member-name');
    const addMemberBtn = document.getElementById('add-member-btn');
    const resetMembersBtn = document.getElementById('reset-members-btn');
    const resetHistoryBtn = document.getElementById('reset-history-btn');
    const autoCompleteBtn = document.getElementById('auto-complete-btn');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const editModal = document.getElementById('edit-modal');
    const closeEditBtn = document.getElementById('close-edit-btn');
    const editForm = document.getElementById('edit-form');
    const editIdEl = document.getElementById('edit-id');
    const editPaidByEl = document.getElementById('edit-paid-by');
    const editItemEl = document.getElementById('edit-item');
    const editAmountEl = document.getElementById('edit-amount');
    const editBurdenFields = document.getElementById('edit-burden-fields');
    const editBurdenInputs = document.getElementById('edit-burden-inputs');
    const logoutBtn = document.getElementById('logout-btn');
    // --- アプリケーションの状態 ---
    let state = {
        currentMode: 'X',
        transactions: [],
        members: [],
        userId: user.id,
        isAdmin: user.isAdmin || false
    };

    // 管理者の場合、管理画面リンクを表示
    if (state.isAdmin) {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) adminLink.classList.remove('hidden');
    }

    // --- イベントリスナー ---

    // ログアウト
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => Auth.signOut());
    }

    // モード切り替え
    modeXBtn.addEventListener('click', () => switchMode('X'));
    modeYBtn.addEventListener('click', () => switchMode('Y'));

    // フォーム送信
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        addTransaction();
    });

    // 履歴リストのクリック（削除・編集処理）
    historyList.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) {
            const id = e.target.closest('.delete-btn').dataset.id;
            deleteTransaction(id);
        }
        if (e.target.closest('.edit-btn')) {
            const id = e.target.closest('.edit-btn').dataset.id;
            openEditModal(id);
        }
    });

    // メンバー追加
    addMemberBtn.addEventListener('click', () => addMember());
    newMemberNameEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addMember();
        }
    });

    // メンバーリストのクリック（削除処理）
    membersList.addEventListener('click', (e) => {
        if (e.target.closest('.delete-member-btn')) {
            const name = e.target.closest('.delete-member-btn').dataset.name;
            deleteMember(name);
        }
    });

    // リセットボタン
    resetMembersBtn.addEventListener('click', () => resetMembers());
    resetHistoryBtn.addEventListener('click', () => resetHistory());

    // 自動補完ボタン
    autoCompleteBtn.addEventListener('click', () => autoComplete());

    // ヘルプモーダル
    helpBtn.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
    });
    closeHelpBtn.addEventListener('click', () => {
        helpModal.classList.add('hidden');
    });
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.add('hidden');
        }
    });

    // 編集モーダル
    closeEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.add('hidden');
        }
    });
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEdit();
    });


    // --- 関数 ---

    // ユーザー情報を表示
    function displayUserInfo(user) {
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) {
            userEmailEl.textContent = user.email;
        }
    }

    // Supabaseからデータ読み込み（user_idでフィルタリング）
    async function loadData() {
        const { data: members } = await db.from('members').select('name').order('created_at');
        const { data: transactions } = await db.from('transactions').select('*').order('created_at');

        state.members = members ? members.map(m => m.name) : [];
        state.transactions = transactions ? transactions.map(t => ({
            id: t.id,
            mode: t.mode,
            paidBy: t.paid_by,
            item: t.item,
            amount: Number(t.amount),
            memberCount: t.member_count,
            membersAtTime: t.members_at_time || [],
            burden: t.burden || {}
        })) : [];

        renderMembers();
        renderPaidByOptions();
        renderBurdenInputs();
        render();
    }

    // メンバー追加
    async function addMember() {
        const name = newMemberNameEl.value.trim();
        if (!name) {
            showError('名前を入力してください。');
            return;
        }
        if (state.members.includes(name)) {
            showError('同じ名前のメンバーが既に存在します。');
            return;
        }

        const { error } = await db.from('members').insert({
            name,
            user_id: state.userId
        });
        if (error) {
            showError('保存に失敗しました');
            console.error(error);
            return;
        }

        state.members.push(name);
        newMemberNameEl.value = '';
        renderMembers();
        renderPaidByOptions();
        renderBurdenInputs();
        render();
    }

    // メンバー削除
    async function deleteMember(name) {
        // このメンバーが関連する取引があるか確認
        const hasTransactions = state.transactions.some(t =>
            t.paidBy === name || (t.burden && name in t.burden)
        );
        if (hasTransactions) {
            showError('このメンバーには関連する会計があるため削除できません。');
            return;
        }

        const { error } = await db.from('members').delete().eq('name', name);
        if (error) {
            showError('削除に失敗しました');
            return;
        }

        state.members = state.members.filter(m => m !== name);
        renderMembers();
        renderPaidByOptions();
        renderBurdenInputs();
        render();
    }

    // メンバーリストの描画
    function renderMembers() {
        if (state.members.length === 0) {
            membersList.innerHTML = '<span class="text-slate-500">メンバーを追加してください</span>';
            return;
        }
        membersList.innerHTML = state.members.map(name => `
            <span class="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                ${name}さん
                <button data-name="${name}" class="delete-member-btn hover:bg-purple-200 rounded-full p-0.5 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </span>
        `).join('');
    }

    // 支払い者ドロップダウンの描画
    function renderPaidByOptions() {
        paidByEl.innerHTML = state.members.map(name =>
            `<option value="${name}">${name}さん</option>`
        ).join('');
    }

    // 負担額入力フィールドの描画
    function renderBurdenInputs() {
        burdenInputsEl.innerHTML = state.members.map(name => `
            <div>
                <label class="block text-xs text-slate-500">${name}さんの負担額</label>
                <input type="number" data-member="${name}" placeholder="0" class="burden-input w-full p-2 border border-slate-300 rounded-lg">
            </div>
        `).join('');
    }

    // モード切り替えのロジック
    function switchMode(mode) {
        state.currentMode = mode;
        if (mode === 'X') {
            modeXBtn.classList.add('border-indigo-500', 'text-indigo-600');
            modeXBtn.classList.remove('text-slate-500');
            modeYBtn.classList.remove('border-indigo-500', 'text-indigo-600');
            modeYBtn.classList.add('text-slate-500');
            yModeFields.classList.add('hidden');
        } else {
            modeYBtn.classList.add('border-indigo-500', 'text-indigo-600');
            modeYBtn.classList.remove('text-slate-500');
            modeXBtn.classList.remove('border-indigo-500', 'text-indigo-600');
            modeXBtn.classList.add('text-slate-500');
            yModeFields.classList.remove('hidden');
        }
         errorMessage.textContent = '';
    }

    // 会計の追加
    async function addTransaction() {
        if (state.members.length < 2) {
            showError('最低2人のメンバーを追加してください。');
            return;
        }

        const paidBy = paidByEl.value;
        const item = itemEl.value.trim();
        const amount = parseFloat(amountEl.value);

        // バリデーション
        if (!item || isNaN(amount) || amount <= 0) {
            showError('項目と正しい金額を入力してください。');
            return;
        }

        const dbRecord = {
            mode: state.currentMode,
            paid_by: paidBy,
            item,
            amount,
            member_count: state.members.length,
            members_at_time: [...state.members],
            burden: null,
            user_id: state.userId
        };

        if (state.currentMode === 'Y') {
            const burden = {};
            let totalBurden = 0;
            const burdenInputs = burdenInputsEl.querySelectorAll('.burden-input');
            burdenInputs.forEach(input => {
                const member = input.dataset.member;
                const value = parseFloat(input.value) || 0;
                burden[member] = value;
                totalBurden += value;
            });

            if (Math.abs(totalBurden - amount) > 0.01) {
                 showError('各人の負担額の合計が総額と一致しません。');
                return;
            }
            dbRecord.burden = burden;
        }

        const { data, error } = await db.from('transactions').insert(dbRecord).select().single();
        if (error) {
            showError('保存に失敗しました');
            console.error(error);
            return;
        }

        state.transactions.push({
            id: data.id,
            mode: data.mode,
            paidBy: data.paid_by,
            item: data.item,
            amount: Number(data.amount),
            memberCount: data.member_count,
            membersAtTime: data.members_at_time || [],
            burden: data.burden || {}
        });

        render();
        form.reset();
        switchMode('X');
        errorMessage.textContent = '';
    }

    // 自動補完
    function autoComplete() {
        const total = parseFloat(amountEl.value) || 0;
        const inputs = burdenInputsEl.querySelectorAll('.burden-input');

        // 各負担額を取得
        let filledSum = 0;
        let emptyCount = 0;
        let emptyInput = null;

        inputs.forEach(input => {
            const val = parseFloat(input.value);
            if (isNaN(val) || input.value === '') {
                emptyCount++;
                emptyInput = input;
            } else {
                filledSum += val;
            }
        });

        // パターン1: 総額が空、全員分入力済み → 総額を計算
        if (!amountEl.value && emptyCount === 0) {
            amountEl.value = filledSum;
        }
        // パターン2: 総額あり、1人だけ空 → その人を計算
        else if (total > 0 && emptyCount === 1) {
            emptyInput.value = total - filledSum;
        }
    }

    // メンバーリセット
    async function resetMembers() {
        // 会計がある場合は警告
        if (state.transactions.length > 0) {
            showError('会計履歴があるため、メンバーをリセットできません。先に会計を削除してください。');
            return;
        }

        if (state.members.length === 0) return;

        const { error } = await db.from('members').delete().neq('name', '');
        if (error) {
            showError('リセットに失敗しました');
            return;
        }

        state.members = [];
        renderMembers();
        renderPaidByOptions();
        renderBurdenInputs();
        render();
    }

    // 会計履歴一括リセット
    async function resetHistory() {
        if (state.transactions.length === 0) {
            showError('削除する会計がありません。');
            return;
        }

        if (!confirm('すべての会計履歴を削除しますか？この操作は取り消せません。')) {
            return;
        }

        const { error } = await db.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            showError('リセットに失敗しました');
            return;
        }

        state.transactions = [];
        render();
    }

    // エラー表示（トースト通知）
    function showError(message) {
        // フォーム内エラー表示（従来の動作も維持）
        errorMessage.textContent = message;
        setTimeout(() => {
            errorMessage.textContent = '';
        }, 3000);

        // トースト通知を表示
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in';
        toast.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>${message}</span>
            <button class="ml-auto hover:bg-red-600 rounded p-1" onclick="this.parentElement.remove()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        toastContainer.appendChild(toast);

        // 3秒後に自動で消える
        setTimeout(() => {
            toast.classList.add('animate-slide-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 会計の削除
    async function deleteTransaction(id) {
        const { error } = await db.from('transactions').delete().eq('id', id);
        if (error) {
            showError('削除に失敗しました');
            return;
        }
        state.transactions = state.transactions.filter(t => t.id !== id);
        render();
    }

    // 編集モーダルを開く
    function openEditModal(id) {
        const transaction = state.transactions.find(t => t.id === id);
        if (!transaction) return;

        editIdEl.value = id;
        editItemEl.value = transaction.item;
        editAmountEl.value = transaction.amount;

        // 支払った人のセレクトボックスを作成
        editPaidByEl.innerHTML = transaction.membersAtTime.map(name =>
            `<option value="${name}" ${name === transaction.paidBy ? 'selected' : ''}>${name}さん</option>`
        ).join('');

        // Yモードの場合、負担額入力を表示
        if (transaction.mode === 'Y') {
            editBurdenFields.classList.remove('hidden');
            editBurdenInputs.innerHTML = transaction.membersAtTime.map(name => `
                <div>
                    <label class="block text-xs text-slate-500">${name}さん</label>
                    <input type="number" data-member="${name}" value="${transaction.burden[name] || 0}" class="edit-burden-input w-full p-2 border border-slate-300 rounded-lg">
                </div>
            `).join('');
        } else {
            editBurdenFields.classList.add('hidden');
        }

        editModal.classList.remove('hidden');
    }

    // 編集を保存
    async function saveEdit() {
        const id = editIdEl.value;
        const transaction = state.transactions.find(t => t.id === id);
        if (!transaction) return;

        const paidBy = editPaidByEl.value;
        const item = editItemEl.value.trim();
        const amount = parseFloat(editAmountEl.value);

        if (!item || isNaN(amount) || amount <= 0) {
            showError('項目と正しい金額を入力してください。');
            return;
        }

        const updateData = {
            paid_by: paidBy,
            item,
            amount
        };

        if (transaction.mode === 'Y') {
            const burden = {};
            let totalBurden = 0;
            const inputs = editBurdenInputs.querySelectorAll('.edit-burden-input');
            inputs.forEach(input => {
                const member = input.dataset.member;
                const value = parseFloat(input.value) || 0;
                burden[member] = value;
                totalBurden += value;
            });

            if (Math.abs(totalBurden - amount) > 0.01) {
                showError('各人の負担額の合計が総額と一致しません。');
                return;
            }
            updateData.burden = burden;
        }

        const { error } = await db.from('transactions').update(updateData).eq('id', id);
        if (error) {
            showError('保存に失敗しました');
            return;
        }

        // ローカルの状態を更新
        transaction.paidBy = paidBy;
        transaction.item = item;
        transaction.amount = amount;
        if (updateData.burden) {
            transaction.burden = updateData.burden;
        }

        editModal.classList.add('hidden');
        render();
    }

    // 全体の再描画
    function render() {
        renderHistory();
        renderSettlement();
    }

    // 履歴の描画
    function renderHistory() {
        if (state.transactions.length === 0) {
            historyList.innerHTML = '<li class="text-center text-slate-500 pt-4">まだ会計がありません。</li>';
            return;
        }
        historyList.innerHTML = state.transactions.map(t => {
            let details = '';
            if (t.mode === 'X') {
                const share = (t.amount / t.memberCount).toLocaleString(undefined, {maximumFractionDigits: 0});
                details = `<span class="text-xs text-slate-500">単純割り勘 (各${share}円)</span>`;
            } else {
                const burdenDetails = t.membersAtTime.map(m => `${m}:${(t.burden[m] || 0).toLocaleString()}`).join(', ');
                details = `<span class="text-xs text-slate-500">個別割り勘 (${burdenDetails})</span>`;
            }

            return `
                <li class="flex items-center justify-between p-3 bg-slate-50 rounded-lg fade-in">
                    <div>
                        <p class="font-medium">${t.item}</p>
                        <p class="text-sm text-slate-600">
                            支払: ${t.paidBy}さん / 金額: ${t.amount.toLocaleString()}円
                        </p>
                        ${details}
                    </div>
                    <div class="flex gap-1">
                        <button data-id="${t.id}" class="edit-btn p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button data-id="${t.id}" class="delete-btn p-2 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </li>
            `;
        }).join('');
    }

    // 清算結果の描画
    function renderSettlement() {
        if (state.members.length === 0) {
            settlementOutput.innerHTML = '<p class="text-slate-500">メンバーを追加してください。</p>';
            return;
        }

        const balances = {};
        state.members.forEach(m => balances[m] = 0);

        // 各人の貸し借り残高を計算
        state.transactions.forEach(t => {
            const paidBy = t.paidBy;
            if (t.mode === 'X') {
                const share = t.amount / t.memberCount;
                if (balances[paidBy] !== undefined) {
                    balances[paidBy] += t.amount;
                }
                t.membersAtTime.forEach(member => {
                    if (balances[member] !== undefined) {
                        balances[member] -= share;
                    }
                });
            } else { // Yモード
                if (balances[paidBy] !== undefined) {
                    balances[paidBy] += t.amount;
                }
                t.membersAtTime.forEach(member => {
                    if (balances[member] !== undefined && t.burden[member] !== undefined) {
                        balances[member] -= t.burden[member];
                    }
                });
            }
        });

        // 貸している人 (creditors) と借りている人 (debtors) に分ける
        const creditors = [];
        const debtors = [];
        for (const member of state.members) {
            if (balances[member] > 0.01) {
                creditors.push({ name: member, amount: balances[member] });
            } else if (balances[member] < -0.01) {
                debtors.push({ name: member, amount: -balances[member] });
            }
        }

        const settlements = [];
        // 清算ロジック
        while (creditors.length > 0 && debtors.length > 0) {
            const creditor = creditors[0];
            const debtor = debtors[0];
            const amountToSettle = Math.min(creditor.amount, debtor.amount);

            settlements.push({ from: debtor.name, to: creditor.name, amount: amountToSettle });

            creditor.amount -= amountToSettle;
            debtor.amount -= amountToSettle;

            if (creditor.amount < 0.01) creditors.shift();
            if (debtor.amount < 0.01) debtors.shift();
        }

        // 結果表示
        if (settlements.length === 0) {
            settlementOutput.innerHTML = '<p class="text-green-600 font-medium">清算は完了しています。</p>';
        } else {
            settlementOutput.innerHTML = settlements.map(s => `
                <div class="flex items-center gap-3 bg-indigo-50 p-3 rounded-lg">
                   <span class="font-semibold text-indigo-800">${s.from}さん</span>
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                   <span class="font-semibold text-indigo-800">${s.to}さん</span>
                   <span>へ</span>
                   <span class="font-bold text-xl text-indigo-900 ml-auto">${Math.round(s.amount).toLocaleString()}円</span>
                </div>
            `).join('');
        }
    }

    // 初期読み込み
    loadData();
});
