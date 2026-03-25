// ============ 常量 ============
const PRICE = 5;
const ADMIN_PWD = '888888'; // 默认管理员密码

// ============ 数据存储 ============
const DB = {
    get: (key) => { try { return JSON.parse(localStorage.getItem('co_' + key)) || null; } catch(e) { return null; } },
    set: (key, val) => localStorage.setItem('co_' + key, JSON.stringify(val)),
    getMenus: () => DB.get('menus') || {},
    getOrders: () => DB.get('orders') || {},
    saveMenus: (v) => DB.set('menus', v),
    saveOrders: (v) => DB.set('orders', v),
};

// ============ 状态 ============
let currentUser = null;
let isAdmin = false;
let selectedDate = null; // 用户选中的日期
let currentWeekStart = null; // 当前显示周的起始日

// ============ 工具函数 ============
function today() { return new Date().toISOString().split('T')[0]; }
function now() { return new Date().toTimeString().slice(0, 5); }
function formatDate(d) {
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getMonth()+1}月${dt.getDate()}日 ${['日','一','二','三','四','五','六'][dt.getDay()]}`;
}
function monthOf(d) { return d.slice(0, 7); }

// 获取本周开始日期（周一）
function getWeekStart(date) {
    const dt = new Date(date + 'T00:00:00');
    const day = dt.getDay(); // 0=周日,1=周一...
    const diff = day === 0 ? -6 : 1 - day; // 调整到周一
    dt.setDate(dt.getDate() + diff);
    return dt.toISOString().split('T')[0];
}

// 日期加减天数
function addDays(date, days) {
    const dt = new Date(date + 'T00:00:00');
    dt.setDate(dt.getDate() + days);
    return dt.toISOString().split('T')[0];
}

// 格式化短日期
function formatShortDate(d) {
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getMonth()+1}/${dt.getDate()}`;
}

function showToast(msg, duration = 2000) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
}

function showConfirm(title, body, onOk) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').textContent = body;
    document.getElementById('confirm-modal').style.display = 'flex';
    document.getElementById('confirm-ok').onclick = () => {
        document.getElementById('confirm-modal').style.display = 'none';
        onOk();
    };
    document.getElementById('confirm-cancel').onclick = () => {
        document.getElementById('confirm-modal').style.display = 'none';
    };
}

function showPage(id) {
    document.querySelectorAll('.page-full').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
    setupLogin();
    setupAdmin();
    document.getElementById('confirm-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirm-modal')) {
            document.getElementById('confirm-modal').style.display = 'none';
        }
    });
});

// ============ 登录 ============
function setupLogin() {
    const input = document.getElementById('login-name');
    const btn = document.getElementById('btn-login');

    btn.addEventListener('click', doLogin);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

    document.getElementById('btn-admin-entry').addEventListener('click', () => {
        showPage('page-admin-login');
        document.getElementById('admin-pwd').value = '';
        document.getElementById('admin-pwd').focus();
    });

    document.getElementById('btn-back-login').addEventListener('click', () => {
        showPage('page-login');
    });

    document.getElementById('btn-admin-login').addEventListener('click', doAdminLogin);
    document.getElementById('admin-pwd').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doAdminLogin();
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        currentUser = null;
        showPage('page-login');
        document.getElementById('login-name').value = '';
    });
}

function doLogin() {
    const name = document.getElementById('login-name').value.trim();
    if (!name) { showToast('请输入姓名'); return; }
    currentUser = name;
    isAdmin = false;
    showPage('page-user');
    renderUserPage();
}

function doAdminLogin() {
    const pwd = document.getElementById('admin-pwd').value;
    if (pwd !== ADMIN_PWD) { showToast('密码错误'); return; }
    isAdmin = true;
    showPage('page-admin');
    renderAdminPage();
}

// ============ 员工页面 ============
function renderUserPage() {
    document.getElementById('user-name-display').textContent = currentUser;
    // 初始化选中今天
    selectedDate = today();
    currentWeekStart = getWeekStart(today());
    renderWeekCalendar();
    renderSelectedDay();
    renderUserOrders();
    setupWeekNavigation();
}

