import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── In-Memory Data Store ─────────────────────────────────────────────
// sql.js yerine saf JS objeleri kullanıyoruz (Vercel serverless uyumlu)
let data = null;

function initData() {
  if (data) return;

  const cats = [
    { id: 1, name: 'Kahveler', sort_order: 1 },
    { id: 2, name: 'Tatlılar', sort_order: 2 },
    { id: 3, name: 'İçecekler', sort_order: 3 },
    { id: 4, name: 'Atıştırmalıklar', sort_order: 4 },
    { id: 5, name: 'Kahvaltı', sort_order: 5 },
  ];

  const prods = [
    { id:1, category_id:1, name:'Latte Macchiato', description:'Süt köpüğü ile hazırlanan klasik İtalyan kahvesi', price:120, is_available:1 },
    { id:2, category_id:1, name:'Cortado', description:'Eşit oranda espresso ve süt', price:110, is_available:1 },
    { id:3, category_id:1, name:'Filter Kahve', description:'Yavaş demleme yöntemi ile hazırlanır', price:95, is_available:1 },
    { id:4, category_id:1, name:'Espresso', description:'Yoğun aromalı klasik espresso', price:80, is_available:1 },
    { id:5, category_id:1, name:'Mocha', description:'Çikolata ve espresso muhteşem uyumu', price:130, is_available:1 },
    { id:6, category_id:2, name:'San Sebastian', description:'Kremamsı İspanyol peynirli kek', price:165, is_available:1 },
    { id:7, category_id:2, name:'Tiramisu', description:'İtalyan usulü kahveli pasta', price:140, is_available:1 },
    { id:8, category_id:2, name:'Cheesecake', description:'New York usulü krem peynirli kek', price:145, is_available:1 },
    { id:9, category_id:3, name:'Limonata', description:'Taze sıkım limonata', price:75, is_available:1 },
    { id:10, category_id:3, name:'Portakal Suyu', description:'Taze sıkım portakal suyu', price:85, is_available:1 },
    { id:11, category_id:3, name:'Ayran', description:'Geleneksel yoğurt içeceği', price:45, is_available:1 },
    { id:12, category_id:4, name:'Patates Kızartması', description:'Çıtır çıtır altın sarısı', price:95, is_available:1 },
    { id:13, category_id:4, name:'Soğan Halkası', description:'Pane kaplama çıtır soğan halkaları', price:85, is_available:1 },
    { id:14, category_id:5, name:'Serpme Kahvaltı', description:'Zengin serpme kahvaltı tabağı', price:250, is_available:1 },
    { id:15, category_id:5, name:'Menemen', description:'Yumurta, domates ve biber ile', price:120, is_available:1 },
  ];

  let nextProdId = 16;

  data = {
    categories: cats,
    products: prods,
    orders: [],
    nextProdId: 16,
  };
}

function getProducts() {
  return data.products.filter(p => p.is_available);
}

function getAllProducts() {
  return data.products;
}

function getProduct(id) {
  return data.products.find(p => p.id === Number(id));
}

function addProduct(prod) {
  prod.id = data.nextProdId++;
  data.products.push(prod);
  return prod;
}

function updateProduct(id, updates) {
  const idx = data.products.findIndex(p => p.id === Number(id));
  if (idx === -1) return null;
  data.products[idx] = { ...data.products[idx], ...updates };
  return data.products[idx];
}

function deleteProduct(id) {
  const idx = data.products.findIndex(p => p.id === Number(id));
  if (idx === -1) return false;
  data.products.splice(idx, 1);
  return true;
}

function getCategoriesWithProducts(filterAvailable = true) {
  const prods = filterAvailable ? getProducts() : getAllProducts();
  return data.categories
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(c => ({ ...c, products: prods.filter(p => p.category_id === c.id) }));
}

function addOrder(order) {
  data.orders.unshift(order);
}

function getOrder(id) {
  return data.orders.find(o => o.id === id);
}

function updateOrder(id, updates) {
  const idx = data.orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  data.orders[idx] = { ...data.orders[idx], ...updates };
  return data.orders[idx];
}

// ─── Auth (JWT) ───────────────────────────────────────────────────────
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'qr-menu-default-secret';
const ADMIN = { username: 'admin', password: '$2a$10$dummy', name: 'Admin User' };

// Basit password hash kontrolü (bcryptsiz)
import crypto from 'crypto';
const ADMIN_HASH = crypto.createHash('sha256').update('admin123').digest('hex');

function checkPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex') === ADMIN_HASH;
}

const adminAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  try {
    req.adminId = jwt.verify(header.split(' ')[1], JWT_SECRET).id;
    next();
  } catch { res.status(401).json({ error: 'Geçersiz token' }); }
};

// ─── Routes ────────────────────────────────────────────────────────────

// Health
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', message: 'API çalışıyor', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  initData();
  res.json({ status: 'ok', db: 'memory', categories: data.categories.length, products: data.products.length });
});

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && checkPassword(password)) {
    const token = jwt.sign({ id: 1, username: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, admin: { id: 1, username: 'admin', name: 'Admin User' } });
  } else {
    res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
  }
});

// Products
app.get('/api/products', (req, res) => {
  initData();
  res.json(getCategoriesWithProducts(true));
});

