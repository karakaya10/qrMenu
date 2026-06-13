import { Router } from 'express';
import { all, get, run } from '../db.js';
import { adminAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => {
  const categories = all('SELECT * FROM categories ORDER BY sort_order');
  const products = all('SELECT * FROM products WHERE is_available = 1');

  const result = categories.map(cat => ({
    ...cat,
    products: products.filter(p => p.category_id === cat.id)
  }));

  res.json(result);
});

router.get('/all', adminAuth, (req, res) => {
  const categories = all('SELECT * FROM categories ORDER BY sort_order');
  const products = all('SELECT * FROM products ORDER BY category_id');
  const result = categories.map(cat => ({
    ...cat,
    products: products.filter(p => p.category_id === cat.id)
  }));
  res.json(result);
});

router.get('/:id', (req, res) => {
  const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
  res.json(product);
});

router.post('/', adminAuth, (req, res) => {
  const { category_id, name, description, price, image } = req.body;
  if (!category_id || !name || !price) {
    return res.status(400).json({ error: 'Kategori, isim ve fiyat gerekli' });
  }

  run(
    'INSERT INTO products (category_id, name, description, price, image) VALUES (?, ?, ?, ?, ?)',
    [category_id, name, description || '', price, image || '']
  );

  const product = get('SELECT * FROM products ORDER BY id DESC LIMIT 1');
  res.status(201).json(product);
});

router.put('/:id', adminAuth, (req, res) => {
  const { name, description, price, image, category_id, is_available } = req.body;
  const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

  run(
    `UPDATE products SET name=?, description=?, price=?, image=?, category_id=?, is_available=? WHERE id=?`,
    [
      name ?? product.name,
      description ?? product.description,
      price ?? product.price,
      image ?? product.image,
      category_id ?? product.category_id,
      is_available ?? product.is_available,
      req.params.id
    ]
  );

  res.json({ message: 'Ürün güncellendi' });
});

router.delete('/:id', adminAuth, (req, res) => {
  run('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ message: 'Ürün silindi' });
});

export default router;
