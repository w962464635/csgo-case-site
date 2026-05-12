let token = localStorage.getItem('token');
let user = null;
let currentCase = 'standard';
let isOpening = false;

const API = {
    async request(url, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(url, { ...options, headers });
        const data = await res.json();
        if (res.status === 401 || res.status === 403) { logout(); throw new Error('请重新登录'); }
        if (!res.ok) throw new Error(data.error || '请求失败');
        return data;
    },
    get(url) { return this.request(url); },
    post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); }
};

function checkAuth() {
    if (token) {
        API.get('/api/user').then(data => {
            user = data;
            updateUI();
            document.getElementById('authModal').style.display = 'none';
            loadWeapons();
        }).catch(() => logout());
    } else {
        document.getElementById('authModal').style.display = 'flex';
    }
}

let isLoginMode = true;
function toggleAuth() {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').textContent = isLoginMode ? '登录' : '注册';
    document.getElementById('btnAuth').textContent = isLoginMode ? '登录' : '注册';
    document.getElementById('switchText').textContent = isLoginMode ? '没有账号？' : '已有账号？';
    document.getElementById('switchLink').textContent = isLoginMode ? '立即注册' : '去登录';
}

async function handleAuth() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) return alert('请输入用户名和密码');
    try {
        const endpoint = isLoginMode ? '/api/login' : '/api/register';
        const data = await API.post(endpoint, { username, password });
        if (isLoginMode) {
            token = data.token;
            user = data.user;
            localStorage.setItem('token', token);
            updateUI();
            document.getElementById('authModal').style.display = 'none';
            loadWeapons();
        } else {
            alert('注册成功！请登录');
            toggleAuth();
        }
    } catch (err) { alert(err.message); }
}

function logout() {
    token = null;
    user = null;
    localStorage.removeItem('token');
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('userDisplay').textContent = '';
    document.getElementById('balanceDisplay').textContent = '余额: $0';
    document.getElementById('btnLogout').style.display = 'none';
}

function updateUI() {
    if (user) {
        document.getElementById('userDisplay').textContent = user.username;
        document.getElementById('balanceDisplay').textContent = `余额: $${user.balance.toFixed(2)}`;
        document.getElementById('btnLogout').style.display = 'inline-block';
    }
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    if (page === 'inventory') loadInventory();
    if (page === 'history') loadHistory();
}

async function loadWeapons() {
    try {
        const weapons = await API.get('/api/weapons');
        const track = document.getElementById('scrollTrack');
        const cards = [];
        for (let i = 0; i < 30; i++) cards.push(weapons[Math.floor(Math.random() * weapons.length)]);
        track.innerHTML = cards.map(w => `
            <div class="weapon-card">
                <span class="weapon-emoji rarity-${w.rarity}">🔫</span>
                <span class="weapon-name rarity-${w.rarity}">${w.name.split('|')[0]}</span>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

async function openCase() {
    if (isOpening || !user) return;
    isOpening = true;
    document.getElementById('btnOpen').disabled = true;
    try {
        const data = await API.post('/api/open-case', { caseType: currentCase });
        const weapon = data.weapon;
        user.balance = data.balance;
        updateUI();

        const weapons = await API.get('/api/weapons');
        const cards = [];
        for (let i = 0; i < 35; i++) cards.push(weapons[Math.floor(Math.random() * weapons.length)]);
        cards[Math.floor(cards.length * 0.7)] = weapon;
        
        const track = document.getElementById('scrollTrack');
        track.innerHTML = cards.map(w => `
            <div class="weapon-card">
                <span class="weapon-emoji rarity-${w.rarity}">🔫</span>
                <span class="weapon-name rarity-${w.rarity}">${w.name.split('|')[0]}</span>
            </div>
        `).join('');

        const allCards = track.querySelectorAll('.weapon-card');
        let targetIndex = 0;
        allCards.forEach((c, i) => {
            if (c.querySelector('.weapon-name').textContent === weapon.name.split('|')[0] && targetIndex === 0) targetIndex = i;
        });

        const cardWidth = 132;
        const containerWidth = document.getElementById('scrollWindow').clientWidth;
        const targetOffset = targetIndex * cardWidth - containerWidth / 2 + cardWidth / 2;
        const finalOffset = targetOffset + 5 * allCards.length * cardWidth;

        const duration = 3500;
        const startTime = performance.now();
        function animate(time) {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 5);
            track.style.transform = `translateX(-${finalOffset * eased}px)`;
            const containerRect = document.getElementById('scrollWindow').getBoundingClientRect();
            const centerX = containerRect.left + containerRect.width / 2;
            allCards.forEach(card => {
                const rect = card.getBoundingClientRect();
                card.classList.toggle('active', Math.abs(rect.left + rect.width/2 - centerX) < 60);
            });
            if (progress < 1) requestAnimationFrame(animate);
            else {
                const rarityMap = { gold:'result-gold', red:'result-red', pink:'result-pink', purple:'result-purple', blue:'result-blue', 'light-blue':'result-light-blue' };
                document.getElementById('resultArea').innerHTML = `<div class="result-item ${rarityMap[weapon.rarity]}">🔫 ${weapon.name}</div>`;
                if (weapon.rarity === 'gold') {
                    const flash = document.getElementById('goldFlash');
                    flash.style.display = 'block';
                    flash.style.animation = 'none';
                    flash.offsetHeight;
                    flash.style.animation = 'flash 1s ease-out forwards';
                    setTimeout(() => { flash.style.display = 'none'; }, 1000);
                }
                isOpening = false;
                document.getElementById('btnOpen').disabled = false;
            }
        }
        requestAnimationFrame(animate);
    } catch (err) {
        alert(err.message);
        isOpening = false;
        document.getElementById('btnOpen').disabled = false;
    }
}

async function loadInventory() {
    try {
        const items = await API.get('/api/inventory');
        const grid = document.getElementById('inventoryGrid');
        if (items.length === 0) { grid.innerHTML = '<p style="color:#555;text-align:center;grid-column:1/-1;">库存为空</p>'; return; }
        grid.innerHTML = items.map(item => `
            <div class="inventory-item">
                <div class="weapon-emoji rarity-${item.rarity}">🔫</div>
                <div class="weapon-name rarity-${item.rarity}">${item.name}</div>
                <div style="font-size:0.7em;color:#555;margin-top:4px;">${new Date(item.obtained_at).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

async function loadHistory() {
    try {
        const items = await API.get('/api/history');
        const list = document.getElementById('historyList');
        if (items.length === 0) { list.innerHTML = '<div class="history-item"><span style="color:#555;">暂无记录</span></div>'; return; }
        list.innerHTML = items.map(item => `
            <div class="history-item">
                <span class="rarity-${item.rarity}">🔫 ${item.name}</span>
                <span style="font-size:0.8em;color:#555;">${new Date(item.opened_at).toLocaleString('zh-CN')}</span>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

document.querySelectorAll('.case-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.case-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCase = btn.dataset.case;
    });
});

checkAuth();
