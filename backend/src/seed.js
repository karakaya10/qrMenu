import { getDb, run, get, all } from './db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  await getDb();

  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const existingAdmin = get('SELECT id FROM admins WHERE username = ?', ['admin']);
  if (!existingAdmin) {
    run('INSERT INTO admins (username, password, name) VALUES (?, ?, ?)', ['admin', hashedPassword, 'Admin User']);
    console.log('Admin kullanıcı oluşturuldu (admin / admin123)');
  }

  const existingCats = all('SELECT id FROM categories');
  if (existingCats.length === 0) {
    run('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)', [1, 'Kahveler', 1]);
    run('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)', [2, 'Tatlılar', 2]);
    run('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)', [3, 'İçecekler', 3]);
    run('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)', [4, 'Atıştırmalıklar', 4]);
    run('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)', [5, 'Kahvaltı', 5]);

    const products = [
      [1, 1, 'Latte Macchiato', 'Süt köpüğü ile hazırlanan klasik İtalyan kahvesi', 120],
      [2, 1, 'Cortado', 'Eşit oranda espresso ve süt', 110],
      [3, 1, 'Filter Kahve', 'Yavaş demleme yöntemi ile hazırlanır', 95],
      [4, 1, 'Espresso', 'Yoğun aromalı klasik espresso', 80],
      [5, 1, 'Mocha', 'Çikolata ve espresso muhteşem uyumu', 130],
      [6, 2, 'San Sebastian', 'Kremamsı İspanyol peynirli kek', 165],
      [7, 2, 'Tiramisu', 'İtalyan usulü kahveli pasta', 140],
      [8, 2, 'Cheesecake', 'New York usulü krem peynirli kek', 145],
      [9, 3, 'Limonata', 'Taze sıkım limonata', 75],
      [10, 3, 'Portakal Suyu', 'Taze sıkım portakal suyu', 85],
      [11, 3, 'Ayran', 'Geleneksel yoğurt içeceği', 45],
      [12, 4, 'Patates Kızartması', 'Çıtır çıtır altın sarısı', 95],
      [13, 4, 'Soğan Halkası', 'Pane kaplama çıtır soğan halkaları', 85],
      [14, 5, 'Serpme Kahvaltı', 'Zengin serpme kahvaltı tabağı', 250],
      [15, 5, 'Menemen', 'Yumurta, domates ve biber ile', 120],
    ];
    for (const [id, cat, name, desc, price] of products) {
      run('INSERT INTO products (id, category_id, name, description, price) VALUES (?, ?, ?, ?, ?)', [id, cat, name, desc, price]);
    }
    console.log('Seed verileri başarıyla eklendi!');
  } else {
    console.log('Veritabanı zaten dolu, seed atlanıyor.');
  }
}

seed().catch(console.error);