app.get('/api/products/all', adminAuth, (req, res) => {
  initData();
  res.json(getCategoriesWithProducts(false));
});

app.get('/api/products/:id', (req, res) => {
  initData();
  const p = getProduct(req.params.id);
  if (!p) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json(p);
});

app.post('/api/products', adminAuth, (req, res) => {
  initData();
  const { category_id, name, description, price } = req.body;
  if (!category_id || !name || !price) return res.status(400).json({ error: 'Kategori, isim ve fiyat gerekli' });
  const prod = addProduct({ category_id: Number(category_id), name, description: description || '', price: Number(price), is_available: 1 });
  res.status(201).json(prod);
});

app.put('/api/products/:id', adminAuth, (req, res) => {
  initData();
  const { name, description, price, category_id, is_available } = req.body;
  const updated = updateProduct(req.params.id, {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(price !== undefined && { price: Number(price) }),
    ...(category_id !== undefined && { category_id: Number(category_id) }),
    ...(is_available !== undefined && { is_available }),
  });
  if (!updated) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json(updated);
});

app.delete('/api/products/:id', adminAuth, (req, res) => {
  initData();
  if (!deleteProduct(req.params.id)) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json({ message: 'Ürün silindi' });
});

// Orders
app.post('/api/orders', (req, res) => {
  initData();
  const { items, total, table_no, split_count } = req.body;
  if (!items || !total || items.length === 0) return res.status(400).json({ error: 'Sepet boş olamaz' });
  const id = crypto.randomUUID().slice(0, 8).toUpperCase();
  addOrder({
    id, table_no: table_no || 0, items, total,
    split_count: split_count || 1, status: 'pending',
    created_at: new Date().toISOString()
  });
  res.status(201).json({ order_id: id, message: 'Sipariş alındı', split_amount: Math.ceil(total / (split_count || 1)) });
});

app.get('/api/orders', adminAuth, (req, res) => {
  initData();
  res.json(data.orders);
});

app.get('/api/orders/:id', (req, res) => {
  initData();
  const o = getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  res.json(o);
});

app.put('/api/orders/:id/status', adminAuth, (req, res) => {
  initData();
  const { status } = req.body;
  if (!['pending','preparing','ready','delivered','cancelled','paid'].includes(status))
    return res.status(400).json({ error: 'Geçersiz durum' });
  const o = updateOrder(req.params.id, { status });
  if (!o) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  res.json({ message: 'Durum güncellendi', status });
});

// Chatbot
app.post('/api/chatbot', async (req, res) => {
  initData();
  const { message, session_id } = req.body;
  if (!message || !session_id) return res.status(400).json({ error: 'Mesaj ve oturum ID gerekli' });

  const products = getProducts();
  const menuText = products.map(p => {
    const cat = data.categories.find(c => c.id === p.category_id);
    return `- ${p.name} (${cat?.name}): ${p.price} TL - ${p.description}`;
  }).join('\n');

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Sen bir restoran menü asistanısın. MENÜ:\n${menuText}\nKurallar: Sade ve net cevaplar ver, TL kullan.` },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    res.json({ reply: r.choices[0].message.content });
  } catch {
    const fallback = generateFallback(message, products, data.categories);
    res.json({ reply: fallback });
  }
});

function generateFallback(msg, products, categories) {
  const m = msg.toLowerCase();
  if (m.includes('tatlı')||m.includes('tatli')) {
    const d = products.filter(p => {
      const cat = categories.find(c => c.id === p.category_id);
      return cat?.name === 'Tatlılar';
    });
    if (d.length) return `Bugün ${d[0].name} harika gider! ${d[0].description}. ${d[0].price} TL. Sepete eklemek ister misin?`;
  }
  if (m.includes('kahve')||m.includes('içecek')||m.includes('soğuk')||m.includes('soguk')) {
    const d = products.filter(p => {
      const cat = categories.find(c => c.id === p.category_id);
      return cat?.name === 'Kahveler' || cat?.name === 'İçecekler';
    });
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
  initData();
  const { order_id, split_count } = req.body;
  const order = getOrder(order_id);
  if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  const split = split_count || order.split_count || 1;
  const amount = Math.ceil(order.total / split);
  updateOrder(order_id, { status: 'paid' });
  res.json({ success: true, message: 'Ödeme başarılı', payment_id: 'PAY-' + order_id, amount });
});

app.post('/api/payment/split', (req, res) => {
  const { total, split_count } = req.body;
  if (!total || total <= 0) return res.status(400).json({ error: 'Geçersiz tutar' });
  if (!split_count || split_count < 1 || split_count > 4) return res.status(400).json({ error: '1-4 kişi arası bölünebilir' });
  const perPerson = Math.ceil(total / split_count);
  const splits = Array.from({ length: split_count }, (_, i) => ({
    person: i + 1,
    amount: i === split_count - 1 ? total - perPerson * (split_count - 1) : perPerson
  }));
  res.json({ total, split_count, per_person: perPerson, splits });
});

// ─── Error Handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('HATA:', err);
  res.status(500).json({ error: 'Sunucu hatası', detail: err.message });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint bulunamadı', path: req.originalUrl });
});

// ─── Export ────────────────────────────────────────────────────────────
export default function handler(req, res) {
  return app(req, res);
}
