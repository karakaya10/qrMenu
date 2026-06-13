import { useState, useEffect } from 'react';

export default function AdminProducts({ token }) {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '' });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadProducts = () => {
    fetch('/api/products/all', { headers })
      .then(r => r.json())
      .then(setCategories);
  };

  useEffect(loadProducts, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/products/${editing}` : '/api/products';

    await fetch(url, {
      method,
      headers,
      body: JSON.stringify({
        ...form,
        price: parseInt(form.price),
        category_id: parseInt(form.category_id)
      })
    });

    setForm({ name: '', description: '', price: '', category_id: '' });
    setShowForm(false);
    setEditing(null);
    loadProducts();
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      category_id: String(product.category_id)
    });
    setEditing(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE', headers });
    loadProducts();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22 }}>Ürün Yönetimi</h1>
        <button className="btn btn-primary" onClick={() => {
          setForm({ name: '', description: '', price: '', category_id: categories[0]?.id || '' });
          setEditing(null);
          setShowForm(!showForm);
        }}>
          {showForm ? 'İptal' : '+ Yeni Ürün'}
        </button>
      </div>

      {showForm && (
        <div className="admin-section">
          <h2>{editing ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Kategori</label>
                <select className="form-input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Fiyat (TL)</label>
                <input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required min="1" />
              </div>
            </div>
            <div className="form-group">
              <label>Ürün Adı</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Açıklama</label>
              <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-success" style={{ alignSelf: 'flex-start' }}>
              {editing ? 'Güncelle' : 'Ekle'}
            </button>
          </form>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat.id} className="admin-section">
          <h2>{cat.name} ({cat.products.length} ürün)</h2>
          {cat.products.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Bu kategoride ürün yok</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ürün</th>
                  <th>Açıklama</th>
                  <th>Fiyat</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {cat.products.map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{p.price} TL</td>
                    <td>
                      <div className="admin-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => handleEdit(p)}>Düzenle</button>
                        <button className="btn-danger" onClick={() => handleDelete(p.id)}>Sil</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
