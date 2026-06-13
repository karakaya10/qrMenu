import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Veritabanı ───────────────────────────────────────────────────────
let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  seed();
  return db;
}

function seed() {
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort_order INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL,
    name TEXT NOT NULL, description TEXT DEFAULT '', price INTEGER NOT NULL,
    image TEXT DEFAULT '', is_available INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, name TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, table_no INTEGER DEFAULT 0, items TEXT NOT NULL,
    total INTEGER NOT NULL, status TEXT DEFAULT 'pending',
    split_count INTEGER DEFAULT 1, payment_method TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL,
    role TEXT NOT NULL, content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  if (!get('SELECT id FROM admins WHERE username = ?', ['admin'])) {
    const hash = bcrypt.hashSync('admin123', 10);
    run('INSERT INTO admins (username, password, name) VALUES (?,?,?)', ['admin', hash, 'Admin User']);
  }

  if (!get('SELECT id FROM categories WHERE id = 1')) {
    run('INSERT INTO categories (id,name,sort_order) VALUES (?,?,?)', [1,'Kahveler',1]);
    run('INSERT INTO categories (id,name,sort_order) VALUES (?,?,?)', [2,'Tatlılar',2]);
    run('INSERT INTO categories (id,name,sort_order) VALUES (?,?,?)', [3,'İçecekler',3]);
    run('INSERT INTO categories (id,name,sort_order) VALUES (?,?,?)', [4,'Atıştırmalıklar',4]);
    run('INSERT INTO categories (id,name,sort_order) VALUES (?,?,?)', [5,'Kahvaltı',5]);

    const prods = [
      [1,1,'Latte Macchiato','Süt köpüğü ile hazırlanan klasik İtalyan kahvesi',120],
      [2,1,'Cortado','Eşit oranda espresso ve süt',110],
      [3,1,'Filter Kahve','Yavaş demleme yöntemi ile hazırlanır',95],
      [4,1,'Espresso','Yoğun aromalı klasik espresso',80],
      [5,1,'Mocha','Çikolata ve espresso muhteşem uyumu',130],
      [6,2,'San Sebastian','Kremamsı İspanyol peynirli kek',165],
      [7,2,'Tiramisu','İtalyan usulü kahveli pasta',140],
      [8,2,'Cheesecake','New York usulü krem peynirli kek',145],
      [9,3,'Limonata','Taze sıkım limonata',75],
      [10,3,'Portakal Suyu','Taze sıkım portakal suyu',85],
      [11,3,'Ayran','Geleneksel yoğurt içeceği',45],
      [12,4,'Patates Kızartması','Çıtır çıtır altın sarısı',95],
      [13,4,'Soğan Halkası','Pane kaplama çıtır soğan halkaları',85],
      [14,5,'Serpme Kahvaltı','Zengin serpme kahvaltı tabağı',250],
      [15,5,'Menemen','Yumurta, domates ve biber ile',120],
    ];
    for (const [id,cat,name,desc,price] of prods) {
      run('INSERT INTO products (id,category_id,name,description,price) VALUES (?,?,?,?,?)', [id,cat,name,desc,price]);
    }
  }
}

function run(sql, params = []) {
  if (!db) throw new Error('DB not initialized');
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  stmt.step();
  stmt.free();
}

function get(sql, params = []) {
  if (!db) return;
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  if (stmt.step()) { const r = stmt.getAsObject(); stmt.free(); return r; }
  stmt.free();
}

function all(sql, params = []) {
  if (!db) return [];
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ─── Middleware ────────────────────────────────────────────────────────
const adminAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  try {
    req.adminId = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'qr-menu-default-secret').id;
    next();
  } catch { res.status(401).json({ error: 'Geçersiz token' }); }
};

// ─── Health / Ping (DB gerektirmez) ──────────────────────────────────
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', message: 'API çalışıyor', timestamp: new Date().toISOString() });
});

