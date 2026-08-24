const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// حافظه موقت برای ذخیره کاربران و مرخصی‌ها
let users = [
    { id: 1, username: 'admin', password: '123', role: 'admin', name: 'مدیر کل' },
    { id: 2, username: 'user1', password: '123', role: 'employee', name: 'علی احمدی' }
];

let leaves = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'secret-key-123',
    resave: false,
    saveUninitialized: true
}));

// صفحه لاگین
app.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin.html');
        } else {
            return res.redirect('/employee.html');
        }
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ورود به سیستم
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        req.session.user = user;
        res.json({ success: true, role: user.role });
    } else {
        res.status(401).json({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' });
    }
});

// دریافت اطلاعات کاربر فعلی
app.get('/api/current-user', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'وارد نشده‌اید' });
    }
});

// خروج از سیستم
app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ثبت درخواست مرخصی
app.post('/api/leaves', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'دسترسی غیرمجاز' });

    const { startDate, endDate, reason } = req.body;
    const newLeave = {
        id: leaves.length + 1,
        userId: req.session.user.id,
        userName: req.session.user.name,
        startDate,
        endDate,
        reason,
        status: 'در انتظار تایید'
    };
    leaves.push(newLeave);
    res.json({ success: true, message: 'مرخصی با موفقیت ثبت شد' });
});

// دریافت لیست مرخصی‌ها
app.get('/api/leaves', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'دسترسی غیرمجاز' });

    if (req.session.user.role === 'admin') {
        res.json(leaves);
    } else {
        const userLeaves = leaves.filter(l => l.userId === req.session.user.id);
        res.json(userLeaves);
    }
});

// تایید یا رد مرخصی توسط مدیر
app.post('/api/leaves/:id/status', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    const leaveId = parseInt(req.params.id);
    const { status } = req.body;
    const leave = leaves.find(l => l.id === leaveId);

    if (leave) {
        leave.status = status;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'مرخصی پیدا نشد' });
    }
});

// افزودن کاربر جدید توسط مدیر
app.post('/api/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }

    const { username, password, name, role } = req.body;
    const exists = users.find(u => u.username === username);
    if (exists) {
        return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است' });
    }

    const newUser = {
        id: users.length + 1,
        username,
        password,
        name,
        role: role || 'employee'
    };
    users.push(newUser);
    res.json({ success: true, message: 'کاربر با موفقیت اضافه شد' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
