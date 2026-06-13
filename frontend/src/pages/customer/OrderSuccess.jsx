import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './OrderSuccess.css';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => r.json())
      .then(setOrder)
      .catch(() => {});
  }, [orderId]);

  return (
    <div className="success-page">
      <div className="success-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <path d="M22 4L12 14.01l-3-3"/>
        </svg>
      </div>
      <h1>Siparişiniz Alındı!</h1>
      <p className="success-sub">Siparişiniz hazırlanmaya başladı.</p>

      {order && (
        <div className="success-card">
          <div className="success-row">
            <span>Sipariş No</span>
            <strong>#{order.id}</strong>
          </div>
          <div className="success-row">
            <span>Toplam</span>
            <strong style={{ color: 'var(--primary)' }}>{order.total} TL</strong>
          </div>
          <div className="success-row">
            <span>Durum</span>
            <span className="status-badge">Hazırlanıyor</span>
          </div>
        </div>
      )}

      <p className="success-info">
        Siparişiniz hazır olduğunda masanıza getirilecektir.
      </p>

      <button className="new-order-btn" onClick={() => navigate('/')}>
        Yeni Sipariş Ver
      </button>
    </div>
  );
}
