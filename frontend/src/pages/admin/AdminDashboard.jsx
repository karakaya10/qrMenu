import { useState, useEffect } from 'react';

export default function AdminDashboard({ token }) {
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, products: 0 });
  const [recentOrders, setRecentOrders] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/orders', { headers })
      .then(r => r.json())
      .then(data => {
        setRecentOrders(data.slice(0, 5));
        setStats({
          total: data.length,
          pending: data.filter(o => o.status === 'pending' || o.status === 'preparing').length,
          paid: data.filter(o => o.status === 'paid').length,
          products: 0
        });
      });
    fetch('/api/products/all', { headers })
      .then(r => r.json())
      .then(data => {
        const count = data.reduce((sum, c) => sum + c.products.length, 0);
        setStats(prev => ({ ...prev, products: count }));
      });
  }, []);

  const updateStatus = async (id, status) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setRecentOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>Dashboard</h1>

      <div className="admin-stats">
        <div className="stat-card primary">
          <h4>Toplam Sipariş</h4>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card success">
          <h4>Aktif Sipariş</h4>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card">
          <h4>Ödenen</h4>
          <div className="stat-value" style={{ color: '#22c55e' }}>{stats.paid}</div>
        </div>
        <div className="stat-card primary">
          <h4>Ürünler</h4>
          <div className="stat-value">{stats.products}</div>
        </div>
      </div>

      <div className="admin-section">
        <h2>Son Siparişler</h2>
        {recentOrders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Henüz sipariş yok</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ürünler</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>#{order.id}</td>
                  <td>{order.items.map(i => `${i.name} x${i.qty}`).join(', ')}</td>
                  <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{order.total} TL</td>
                  <td>
                    <select
                      className="status-select"
                      value={order.status}
                      onChange={e => updateStatus(order.id, e.target.value)}
                      style={{
                        color: order.status === 'paid' || order.status === 'delivered'
                          ? 'var(--success)' : order.status === 'cancelled' ? 'var(--danger)' : 'var(--text-main)'
                      }}
                    >
                      <option value="pending">Bekliyor</option>
                      <option value="preparing">Hazırlanıyor</option>
                      <option value="ready">Hazır</option>
                      <option value="delivered">Teslim Edildi</option>
                      <option value="cancelled">İptal</option>
                    </select>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(order.created_at).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