function setupWeekNavigation() {
    document.getElementById('prev-week').addEventListener('click', () => {
        currentWeekStart = addDays(currentWeekStart, -7);
        renderWeekCalendar();
    });
    document.getElementById('next-week').addEventListener('click', () => {
        currentWeekStart = addDays(currentWeekStart, 7);
        renderWeekCalendar();
    });
}

function renderWeekCalendar() {
    const weekEnd = addDays(currentWeekStart, 6);
    document.getElementById('week-range').textContent = 
        `${formatShortDate(currentWeekStart)} - ${formatShortDate(weekEnd)}`;

    const calendarEl = document.getElementById('week-calendar');
    const orders = DB.getOrders();
    const todayStr = today();

    let html = '';
    for (let i = 0; i < 7; i++) {
        const date = addDays(currentWeekStart, i);
        const dt = new Date(date + 'T00:00:00');
        const weekday = ['一', '二', '三', '四', '五', '六', '日'][i];
        const isSelected = date === selectedDate;
        const isOrdered = orders[date] && orders[date].includes(currentUser);
        const isPast = date < todayStr;

        let className = 'day-cell';
        if (isSelected) className += ' selected';
        if (isOrdered) className += ' ordered';
        if (isPast) className += ' past';

        html += `
            <div class="${className}" data-date="${date}">
                <div class="day-weekday">${weekday}</div>
                <div class="day-date">${dt.getDate()}</div>
                <div class="day-status">${isOrdered ? '已订' : ''}</div>
            </div>
        `;
    }
    calendarEl.innerHTML = html;

    // 绑定点击事件
    calendarEl.querySelectorAll('.day-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            selectedDate = cell.dataset.date;
            renderWeekCalendar();
            renderSelectedDay();
        });
    });
}

function renderSelectedDay() {
    const menus = DB.getMenus();
    const orders = DB.getOrders();
    const menuDisplay = document.getElementById('selected-menu-display');
    const actionArea = document.getElementById('selected-order-area');

    document.getElementById('selected-date').textContent = formatDate(selectedDate);

    const menu = menus[selectedDate];
    if (!menu) {
        menuDisplay.innerHTML = '<div class="menu-no-dish">该日菜单未发布</div>';
        actionArea.innerHTML = '<div class="order-status-no-menu">等待管理员发布菜单</div>';
        return;
    }

    // 显示菜品
    const dishes = menu.dishes || [];
    menuDisplay.innerHTML = dishes.map(d => `<div class="menu-dish">${d}</div>`).join('') +
        (menu.deadline ? `<div class="menu-deadline">截止订餐：${menu.deadline}</div>` : '');

    // 判断是否已截止（今天之前的日期不能订，今天看截止时间）
    const todayStr = today();
    const isPast = selectedDate < todayStr;
    const isToday = selectedDate === todayStr;
    const isClosed = isToday && menu.deadline && now() > menu.deadline;

    // 判断是否已订餐
    const hasOrdered = orders[selectedDate] && orders[selectedDate].includes(currentUser);

    if (hasOrdered) {
        actionArea.innerHTML = `
            <div class="order-btn-area">
                <div class="order-status-ordered">✅ 已订餐</div>
                ${!isPast && !isClosed ? `<button class="btn-cancel-order" id="btn-cancel">取消订餐</button>` : ''}
            </div>`;
        if (!isPast && !isClosed) {
            document.getElementById('btn-cancel').addEventListener('click', () => {
                showConfirm('取消订餐', `确定取消 ${formatDate(selectedDate)} 的订餐吗？`, () => {
                    cancelOrder(selectedDate);
                });
            });
        }
    } else if (isPast) {
        actionArea.innerHTML = '<div class="order-status-closed">📅 已过期</div>';
    } else if (isClosed) {
        actionArea.innerHTML = '<div class="order-status-closed">⏰ 今日订餐已截止</div>';
    } else {
        actionArea.innerHTML = '<button class="btn-order" id="btn-order">立即订餐 ¥5</button>';
        document.getElementById('btn-order').addEventListener('click', () => {
            showConfirm('确认订餐', `确定订 ${formatDate(selectedDate)} 午餐吗？费用 ¥5.00`, () => {
                placeOrder(selectedDate);
            });
        });
    }
}

