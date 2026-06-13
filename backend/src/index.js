import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDb } from './db.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import chatbotRoutes from './routes/chatbot.js';
import paymentRoutes from './routes/payment.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await getDb();
  console.log('Veritabanı bağlantısı kuruldu');
  app.listen(PORT, () => {
    console.log(`QR Menu API sunucusu çalışıyor: http://localhost:${PORT}`);
  });
}

start().catch(console.error);
