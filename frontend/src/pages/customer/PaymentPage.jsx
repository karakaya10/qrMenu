import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './PaymentPage.css';

export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [split, setSplit] = useState(1);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => r.json())
      .then(data => {
        setOrder(data);
        setSplit(data.split_count || 1);
      })
      .catch(() => navigate('/'));
  }, [orderId]);

  if (!order) return <div className="loading-screen">Yükleniyor...</div>;

  const total = order.total;
  const perPerson = Math.ceil(total / split);
  const splits = Array.from({ length: split }, (_, i) => ({
    person: i + 1,
    amount: i === split - 1 ? total - perPerson * (split - 1) : perPerson
  }));

  const handlePay = async (personIndex) => {
    setPaying(true);
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          split_count: split,
          person: personIndex
        })
      });
      const data = await res.json();
      if (data.success) {
        setPaid(true);
      } else {
        alert('Ödeme başarısız: ' + (data.error || 'Bilinmeyen hata'));
      }
    } catch (err) {
      alert('Ödeme hatası: ' + err.message);
    }
    setPaying(false);
  };

  if (paid) {
    navigate(`/siparis-basarili/${orderId}`);
    return null;
  }

  return (
    <div className="payment-page">
      <div className="payment-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Ödeme</h1>
      </div>

      <div className="payment-content">
        <div className="payment-card">
          <h3>Sipariş #{orderId}</h3>
          <div className="order-items">
            {order.items.map((item, i) => (
              <div key={i} className="order-item">
                <span>{item.name} x{item.qty}</span>
                <span>{item.price * item.qty} TL</span>
              </div>
            ))}
          </div>
          <div className="order-total">
            <span>Toplam</span>
            <span>{total} TL</span>
          </div>
        </div>

        <div className="payment-card">
          <h3>Hesabı Böl</h3>
          <div className="split-options">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                className={`split-option ${split === n ? 'active' : ''}`}
                onClick={() => setSplit(n)}
              >
                {n} Kişi
              </button>
            ))}
          </div>
          {split > 1 && (
            <div className="split-details">
              {splits.map(s => (
                <div key={s.person} className="split-person">
                  <span>Kişi {s.person}</span>
                  <span className="split-person-amount">{s.amount} TL</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="payment-card">
          <h3>Ödeme Yöntemi</h3>
          <div className="payment-methods">
            <div className="payment-method active">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2"/>
                <path d="M1 10h22"/>
              </svg>
              <span>Kredi Kartı</span>
            </div>
          </div>
        </div>

        {split === 1 ? (
          <button
            className="pay-btn"
            onClick={() => handlePay(1)}
            disabled={paying}
          >
            {paying ? 'Ödeniyor...' : `${total} TL Öde`}
          </button>
        ) : (
          <div className="split-pay-area">
            {splits.map(s => (
              <button
                key={s.person}
                className="pay-btn split-pay-btn"
                onClick={() => handlePay(s.person)}
                disabled={paying}
              >
                {paying ? 'Ödeniyor...' : `Kişi ${s.person}: ${s.amount} TL Öde`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
