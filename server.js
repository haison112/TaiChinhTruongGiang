const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const Database = require('better-sqlite3');
const ExcelJS = require('exceljs');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || (!isProduction ? 'dev_session_secret_change_me' : null);

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required in production.');
}

if (isProduction) {
  app.set('trust proxy', 1);
}

// Set up database
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const db = new Database(path.join(dbDir, 'database.db'));
const SqliteStore = require('better-sqlite3-session-store')(session);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'mới',
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS content (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

function isHashedPassword(password) {
  return typeof password === 'string' && password.startsWith('$2');
}

function ensureAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME || (!isProduction ? 'admin123' : null);
  const adminPassword = process.env.ADMIN_PASSWORD || (!isProduction ? 'admin123' : null);

  if (!adminUsername || !adminPassword) {
    return;
  }

  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(adminUsername);
  if (!existing) {
    const passwordHash = bcrypt.hashSync(adminPassword, 12);
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(adminUsername, passwordHash);
  } else if (!isProduction && !isHashedPassword(existing.password)) {
    const passwordHash = bcrypt.hashSync(existing.password, 12);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(passwordHash, existing.id);
  }
}

ensureAdminUser();

// Default content
const defaultContent = {
  brandName: 'Trường Giang',
  brandColor: '#4B5563',
  heroHeadline: 'Giao dịch Forex và tiếp cận tài khoản cấp vốn trên một hệ sinh thái minh bạch',
  heroSubheadline: 'Trải nghiệm điều kiện giao dịch cạnh tranh, công nghệ khớp lệnh nhanh, chương trình đánh giá trader rõ ràng và hệ thống hỗ trợ được thiết kế cho nhà giao dịch nghiêm túc.',
  heroCta1: 'Bắt đầu giao dịch',
  heroCta2: 'Khám phá chương trình cấp vốn',
  heroImage: '',
  bannerTitle: 'Tải xuống ứng dụng được đánh giá cao của chúng tôi',
  bannerImage: '',
  benefitCards: JSON.stringify([
    { title: 'Không hoa hồng', description: 'Minh bạch chi phí giao dịch.' },
    { title: 'Không báo giá lại', description: 'Điều kiện giao dịch rõ ràng.' },
    { title: 'Khớp lệnh nhanh', description: 'Hạ tầng tối ưu cho trader.' }
  ]),
  processCards: JSON.stringify([
    { title: 'Đăng ký', description: 'Mở tài khoản dễ dàng.' },
    { title: 'Nạp tiền', description: 'Nạp và rút nhanh chóng với đại diện thanh toán địa phương.' },
    { title: 'Giao dịch', description: 'Tham gia cộng đồng trader và theo dõi hiệu suất.' }
  ]),
  faqItems: JSON.stringify([
    { question: 'Forex Broker và Prop Firm khác nhau thế nào?', answer: 'Forex Broker cung cấp môi trường giao dịch, còn Prop Firm cung cấp chương trình đánh giá và cấp vốn theo điều kiện.' },
    { question: 'Giao dịch tài chính có rủi ro không?', answer: 'Có. Forex, CFD và sản phẩm phái sinh có rủi ro cao và không phù hợp với mọi nhà đầu tư.' }
  ]),
  footerBrand: 'Trường Giang',
  footerDisclaimer: 'Giao dịch ngoại hối, CFD và các sản phẩm phái sinh có mức độ rủi ro cao và có thể không phù hợp với mọi nhà đầu tư. Nội dung trên website chỉ nhằm mục đích cung cấp thông tin, không phải lời khuyên đầu tư, không cam kết lợi nhuận và không đảm bảo kết quả giao dịch trong tương lai.',
  zaloUrl: 'https://zalo.me/yourzalo',
  phoneNumber: '19001234'
};

const insertContent = db.prepare('INSERT OR IGNORE INTO content (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultContent)) {
  insertContent.run(key, value);
}

// Express Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  store: new SqliteStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 15 * 60 * 1000
    }
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Multer for file uploads
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const allowedImageTypes = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + allowedImageTypes[file.mimetype])
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (!allowedImageTypes[file.mimetype]) {
      return cb(new Error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.'));
    }
    cb(null, true);
  }
});

// Helper to get all content
function getAllContent() {
  const rows = db.prepare('SELECT key, value FROM content').all();
  const content = {};
  for (const row of rows) {
    content[row.key] = row.value;
  }
  return content;
}

