const http = require('http');
const crypto = require('crypto');

// شبیه‌سازی هش کردن رمز عبور با crypto خودِ نود جی‌اس
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// دیتابیس کاربران
let users = [
    { id: 1, username: 'تست', password: hashPassword('1234'), role: 'employee', fullname: 'کاربر تست' },
    { id: 2, username: 'میترا حاجیان نژاد', password: hashPassword('mitra1368'), role: 'manager1', fullname: 'میترا حاجیان‌نژاد' },
    { id: 3, username: 'محمد معماری پناه', password: hashPassword('53038386'), role: 'manager2', fullname: 'محمد معماری پناه' }
];

let leaves = [];
let nextLeaveId = 4;
let nextUserId = 4;
let activeSessions = {};

const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پوشاک ایرانیان - شعبه سعدی</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
    <style> body { font-family: 'Vazirmatn', sans-serif; } </style>
</head>
<body class="bg-gray-50 text-gray-800">
    <div id="app" class="container mx-auto p-4 max-w-4xl">
        <div id="loginSection" class="max-w-md mx-auto mt-12">
            <!-- لوگوی خوشگل و اختصاصی -->
            <div class="text-center mb-6">
                <div class="inline-block p-4 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-lg text-white mb-3">
                    <svg class="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-black text-gray-800 tracking-wide">پوشاک ایرانیان</h1>
                <span class="inline-block mt-1 text-xs px-3 py-1 bg-blue-100 text-blue-700 font-semibold rounded-full">شعبه سعدی</span>
            </div>

            <div class="bg-white p-8 rounded-2xl shadow-md">
                <h2 class="text-xl font-bold mb-1 text-center text-gray-700">ورود به سیستم مدیریت مرخصی</h2>
                <p class="text-xs text-center text-gray-400 mb-6">لطفاً اطلاعات کاربری خود را وارد کنید</p>
                <div id="loginError" class="hidden bg-red-100 text-red-700 p-3 rounded mb-4 text-sm text-center"></div>
                <form onsubmit="handleLogin(event)">
                    <div class="mb-4">
                        <label class="block mb-2 text-sm font-medium">نام کاربری</label>
                        <input type="text" id="username" class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required>
                    </div>
                    <div class="mb-6">
                        <label class="block mb-2 text-sm font-medium">رمز عبور</label>
                        <input type="password" id="password" class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition font-medium shadow-md">ورود به سیستم</button>
                </form>
            </div>
        </div>

        <div id="dashboardSection" class="hidden mt-6">
            <!-- نوار بالایی داشبورد شامل اطلاعات کاربر، تایمر و دکمه خروج -->
            <div class="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 id="welcomeText" class="text-xl font-bold text-gray-700"></h1>
                    <span id="roleBadge" class="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full"></span>
                </div>
                <div class="flex items-center gap-4">
                    <!-- نمایش تایمر معکوس -->
                    <div class="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                        <svg class="w-4 h-4 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>زمان باقی‌مانده: <strong id="timerDisplay" class="font-mono text-base">02:00</strong></span>
                    </div>
                    <button onclick="logout()" class="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm">خروج امن</button>
                </div>
            </div>

            <!-- نمای اختصاصی پرسنل (فقط ثبت مرخصی و تاریخچه خودش) -->
            <div id="employeeView" class="hidden space-y-6">
                <div class="bg-white p-6 rounded-xl shadow-sm">
                    <h2 class="text-lg font-bold mb-4 text-gray-700">ثبت درخواست مرخصی جدید</h2>
                    <form onsubmit="submitLeave(event)" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block mb-1 text-sm">تاریخ شروع (مثلا 1405/06/02)</label>
                            <input type="text" id="startDate" placeholder="1405/06/02" class="w-full p-2 border rounded-lg text-left dir-ltr" required>
                        </div>
                        <div>
                            <label class="block mb-1 text-sm">تاریخ پایان (مثلا 1405/06/05)</label>
                            <input type="text" id="endDate" placeholder="1405/06/05" class="w-full p-2 border rounded-lg text-left dir-ltr" required>
                        </div>
                        <div class="md:col-span-3">
                            <label class="block mb-1 text-sm">دلیل مرخصی</label>
                            <textarea id="reason" class="w-full p-2 border rounded-lg" rows="2" required></textarea>
                        </div>
                        <button type="submit" class="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition md:col-span-3">ارسال درخواست</button>
                    </form>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm">
                    <h2 class="text-lg font-bold mb-4 text-gray-700">تاریخچه درخواست‌های من</h2>
                    <div id="myLeavesList" class="space-y-3"></div>
                </div>
            </div>

            <!-- نمای اختصاصی مدیران (مدیریت درخواست‌ها، مدیریت کاربران، آمار) -->
            <div id="managerView" class="hidden space-y-6">
                <!-- بخش مدیریت درخواست‌ها -->
                <div class="bg-white p-6 rounded-xl shadow-sm">
                    <h2 class="text-lg font-bold mb-4 text-gray-700">مدیریت درخواست‌های پرسنل</h2>
                    <div id="managerLeavesList" class="space-y-4"></div>
                </div>

                <!-- بخش مدیریت کاربران (فقط برای مدیران) -->
                <div class="bg-white p-6 rounded-xl shadow-sm">
                    <h2 class="text-lg font-bold mb-4 text-gray-700">مدیریت کاربران و پرسنل</h2>
                    <form onsubmit="addUser(event)" class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 bg-gray-50 p-4 rounded-xl border">
                        <div>
                            <label class="block mb-1 text-xs font-medium">نام و نام خانوادگی</label>
                            <input type="text" id="newFullname" class="w-full p-2 border rounded-lg text-sm" placeholder="مثلا علی رضایی" required>
                        </div>
                        <div>
                            <label class="block mb-1 text-xs font-medium">نام کاربری</label>
                            <input type="text" id="newUsername" class="w-full p-2 border rounded-lg text-sm" placeholder="نام کاربری" required>
                        </div>
                        <div>
                            <label class="block mb-1 text-xs font-medium">رمز عبور</label>
                            <input type="password" id="newPassword" class="w-full p-2 border rounded-lg text-sm" placeholder="رمز عبور" required>
                        </div>
                        <div>
                            <label class="block mb-1 text-xs font-medium">نقش کاربر</label>
                            <select id="newRole" class="w-full p-2 border rounded-lg text-sm bg-white">
                                <option value="employee">پرسنل عادی</option>
                                <option value="manager1">مدیر اول</option>
                                <option value="manager2">مدیر دوم</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition text-sm">افزودن کاربر</button>
                        </div>
                    </form>
                    <div class="overflow-x-auto">
                        <table class="w-full text-right border-collapse">
                            <thead>
                                <tr class="border-b bg-gray-50 text-sm">
                                    <th class="p-3">نام کامل</th>
                                    <th class="p-3">نام کاربری</th>
                                    <th class="p-3">نقش سیستم</th>
                                    <th class="p-3">عملیات (ویرایش / حذف)</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody"></tbody>
                        </table>
                    </div>
                </div>

                <!-- آرشیو و آمار مرخصی پرسنل -->
                <div class="bg-white p-6 rounded-xl shadow-sm">
                    <h2 class="text-lg font-bold mb-4 text-gray-700">آرشیو و آمار مرخصی پرسنل</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-right border-collapse">
                            <thead>
                                <tr class="border-b bg-gray-50 text-sm">
                                    <th class="p-3">نام پرسنل</th>
                                    <th class="p-3">کل درخواست‌ها</th>
                                    <th class="p-3">مرخصی‌های تایید شده</th>
                                </tr>
                            </thead>
                            <tbody id="archiveTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- مدال ویرایش کاربر -->
    <div id="editModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white p-6 rounded-2xl max-w-md w-full shadow-lg">
            <h3 class="text-lg font-bold mb-4 text-gray-700">ویرایش اطلاعات کاربر</h3>
            <form onsubmit="updateUser(event)">
                <input type="hidden" id="editUserId">
                <div class="mb-4">
                    <label class="block mb-1 text-sm font-medium">نام کامل</label>
                    <input type="text" id="editFullname" class="w-full p-2 border rounded-lg text-sm" required>
                </div>
                <div class="mb-4">
                    <label class="block mb-1 text-sm font-medium">نام کاربری جدید</label>
                    <input type="text" id="editUsername" class="w-full p-2 border rounded-lg text-sm" required>
                </div>
                <div class="mb-4">
                    <label class="block mb-1 text-sm font-medium">رمز عبور جدید (اختیاری - بازنشانی)</label>
                    <input type="password" id="editPassword" class="w-full p-2 border rounded-lg text-sm" placeholder="اگر تغییر نمی‌دهید خالی بگذارید">
                </div>
                <div class="mb-4">
                    <label class="block mb-1 text-sm font-medium">نقش کاربر</label>
                    <select id="editRole" class="w-full p-2 border rounded-lg text-sm bg-white">
                        <option value="employee">پرسنل عادی</option>
                        <option value="manager1">مدیر اول</option>
                        <option value="manager2">مدیر دوم</option>
                    </select>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="closeEditModal()" class="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">انصراف</button>
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">ذخیره تغییرات</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        let currentUser = null;
        let sessionTimer = null;

        async function handleLogin(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errDiv = document.getElementById('loginError');
            
            errDiv.classList.add('hidden');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                
                if (res.ok) {
                    currentUser = data.user;
                    // استفاده از sessionStorage به جای localStorage تا با بستن صفحه نشست منقضی شود
                    sessionStorage.setItem('token', data.token);
                    sessionStorage.setItem('user', JSON.stringify(data.user));
                    const expireTime = new Date().getTime() + 2 * 60 * 1000;
                    sessionStorage.setItem('sessionExpire', expireTime);
                    
                    initDashboard();
                } else {
                    errDiv.textContent = data.error || 'نام کاربری یا رمز عبور اشتباه است.';
                    errDiv.classList.remove('hidden');
                }
            } catch (err) {
                errDiv.textContent = 'خطا در ارتباط با سرور';
                errDiv.classList.remove('hidden');
            }
        }

        function logout() {
            if (sessionTimer) clearInterval(sessionTimer);
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('sessionExpire');
            currentUser = null;
            document.getElementById('dashboardSection').classList.add('hidden');
            document.getElementById('loginSection').classList.remove('hidden');
        }

        function startTimer() {
            if (sessionTimer) clearInterval(sessionTimer);

            sessionTimer = setInterval(() => {
                const expireTime = sessionStorage.getItem('sessionExpire');
                if (!expireTime) {
                    logout();
                    return;
                }

                const now = new Date().getTime();
                const distance = expireTime - now;

                if (distance <= 0) {
                    clearInterval(sessionTimer);
                    alert('زمان نشست شما به پایان رسید. لطفاً مجدداً وارد شوید.');
                    logout();
                } else {
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    
                    document.getElementById('timerDisplay').textContent = 
                        String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
                }
            }, 1000);
        }

        function initDashboard() {
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('dashboardSection').classList.remove('hidden');
            document.getElementById('welcomeText').textContent = \`خوش آمدید، \${currentUser.fullname}\`;
            const rolesMap = { 'employee': 'پرسنل', 'manager1': 'مدیر اول', 'manager2': 'مدیر دوم' };
            document.getElementById('roleBadge').textContent = rolesMap[currentUser.role];
            
            startTimer();

            if (currentUser.role === 'employee') {
                document.getElementById('managerView').classList.add('hidden');
                document.getElementById('employeeView').classList.remove('hidden');
                loadLeaves();
            } else {
                document.getElementById('employeeView').classList.add('hidden');
                document.getElementById('managerView').classList.remove('hidden');
                loadManagerData();
            }
        }

        async function submitLeave(e) {
            e.preventDefault();
            const token = sessionStorage.getItem('token');
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            const res = await fetch('/api/leaves', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token 
                },
                body: JSON.stringify({ startDate, endDate, reason: document.getElementById('reason').value })
            });
            if (res.ok) {
                document.getElementById('startDate').value = '';
                document.getElementById('endDate').value = '';
                document.getElementById('reason').value = '';
                loadLeaves();
                alert('درخواست با موفقیت ثبت شد.');
            }
        }

        async function loadLeaves() {
            const token = sessionStorage.getItem('token');
            const res = await fetch('/api/leaves', {
                headers: { 'Authorization': token }
            });
            const leaves = await res.json();
            const listDiv = document.getElementById('myLeavesList');
            listDiv.innerHTML = leaves.length === 0 ? '<p class="text-gray-400 text-sm">درخواستی ثبت نشده است.</p>' : '';
            leaves.forEach(l => {
                listDiv.innerHTML += \`
                    <div class="border p-4 rounded-lg flex justify-between items-center text-sm">
                        <div>
                            <p><b>از تاریخ:</b> \${l.start_date} <b>تا تاریخ:</b> \${l.end_date}</p>
                            <p class="text-gray-500 mt-1">دلیل: \${l.reason}</p>
                        </div>
                        <div class="text-left">
                            <span class="block mb-1">مدیر اول: <b class="\${getStatusColor(l.status1)}">\${translateStatus(l.status1)}</b></span>
                            <span class="block mb-1">مدیر دوم: <b class="\${getStatusColor(l.status2)}">\${translateStatus(l.status2)}</b></span>
                            <span class="text-xs block mt-2 font-bold">وضعیت نهایی: <span class="\${getStatusColor(l.final_status)}">\${translateStatus(l.final_status)}</span></span>
                        </div>
                    </div>\`;
            });
        }

        async function loadManagerData() {
            const token = sessionStorage.getItem('token');
            const res = await fetch('/api/leaves', {
                headers: { 'Authorization': token }
            });
            const leaves = await res.json();
            const listDiv = document.getElementById('managerLeavesList');
            listDiv.innerHTML = leaves.length === 0 ? '<p class="text-gray-400 text-sm">درخواستی وجود ندارد.</p>' : '';
            
            leaves.forEach(l => {
                let actionButtons = '';
                if ((currentUser.role === 'manager1' && l.status1 === 'pending' && l.final_status === 'pending') ||
                    (currentUser.role === 'manager2' && l.status2 === 'pending' && l.final_status === 'pending')) {
                    actionButtons = \`
                        <button onclick="takeAction(\${l.id}, 'approved')" class="bg-green-500 text-white px-3 py-1 rounded text-xs ml-2">تایید</button>
                        <button onclick="takeAction(\${l.id}, 'rejected')" class="bg-red-500 text-white px-3 py-1 rounded text-xs">رد</button>\`;
                } else {
                    actionButtons = \`<span class="text-xs text-gray-400">اقدام شده / غیرقابل تغییر</span>\`;
                }
                listDiv.innerHTML += \`
                    <div class="border p-4 rounded-lg flex justify-between items-center text-sm">
                        <div>
                            <p><b>پرسنل:</b> \${l.fullname}</p>
                            <p><b>از تاریخ:</b> \${l.start_date} <b>تا تاریخ:</b> \${l.end_date}</p>
                            <p class="text-gray-500 mt-1">دلیل: \${l.reason}</p>
                        </div>
                        <div class="text-left">
                            <div class="mb-2">
                                <span class="text-xs">مدیر ۱: <b class="\${getStatusColor(l.status1)}">\${translateStatus(l.status1)}</b></span> | 
                                <span class="text-xs">مدیر ۲: <b class="\${getStatusColor(l.status2)}">\${translateStatus(l.status2)}</b></span>
                            </div>
                            <div class="mb-2">وضعیت نهایی: <b class="\${getStatusColor(l.final_status)}">\${translateStatus(l.final_status)}</b></div>
                            <div>\${actionButtons}</div>
                        </div>
                    </div>\`;
            });

            loadUsersList(token);

            const archiveRes = await fetch('/api/archive', {
                headers: { 'Authorization': token }
            });
            const archiveData = await archiveRes.json();
            const archiveBody = document.getElementById('archiveTableBody');
            archiveBody.innerHTML = '';
            archiveData.forEach(row => {
                archiveBody.innerHTML += \`
                    <tr class="border-b text-sm">
                        <td class="p-3">\${row.fullname}</td>
                        <td class="p-3">\${row.total_requests || 0}</td>
                        <td class="p-3 font-bold text-green-600">\${row.approved_count || 0}</td>
                    </tr>\`;
            });
        }

        async function loadUsersList(token) {
            const res = await fetch('/api/users', { headers: { 'Authorization': token } });
            if (!res.ok) return;
            const users = await res.json();
            const tableBody = document.getElementById('usersTableBody');
            tableBody.innerHTML = '';
            users.forEach(u => {
                const roleLabels = { 'employee': 'پرسنل عادی', 'manager1': 'مدیر اول', 'manager2': 'مدیر دوم' };
                let deleteBtn = u.id !== currentUser.id ? 
                    \`<button onclick="deleteUser(\${u.id})" class="bg-red-50 text-red-600 px-3 py-1 rounded text-xs hover:bg-red-100">حذف</button>\` : 
                    \`<span class="text-xs text-gray-400">حساب خودتان</span>\`;

                tableBody.innerHTML += \`
                    <tr class="border-b text-sm">
                        <td class="p-3">\${u.fullname}</td>
                        <td class="p-3">\${u.username}</td>
                        <td class="p-3"><span class="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">\${roleLabels[u.role]}</span></td>
                        <td class="p-3">
                            <div class="flex gap-2">
                                <button onclick="openEditModal(\${u.id}, '\${u.fullname}', '\${u.username}', '\${u.role}')" class="bg-amber-50 text-amber-700 px-3 py-1 rounded text-xs hover:bg-amber-100">ویرایش</button>
                                \${deleteBtn}
                            </div>
                        </td>
                    </tr>\`;
            });
        }

        function openEditModal(id, fullname, username, role) {
            document.getElementById('editUserId').value = id;
            document.getElementById('editFullname').value = fullname;
            document.getElementById('editUsername').value = username;
            document.getElementById('editPassword').value = '';
            document.getElementById('editRole').value = role;
            document.getElementById('editModal').classList.remove('hidden');
        }

        function closeEditModal() {
            document.getElementById('editModal').classList.add('hidden');
        }

        async function updateUser(e) {
            e.preventDefault();
            const token = sessionStorage.getItem('token');
            const id = document.getElementById('editUserId').value;
            const fullname = document.getElementById('editFullname').value;
            const username = document.getElementById('editUsername').value;
            const password = document.getElementById('editPassword').value;
            const role = document.getElementById('editRole').value;

            const res = await fetch(\`/api/users/\${id}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ fullname, username, password, role })
            });

            if (res.ok) {
                closeEditModal();
                loadManagerData();
                alert('اطلاعات کاربر با موفقیت بروزرسانی شد.');
            } else {
                const data = await res.json();
                alert(data.error || 'خطا در ویرایش اطلاعات');
            }
        }

        async function addUser(e) {
            e.preventDefault();
            const token = sessionStorage.getItem('token');
            const fullname = document.getElementById('newFullname').value;
            const username = document.getElementById('newUsername').value;
            const password = document.getElementById('newPassword').value;
            const role = document.getElementById('newRole').value;

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ fullname, username, password, role })
            });

            if (res.ok) {
                document.getElementById('newFullname').value = '';
                document.getElementById('newUsername').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('newRole').value = 'employee';
                loadManagerData();
                alert('کاربر جدید با موفقیت اضافه شد.');
            } else {
                const data = await res.json();
                alert(data.error || 'خطا در افزودن کاربر');
            }
        }

        async function deleteUser(userId) {
            if (!confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
            const token = sessionStorage.getItem('token');
            const res = await fetch(\`/api/users/\${userId}\`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });

            if (res.ok) {
                loadManagerData();
                alert('کاربر با موفقیت حذف شد.');
            } else {
                const data = await res.json();
                alert(data.error || 'خطا در حذف کاربر');
            }
        }

        async function takeAction(leaveId, action) {
            const token = sessionStorage.getItem('token');
            const res = await fetch('/api/leaves/action', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({ leaveId, action })
            });
            if (res.ok) loadManagerData();
            else { const d = await res.json(); alert(d.error); }
        }

        function getStatusColor(s) { return s === 'approved' ? 'text-green-600' : s === 'rejected' ? 'text-red-600' : 'text-yellow-600'; }
        function translateStatus(s) { return s === 'approved' ? 'تایید شده' : s === 'rejected' ? 'رد شده' : 'در انتظار'; }

        window.onload = () => {
            const savedUser = sessionStorage.getItem('user');
            const token = sessionStorage.getItem('token');
            const expireTime = sessionStorage.getItem('sessionExpire');

            if (savedUser && token && expireTime) {
                const now = new Date().getTime();
                if (now < parseInt(expireTime)) {
                    currentUser = JSON.parse(savedUser);
                    initDashboard();
                } else {
                    logout();
                }
            }
        };
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const authenticate = (req) => {
        const token = req.headers['authorization'];
        const userId = activeSessions[token];
        return users.find(u => u.id === userId);
    };

    if (req.method === 'POST' && req.url === '/api/login') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { username, password } = JSON.parse(body);
                const hashedPwd = hashPassword(password);
                const user = users.find(u => u.username === username && u.password === hashedPwd);
                
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'نام کاربری یا رمز عبور اشتباه است.' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    const token = crypto.randomBytes(32).toString('hex');
                    activeSessions[token] = user.id;
                    const safeUser = { id: user.id, username: user.username, role: user.role, fullname: user.fullname };
                    res.end(JSON.stringify({ token, user: safeUser }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'خطای درخواست' }));
            }
        });
    } else if (req.method === 'GET' && req.url === '/api/users') {
        const user = authenticate(req);
        if (!user || (user.role !== 'manager1' && user.role !== 'manager2')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'دسترسی غیرمجاز' }));
            return;
        }
        const safeUsers = users.map(u => ({ id: u.id, username: u.username, fullname: u.fullname, role: u.role }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(safeUsers));
    } else if (req.method === 'POST' && req.url === '/api/users') {
        const user = authenticate(req);
        if (!user || (user.role !== 'manager1' && user.role !== 'manager2')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'دسترسی غیرمجاز' }));
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { fullname, username, password, role } = JSON.parse(body);
                if (users.some(u => u.username === username)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'این نام کاربری قبلاً ثبت شده است.' }));
                    return;
                }
                users.push({
                    id: nextUserId++,
                    username,
                    password: hashPassword(password),
                    role: role && ['employee', 'manager1', 'manager2'].includes(role) ? role : 'employee',
                    fullname
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'کاربر با موفقیت اضافه شد' }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'خطای درخواست' }));
            }
        });
    } else if (req.method === 'PUT' && req.url.startsWith('/api/users/')) {
        const user = authenticate(req);
        if (!user || (user.role !== 'manager1' && user.role !== 'manager2')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'دسترسی غیرمجاز' }));
            return;
        }
        const targetId = Number(req.url.split('/')[3]);
        const targetUser = users.find(u => u.id === targetId);

        if (!targetUser) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'کاربر یافت نشد.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { fullname, username, password, role } = JSON.parse(body);
                if (users.some(u => u.username === username && u.id !== targetId)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'این نام کاربری توسط شخص دیگری استفاده می‌شود.' }));
                    return;
                }

                targetUser.fullname = fullname;
                targetUser.username = username;
                if (role && ['employee', 'manager1', 'manager2'].includes(role)) {
                    targetUser.role = role;
                }
                if (password && password.trim() !== '') {
                    targetUser.password = hashPassword(password);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'بروزرسانی با موفقیت انجام شد' }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'خطا در ویرایش' }));
            }
        });
    } else if (req.method === 'DELETE' && req.url.startsWith('/api/users/')) {
        const user = authenticate(req);
        if (!user || (user.role !== 'manager1' && user.role !== 'manager2')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'دسترسی غیرمجاز' }));
            return;
        }
        const targetId = Number(req.url.split('/')[3]);
        
        if (targetId === user.id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'امکان حذف حساب کاربری خودتان وجود ندارد.' }));
            return;
        }

        users = users.filter(u => u.id !== targetId);
        leaves = leaves.filter(l => l.user_id !== targetId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'کاربر حذف شد' }));
    } else if (req.method === 'POST' && req.url === '/api/leaves') {
        const user = authenticate(req);
        if (!user || user.role !== 'employee') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'دسترسی غیرمجاز' }));
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { startDate, endDate, reason } = JSON.parse(body);
            leaves.push({
                id: nextLeaveId++,
                user_id: user.id,
                start_date: startDate,
                end_date: endDate,
                reason: reason,
                status1: 'pending',
                status2: 'pending',
                final_status: 'pending'
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'با موفقیت ثبت شد' }));
        });
    } else if (req.method === 'GET' && req.url.startsWith('/api/leaves')) {
        const user = authenticate(req);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'لطفا وارد شوید' }));
            return;
        }
        
        let result = leaves.map(l => {
            const u = users.find(user => user.id === l.user_id);
            return { ...l, fullname: u ? u.fullname : 'ناشناس' };
        });

        if (user.role === 'employee') {
            result = result.filter(l => l.user_id === user.id);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    } else if (req.method === 'POST' && req.url === '/api/leaves/action') {
        const user = authenticate(req);
        if (!user || (user.role !== 'manager1' && user.role !== 'manager2')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'شما دسترسی مدیریتی ندارید' }));
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { leaveId, action } = JSON.parse(body);
            const leave = leaves.find(l => l.id === Number(leaveId));

            if (!leave) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'یافت نشد' }));
                return;
            }

            if (user.role === 'manager1') {
                leave.status1 = action;
                if (action === 'rejected') leave.final_status = 'rejected';
            } else if (user.role === 'manager2') {
                if (leave.status1 !== 'approved') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'مدیر اول هنوز تایید نکرده است.' }));
                    return;
                }
                leave.status2 = action;
                if (action === 'rejected') leave.final_status = 'rejected';
                else if (action === 'approved' && leave.status1 === 'approved') leave.final_status = 'approved';
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'بروزرسانی شد' }));
        });
    } else if (req.method === 'GET' && req.url === '/api/archive') {
        const user = authenticate(req);
        if (!user || (user.role !== 'manager1' && user.role !== 'manager2')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'دسترسی غیرمجاز' }));
            return;
        }
        const employeeList = users.filter(u => u.role === 'employee').map(emp => {
            const empLeaves = leaves.filter(l => l.user_id === emp.id);
            const approvedCount = empLeaves.filter(l => l.final_status === 'approved').length;
            return {
                fullname: emp.fullname,
                total_requests: empLeaves.length,
                approved_count: approvedCount
            };
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(employeeList));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Secure Server is running on port ${PORT}`);
});