app.get('/api/health', async (req, res) => {
  try {
    await getDb();
    const catCount = all('SELECT COUNT(*) as count FROM categories')[0]?.count || 0;
    res.json({ status: 'ok', db: 'connected', categories: catCount });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Routes ────────────────────────────────────────────────────────────

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
  const admin = get('SELECT * FROM admins WHERE username = ?', [username]);
  if (!admin || !bcrypt.compareSync(password, admin.password))
    return res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    process.env.JWT_SECRET || 'qr-menu-default-secret',
    { expiresIn: '24h' }
  );
  res.json({ token, admin: { id: admin.id, username: admin.username, name: admin.name } });
});

// Products
app.get('/api/products', (req, res) => {
  const categories = all('SELECT * FROM categories ORDER BY sort_order');
  const products = all('SELECT * FROM products WHERE is_available = 1');
  res.json(categories.map(c => ({ ...c, products: products.filter(p => p.category_id === c.id) })));
});

app.get('/api/products/all', adminAuth, (req, res) => {
  const categories = all('SELECT * FROM categories ORDER BY sort_order');
  const products = all('SELECT * FROM products ORDER BY category_id');
  res.json(categories.map(c => ({ ...c, products: products.filter(p => p.category_id === c.id) })));
});

app.get('/api/products/:id', (req, res) => {
  const p = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json(p);
});

app.post('/api/products', adminAuth, (req, res) => {
  const { category_id, name, description, price, image } = req.body;
  if (!category_id || !name || !price) return res.status(400).json({ error: 'Kategori, isim ve fiyat gerekli' });
  run('INSERT INTO products (category_id,name,description,price,image) VALUES (?,?,?,?,?)',
    [category_id, name, description || '', price, image || '']);
  res.status(201).json(get('SELECT * FROM products ORDER BY id DESC LIMIT 1'));
});

app.put('/api/products/:id', adminAuth, (req, res) => {
  const p = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Ürün bulunamadı' });
  const { name, description, price, image, category_id, is_available } = req.body;
  run('UPDATE products SET name=?,description=?,price=?,image=?,category_id=?,is_available=? WHERE id=?',
    [name??p.name, description??p.description, price??p.price, image??p.image,
     category_id??p.category_id, is_available??p.is_available, req.params.id]);
  res.json({ message: 'Ürün güncellendi' });
});

app.delete('/api/products/:id', adminAuth, (req, res) => {
  run('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ message: 'Ürün silindi' });
});

// Orders
app.post('/api/orders', (req, res) => {
  const { items, total, table_no, split_count } = req.body;
  if (!items || !total || items.length === 0) return res.status(400).json({ error: 'Sepet boş olamaz' });
  const id = uuidv4().slice(0, 8).toUpperCase();
  run('INSERT INTO orders (id,table_no,items,total,split_count) VALUES (?,?,?,?,?)',
    [id, table_no||0, JSON.stringify(items), total, split_count||1]);
  res.status(201).json({ order_id: id, message: 'Sipariş alındı', split_amount: Math.ceil(total / (split_count||1)) });
});

app.get('/api/orders', adminAuth, (req, res) => {
  const orders = all('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

app.get('/api/orders/:id', (req, res) => {
  const o = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!o) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  res.json({ ...o, items: JSON.parse(o.items) });
});

app.put('/api/orders/:id/status', adminAuth, (req, res) => {
  const { status } = req.body;
  if (!['pending','preparing','ready','delivered','cancelled'].includes(status))
    return res.status(400).json({ error: 'Geçersiz durum' });
  run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ message: 'Durum güncellendi', status });
});

// Chatbot
app.post('/api/chatbot', async (req, res) => {
  const { message, session_id } = req.body;
  if (!message || !session_id) return res.status(400).json({ error: 'Mesaj ve oturum ID gerekli' });
  const products = all(`SELECT p.name,p.description,p.price,c.name as category FROM products p JOIN categories c ON c.id=p.category_id WHERE p.is_available=1`);
  const menuText = products.map(p => `- ${p.name} (${p.category}): ${p.price} TL - ${p.description}`).join('\n');
  const history = all('SELECT role,content FROM chat_history WHERE session_id=? ORDER BY id', [session_id]);
  const messages = [
    { role:'system', content: `Sen bir restoran menü asistanısın. MENÜ:\n${menuText}\nKurallar: Sade ve net cevaplar ver, TL kullan.` },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role:'user', content: message },
  ];
  run('INSERT INTO chat_history (session_id,role,content) VALUES (?,?,?)', [session_id,'user',message]);
  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await openai.chat.completions.create({ model:'gpt-4o-mini', messages, temperature:0.7, max_tokens:500 });
    const reply = r.choices[0].message.content;
    run('INSERT INTO chat_history (session_id,role,content) VALUES (?,?,?)', [session_id,'assistant',reply]);
    res.json({ reply });
  } catch {
    const fallback = generateFallback(message, products);
    run('INSERT INTO chat_history (session_id,role,content) VALUES (?,?,?)', [session_id,'assistant',fallback]);
    res.json({ reply: fallback });
  }
});

