const http = require('http');
const crypto = require('crypto');

// شبیه‌سازی هش کردن رمز عبور با crypto خودِ نود جی‌اس (بدون نیاز به نصب پکیج خارجی!)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// دیتابیس اولیه با رمزهای هش شده (رمز همه: 1234)
let users = [
    { id: 1, username: 'emp1', password: hashPassword('1234'), role: 'employee', fullname: 'علی احمدی' },
    { id: 2, username: 'mgr1', password: hashPassword('1234'), role: 'manager1', fullname: 'مدیر اول (خانم حاجیان)' },
    { id: 3, username: 'mgr2', password: hashPassword('1234'), role: 'manager2', fullname: 'مدیر دوم (آقای معماری پناه)' }
];

let leaves = [];
let nextLeaveId = 1;

// ساخت توکن ساده و امن برای نشست (Session Token)
let activeSessions = {}; // token -> userId

const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سیستم مدیریت مرخصی - امن</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
    <style> body { font-family: 'Vazirmatn', sans-serif; } </style>
</head>
<body class="bg-gray-50 text-gray-800">
    <div id="app" class="container mx-auto p-4 max-w-4xl">
        <div id="loginSection" class="bg-white p-8 rounded-2xl shadow-md max-w-md mx-auto mt-20">
            <h2 class="text-2xl font-bold mb-2 text-center text-blue-600">ورود به سیستم مرخصی</h2>
            <p class="text-xs text-center text-red-500 mb-6">🔒 مجهز به لایه امنیتی و احراز هویت توکنی</p>
            <div id="loginError" class="hidden bg-red-100 text-red-700 p-3 rounded mb-4 text-sm"></div>
            <form onsubmit="handleLogin(event)">
                <div class="mb-4">
                    <label class="block mb-2 text-sm font-medium">نام کاربری</label>
                    <input type="text" id="username" class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required>
                </div>
                <div class="mb-6">
                    <label class="block mb-2 text-sm font-medium">رمز عبور</label>
                    <input type="password" id="password" class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" required>
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition">ورود امن</button>
            </form>
        </div>

        <div id="dashboardSection" class="hidden">
            <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center mb-6">
                <div>
                    <h1 id="welcomeText" class="text-xl font-bold text-gray-700"></h1>
                    <span id="roleBadge" class="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full"></span>
                </div>
                <button onclick="logout()" class="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition text-sm">خروج امن</button>
            </div>

            <div id="employeeView" class="hidden space-y-6">
                <div class="bg-white p-6 rounded-xl shadow-sm">
                    <h2 class="text-lg font-bold mb-4 text-gray-700">ثبت درخواست مرخصی جدید</h2>
                    <form onsubmit="submitLeave(event)" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block mb-1 text-sm">تاریخ شروع</label>
                            <input type="date" id="startDate" class="w-full p-2 border rounded-lg" required>
                        </div>
                        <div>
                            <label class="block mb-1 text-sm">تاریخ پایان</label>
                            <input type="date" id="endDate" class="w-full p-2 border rounded-lg" required>
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

            <div id="managerView" class="hidden space-y-6">
                <div class="bg-white p-6 rounded-xl shadow-sm">
                    <h2 class="text-lg font-bold mb-4 text-gray-700">مدیریت درخواست‌های پرسنل</h2>
                    <div id="managerLeavesList" class="space-y-4"></div>
                </div>
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

    <script>
        let currentUser = null;

        async function handleLogin(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                currentUser = data.user;
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                initDashboard();
            } else {
                const errDiv = document.getElementById('loginError');
                errDiv.textContent = data.error;
                errDiv.classList.remove('hidden');
            }
        }

        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            currentUser = null;
            document.getElementById('dashboardSection').classList.add('hidden');
            document.getElementById('loginSection').classList.remove('hidden');
        }

        function initDashboard() {
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('dashboardSection').classList.remove('hidden');
            document.getElementById('welcomeText').textContent = \`خوش آمدید، \${currentUser.fullname}\`;
            const rolesMap = { 'employee': 'پرسنل', 'manager1': 'مدیر اول', 'manager2': 'مدیر دوم' };
            document.getElementById('roleBadge').textContent = rolesMap[currentUser.role];
            if (currentUser.role === 'employee') {
                document.getElementById('employeeView').classList.remove('hidden');
                loadLeaves();
            } else {
                document.getElementById('managerView').classList.remove('hidden');
                loadManagerData();
            }
        }

        async function submitLeave(e) {
            e.preventDefault();
            const token = localStorage.getItem('token');
            const res = await fetch('/api/leaves', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token 
                },
                body: JSON.stringify({
                    startDate: document.getElementById('startDate').value,
                    endDate: document.getElementById('endDate').value,
                    reason: document.getElementById('reason').value
                })
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
            const token = localStorage.getItem('token');
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
                            <p><b>از:</b> \${l.start_date} تا \${l.end_date}</p>
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
            const token = localStorage.getItem('token');
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
                            <p><b>از:</b> \${l.start_date} تا \${l.end_date}</p>
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

        async function takeAction(leaveId, action) {
            const token = localStorage.getItem('token');
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
            const savedUser = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            if (savedUser && token) { 
                currentUser = JSON.parse(savedUser); 
                initDashboard(); 
            }
        };
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    // تابع کمکی برای احراز هویت از طریق توکن هدر
    const authenticate = (req) => {
        const token = req.headers['authorization'];
        const userId = activeSessions[token];
        return users.find(u => u.id === userId);
    };

    if (req.method === 'POST' && req.url === '/api/login') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { username, password } = JSON.parse(body);
            const hashedPwd = hashPassword(password);
            const user = users.find(u => u.username === username && u.password === hashedPwd);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            if (!user) {
                res.end(JSON.stringify({ error: 'نام کاربری یا رمز عبور اشتباه است.' }));
            } else {
                // تولید توکن امن تصادفی برای کاربر
                const token = crypto.randomBytes(32).toString('hex');
                activeSessions[token] = user.id;
                
                // اطلاعات حساس مثل رمز عبور را به کلاینت نمی فرستیم
                const safeUser = { id: user.id, username: user.username, role: user.role, fullname: user.fullname };
                res.end(JSON.stringify({ token, user: safeUser }));
            }
        });
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
