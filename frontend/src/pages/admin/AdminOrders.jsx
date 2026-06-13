import { useState, useEffect } from 'react';

export default function AdminOrders({ token }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/orders', { headers })
      .then(r => r.json())
      .then(setOrders);
  }, []);

  const updateStatus = async (id, status) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    paid: orders.filter(o => o.status === 'paid').length,
  };

  const totalRevenue = orders
    .filter(o => o.status === 'paid' || o.status === 'delivered')
    .reduce((s, o) => s + o.total, 0);

  const statusColors = {
    pending: 'var(--text-muted)',
    preparing: '#f59e0b',
    ready: '#3b82f6',
    delivered: 'var(--success)',
    paid: 'var(--primary)',
    cancelled: 'var(--danger)',
  };

  const statusLabels = {
    pending: 'Bekliyor',
    preparing: 'Hazırlanıyor',
    ready: 'Hazır',
    delivered: 'Teslim Edildi',
    paid: 'Ödendi',
    cancelled: 'İptal',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22 }}>Siparişler</h1>
        <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 18 }}>
          Toplam: {totalRevenue} TL
        </div>
      </div>

      <div className="admin-stats">
        {Object.entries(statusCounts).map(([key, count]) => (
          <div
            key={key}
            className="stat-card"
            style={{ cursor: 'pointer', borderColor: filter === key ? 'var(--primary)' : 'var(--border)' }}
            onClick={() => setFilter(key)}
          >
            <h4>{statusLabels[key] || key}</h4>
            <div className="stat-value" style={{ color: statusColors[key] || 'var(--text-main)' }}>
              {count}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-section">
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {filter === 'all' ? 'Henüz sipariş yok' : 'Bu durumda sipariş bulunamadı'}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Masa</th>
                <th>Ürünler</th>
                <th>Tutar</th>
                <th>Bölme</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>#{order.id}</td>
                  <td>{order.table_no || '-'}</td>
                  <td style={{ fontSize: 12, maxWidth: 250 }}>
                    {order.items.map(i => `${i.name} x${i.qty}`).join(', ')}
                  </td>
                  <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{order.total} TL</td>
                  <td style={{ fontSize: 12 }}>{order.split_count > 1 ? `${order.split_count} Kişi` : '-'}</td>
                  <td>
                    <select
                      className="status-select"
                      value={order.status}
                      onChange={e => updateStatus(order.id, e.target.value)}
                      style={{ color: statusColors[order.status] || 'var(--text-main)' }}
                    >
                      <option value="pending">Bekliyor</option>
                      <option value="preparing">Hazırlanıyor</option>
                      <option value="ready">Hazır</option>
                      <option value="delivered">Teslim Edildi</option>
                      <option value="paid">Ödendi</option>
                      <option value="cancelled">İptal</option>
                    </select>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
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