function generateFallback(msg, products) {
  const m = msg.toLowerCase();
  if (m.includes('tatlı')||m.includes('tatli')) {
    const d = products.filter(p => p.category === 'Tatlılar');
    if (d.length) return `Bugün ${d[0].name} harika gider! ${d[0].description}. ${d[0].price} TL. Sepete eklemek ister misin?`;
  }
  if (m.includes('kahve')||m.includes('içecek')||m.includes('soğuk')||m.includes('soguk')) {
    const d = products.filter(p => p.category === 'Kahveler'||p.category==='İçecekler');
    if (d.length) return `En çok tercih edilenlerden ${d[0].name} önerebilirim! (${d[0].price} TL). Denemek ister misin?`;
  }
  if (m.includes('ne önerirsin')||m.includes('oner')||m.includes('kararsız')||m.includes('bilmiyorum')) {
    const r = products[Math.floor(Math.random() * products.length)];
    return `Şiddetle ${r.name} öneririm! ${r.price} TL. ${r.description}. Sipariş vermek ister misin?`;
  }
  const match = products.find(p => m.includes(p.name.toLowerCase().replace(/[^a-zçğıöşü]/g, '')));
  if (match) return `${match.name} mükemmel bir seçim! ${match.price} TL. Sepete eklemek ister misin?`;
  return `Size nasıl yardımcı olabilirim? Menümüzde ${products.length} farklı ürün var.`;
}

// Payment
app.post('/api/payment/initialize', (req, res) => {
  const { order_id, split_count } = req.body;
  const order = get('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  const split = split_count || order.split_count || 1;
  const amount = Math.ceil(order.total / split);
  run('UPDATE orders SET status = ? WHERE id = ?', ['paid', order_id]);
  res.json({ success:true, message:'Ödeme başarılı (simülasyon)', payment_id:'SIM-'+order_id, amount });
});

app.post('/api/payment/split', (req, res) => {
  const { total, split_count } = req.body;
  if (!total || total <= 0) return res.status(400).json({ error:'Geçersiz tutar' });
  if (!split_count || split_count < 1 || split_count > 4) return res.status(400).json({ error:'1-4 kişi arası bölünebilir' });
  const perPerson = Math.ceil(total / split_count);
  const splits = Array.from({ length: split_count }, (_, i) => ({
    person: i+1, amount: i === split_count-1 ? total - perPerson * (split_count - 1) : perPerson
  }));
  res.json({ total, split_count, per_person: perPerson, splits });
});

// ─── Error Handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('HATA:', err);
  res.status(500).json({ error: 'Sunucu hatası', detail: err.message });
});

// 404 fallback
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint bulunamadı', path: req.originalUrl });
});

// ─── Export ────────────────────────────────────────────────────────────
let initialized = false;
let initError = null;

export default async function handler(req, res) {
  if (initError) {
    res.status(500).json({ error: 'Sunucu başlatılamadı', detail: initError.message });
    return;
  }
  if (!initialized) {
    try {
      console.log('DB başlatılıyor...');
      await getDb();
      initialized = true;
      console.log('DB hazır');
    } catch (err) {
      initError = err;
      console.error('DB başlatma hatası:', err);
      res.status(500).json({ error: 'Veritabanı başlatılamadı', detail: err.message });
      return;
    }
  }
  return app(req, res);
}