function parseJsonContent(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    return fallback;
  }
}

function normalizeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function isValidPhone(phone) {
  return /^[0-9+\-\s().]{8,20}$/.test(phone);
}

// Authentication Middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// ================= ROUTES =================

// Frontend
app.get('/', (req, res) => {
  const content = getAllContent();
  res.render('index', {
    content,
    benefitCards: parseJsonContent(content.benefitCards, JSON.parse(defaultContent.benefitCards)),
    processCards: parseJsonContent(content.processCards, JSON.parse(defaultContent.processCards)),
    faqItems: parseJsonContent(content.faqItems, JSON.parse(defaultContent.faqItems))
  });
});

// Admin Authentication
app.get('/login', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/admin');
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  let isValidUser = false;

  if (user && isHashedPassword(user.password)) {
    isValidUser = bcrypt.compareSync(password || '', user.password);
  } else if (user && !isProduction && user.password === password) {
    const passwordHash = bcrypt.hashSync(password, 12);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(passwordHash, user.id);
    isValidUser = true;
  }

  if (isValidUser) {
    req.session.user = { id: user.id, username: user.username };
    res.redirect('/admin');
  } else {
    res.render('login', { error: 'Sai tài khoản hoặc mật khẩu' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Admin Dashboard
app.get('/admin', isAuthenticated, (req, res) => {
  res.render('admin', { content: getAllContent() });
});

// API: Contact Form
app.post('/api/contact', (req, res) => {
  const name = normalizeText(req.body.name, 100);
  const phone = normalizeText(req.body.phone, 20);
  const message = normalizeText(req.body.message, 1000);

  if (!name || !phone || !message) {
    return res.status(400).json({ success: false, error: 'Vui lòng điền đủ thông tin' });
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({ success: false, error: 'Số điện thoại không hợp lệ' });
  }

  try {
    const stmt = db.prepare('INSERT INTO leads (name, phone, message) VALUES (?, ?, ?)');
    stmt.run(name, phone, message);
    res.json({ success: true, message: 'Gửi thông tin thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi server' });
  }
});

// API: Admin Leads
app.get('/api/admin/leads', isAuthenticated, (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.json({ success: true, data: leads });
});

app.patch('/api/admin/leads/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;
  const { status, note } = req.body;

  try {
    const stmt = db.prepare('UPDATE leads SET status = COALESCE(?, status), note = COALESCE(?, note) WHERE id = ?');
    stmt.run(status, note, id);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi cập nhật' });
  }
});

app.delete('/api/admin/leads/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;
  try {
    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi xóa' });
  }
});

app.get('/api/admin/leads/export', isAuthenticated, async (req, res) => {
  try {
    const leads = db.prepare('SELECT id, name, phone, message, status, note, created_at FROM leads ORDER BY created_at DESC').all();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads');
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Họ tên', key: 'name', width: 28 },
      { header: 'Số điện thoại', key: 'phone', width: 18 },
      { header: 'Nội dung', key: 'message', width: 45 },
      { header: 'Trạng thái', key: 'status', width: 18 },
      { header: 'Ghi chú', key: 'note', width: 35 },
      { header: 'Ngày gửi', key: 'created_at', width: 24 }
    ];
    worksheet.addRows(leads);
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', 'attachment; filename="leads.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).send('Lỗi xuất file');
  }
});

// API: Admin Content
app.put('/api/admin/content', isAuthenticated, (req, res) => {
  const data = req.body;
  try {
    const stmt = db.prepare('UPDATE content SET value = ? WHERE key = ?');
    const insertStmt = db.prepare('INSERT OR IGNORE INTO content (key, value) VALUES (?, ?)');

    const transaction = db.transaction((updates) => {
      for (const [key, value] of Object.entries(updates)) {
        insertStmt.run(key, ''); // Ensures row exists
        stmt.run(value, key);
      }
    });

    transaction(data);
    res.json({ success: true, message: 'Cập nhật nội dung thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi cập nhật nội dung' });
  }
});

app.post('/api/admin/upload', isAuthenticated, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh tối đa 2MB' : err.message;
      return res.status(400).json({ success: false, error: message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Chưa chọn file' });
    }

    const imageUrl = '/uploads/' + req.file.filename;
    res.json({ success: true, imageUrl: imageUrl });
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