function placeOrder(date) {
    const orders = DB.getOrders();
    if (!orders[date]) orders[date] = [];
    if (!orders[date].includes(currentUser)) {
        orders[date].push(currentUser);
        DB.saveOrders(orders);
        showToast('✅ 订餐成功！');
        renderWeekCalendar();
        renderSelectedDay();
        renderUserOrders();
    }
}

function cancelOrder(date) {
    const orders = DB.getOrders();
    if (orders[date]) {
        orders[date] = orders[date].filter(n => n !== currentUser);
        DB.saveOrders(orders);
        showToast('已取消订餐');
        renderWeekCalendar();
        renderSelectedDay();
        renderUserOrders();
    }
}

function renderUserOrders() {
    const orders = DB.getOrders();
    const curMonth = today().slice(0, 7);
    const list = document.getElementById('user-order-list');
    const totalEl = document.getElementById('user-month-total');

    // 找出本月所有订餐
    const myOrders = Object.entries(orders)
        .filter(([date, names]) => date.startsWith(curMonth) && names.includes(currentUser))
        .sort((a, b) => b[0].localeCompare(a[0]));

    totalEl.textContent = `共 ${myOrders.length} 次 · ¥${myOrders.length * PRICE}`;

    if (myOrders.length === 0) {
        list.innerHTML = '<div class="empty-tip">本月暂无订餐记录</div>';
        return;
    }

    list.innerHTML = myOrders.map(([date]) => `
        <div class="order-item">
            <span>${formatDate(date)}</span>
            <span class="order-item-price">¥${PRICE}.00</span>
        </div>
    `).join('');
}

// ============ 管理员页面 ============
function setupAdmin() {
    // Tab 切换
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('admin-tab-' + tab.dataset.tab).classList.add('active');
            if (tab.dataset.tab === 'today') renderTodayStats();
            if (tab.dataset.tab === 'monthly') renderMonthly();
        });
    });

    document.getElementById('btn-admin-logout').addEventListener('click', () => {
        isAdmin = false;
        showPage('page-login');
    });

    document.getElementById('btn-publish-menu').addEventListener('click', publishMenu);
    document.getElementById('btn-export-today').addEventListener('click', exportToday);
    document.getElementById('btn-export-monthly').addEventListener('click', exportMonthly);
}

function renderAdminPage() {
    // 设置默认日期
    document.getElementById('menu-date').value = today();
    renderMenuHistory();
    renderTodayStats();
    renderMonthly();
    renderSettleMonths();
}

function publishMenu() {
    const date = document.getElementById('menu-date').value;
    const dishesRaw = document.getElementById('menu-dishes').value.trim();
    const deadline = document.getElementById('menu-deadline').value;

    if (!date) { showToast('请选择日期'); return; }
    if (!dishesRaw) { showToast('请输入菜品'); return; }

    const dishes = dishesRaw.split('\n').map(d => d.trim()).filter(Boolean);
    const menus = DB.getMenus();
    menus[date] = { dishes, deadline, publishedAt: new Date().toISOString() };
    DB.saveMenus(menus);

    showToast('✅ 菜单发布成功！');
    document.getElementById('menu-dishes').value = '';
    renderMenuHistory();
}

function renderMenuHistory() {
    const menus = DB.getMenus();
    const list = document.getElementById('menu-history-list');
    const dates = Object.keys(menus).sort().reverse().slice(0, 10);

    if (dates.length === 0) {
        list.innerHTML = '<div class="empty-tip">暂无历史菜单</div>';
        return;
    }

    list.innerHTML = dates.map(date => {
        const menu = menus[date];
        return `
            <div class="menu-history-item">
                <div class="menu-history-date">${formatDate(date)} ${date === today() ? '<span style="color:var(--primary);font-size:12px;">今日</span>' : ''}</div>
                <div class="menu-history-dishes">${menu.dishes.join('、')} ${menu.deadline ? `· 截止${menu.deadline}` : ''}</div>
            </div>
        `;
    }).join('');
}

function renderTodayStats() {
    const orders = DB.getOrders();
    const todayOrders = orders[today()] || [];
    const count = todayOrders.length;

    document.getElementById('stat-today-count').textContent = count;
    document.getElementById('stat-today-amount').textContent = `¥${count * PRICE}`;

    const listEl = document.getElementById('today-order-list');
    if (count === 0) {
        listEl.innerHTML = '<div class="empty-tip">今日暂无订餐</div>';
        return;
    }

    listEl.innerHTML = `<div class="name-grid">${todayOrders.map(name =>
        `<div class="name-tag">${name}</div>`
    ).join('')}</div>`;
}

