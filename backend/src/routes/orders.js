import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../db.js';
import { adminAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', (req, res) => {
  const { items, total, table_no, split_count } = req.body;

  if (!items || !total || items.length === 0) {
    return res.status(400).json({ error: 'Sepet boş olamaz' });
  }

  const id = uuidv4().slice(0, 8).toUpperCase();
  run(
    'INSERT INTO orders (id, table_no, items, total, split_count) VALUES (?, ?, ?, ?, ?)',
    [id, table_no || 0, JSON.stringify(items), total, split_count || 1]
  );

  res.status(201).json({
    order_id: id,
    message: 'Sipariş alındı',
    split_amount: Math.ceil(total / (split_count || 1))
  });
});

router.get('/', adminAuth, (req, res) => {
  const orders = all('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

router.get('/:id', (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  res.json({ ...order, items: JSON.parse(order.items) });
});

router.put('/:id/status', adminAuth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }

  run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ message: 'Durum güncellendi', status });
});

export default router;