function renderSettleMonths() {
    const orders = DB.getOrders();
    const months = [...new Set(Object.keys(orders).map(d => d.slice(0, 7)))].sort().reverse();
    const sel = document.getElementById('settle-month');
    const curMonth = today().slice(0, 7);

    sel.innerHTML = months.length === 0
        ? `<option value="${curMonth}">${curMonth}</option>`
        : months.map(m => `<option value="${m}">${m.replace('-', '年')}月</option>`).join('');

    sel.addEventListener('change', renderMonthly);
}

function renderMonthly() {
    const month = document.getElementById('settle-month').value;
    if (!month) return;

    const orders = DB.getOrders();
    const monthOrders = Object.entries(orders).filter(([date]) => date.startsWith(month));

    // 统计每人订餐次数
    const personMap = {};
    monthOrders.forEach(([date, names]) => {
        names.forEach(name => {
            personMap[name] = (personMap[name] || 0) + 1;
        });
    });

    const persons = Object.entries(personMap).sort((a, b) => b[1] - a[1]);
    const totalCount = persons.reduce((s, [, c]) => s + c, 0);
    const totalAmount = totalCount * PRICE;

    document.getElementById('monthly-total-display').textContent =
        `共 ${totalCount} 份 · ¥${totalAmount}`;

    const listEl = document.getElementById('monthly-list');
    if (persons.length === 0) {
        listEl.innerHTML = '<div class="empty-tip">本月暂无订餐记录</div>';
        return;
    }

    listEl.innerHTML = persons.map(([name, count]) => `
        <div class="monthly-item">
            <span class="monthly-item-name">${name}</span>
            <div class="monthly-item-right">
                <div class="monthly-item-count">${count} 次</div>
                <div class="monthly-item-amount">¥${count * PRICE}</div>
            </div>
        </div>
    `).join('');
}

// ============ 导出 Excel ============
function exportToday() {
    const orders = DB.getOrders();
    const todayOrders = orders[today()] || [];
    if (todayOrders.length === 0) { showToast('今日暂无订餐数据'); return; }

    const data = todayOrders.map((name, i) => ({
        '序号': i + 1,
        '姓名': name,
        '日期': today(),
        '餐次': '午餐',
        '金额': PRICE
    }));
    data.push({ '序号': '', '姓名': '合计', '日期': '', '餐次': `${todayOrders.length}人`, '金额': todayOrders.length * PRICE });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '今日订餐');
    XLSX.writeFile(wb, `今日订餐_${today()}.xlsx`);
    showToast('✅ 导出成功');
}

function exportMonthly() {
    const month = document.getElementById('settle-month').value;
    if (!month) return;

    const orders = DB.getOrders();
    const monthOrders = Object.entries(orders).filter(([date]) => date.startsWith(month));

    if (monthOrders.length === 0) { showToast('本月暂无数据'); return; }

    const wb = XLSX.utils.book_new();

    // Sheet1: 明细
    const detail = [];
    monthOrders.sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, names]) => {
        names.forEach((name, i) => {
            detail.push({ '日期': date, '星期': ['日','一','二','三','四','五','六'][new Date(date+'T00:00:00').getDay()], '姓名': name, '餐次': '午餐', '金额': PRICE });
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), '订餐明细');

    // Sheet2: 汇总
    const personMap = {};
    monthOrders.forEach(([date, names]) => {
        names.forEach(name => { personMap[name] = (personMap[name] || 0) + 1; });
    });
    const summary = Object.entries(personMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count], i) => ({ '序号': i+1, '姓名': name, '订餐次数': count, '应付金额': count * PRICE }));
    const totalCount = Object.values(personMap).reduce((s, c) => s + c, 0);
    summary.push({ '序号': '', '姓名': '合计', '订餐次数': totalCount, '应付金额': totalCount * PRICE });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), '月度汇总');

    XLSX.writeFile(wb, `食堂订餐_${month}.xlsx`);
    showToast('✅ 导出成功');
}
