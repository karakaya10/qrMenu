import { useState } from 'react';
import './CartDrawer.css';

export default function CartDrawer({ cart, cartTotal, onUpdateQty, onRemove, onClose, onCheckout }) {
  const [split, setSplit] = useState(1);

  const perPerson = Math.ceil(cartTotal / split);
  const splits = Array.from({ length: split }, (_, i) => ({
    person: i + 1,
    amount: i === split - 1 ? cartTotal - perPerson * (split - 1) : perPerson
  }));

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <h2>Sipariş Özeti</h2>
          <button className="cart-close" onClick={onClose}>&times;</button>
        </div>

        <div className="cart-items">
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-info">
                <span className="cart-item-name">{item.name}</span>
                <span className="cart-item-price">{item.price * item.qty} TL</span>
              </div>
              <div className="cart-qty">
                <button className="qty-btn" onClick={() => onUpdateQty(item.id, -1)}>-</button>
                <span>{item.qty}</span>
                <button className="qty-btn" onClick={() => onUpdateQty(item.id, 1)}>+</button>
                <button className="remove-btn" onClick={() => onRemove(item.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-split">
          <span>Hesabı Böl</span>
          <div className="split-btns">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                className={`split-btn ${split === n ? 'active' : ''}`}
                onClick={() => setSplit(n)}
              >
                {n} Kişi
              </button>
            ))}
          </div>
        </div>

        {split > 1 && (
          <div className="split-detail">
            {splits.map(s => (
              <div key={s.person} className="split-row">
                <span>Kişi {s.person}</span>
                <span className="split-amount">{s.amount} TL</span>
              </div>
            ))}
          </div>
        )}

        <div className="cart-total-row">
          <span>Toplam</span>
          <span className="total-amount">{cartTotal} TL</span>
        </div>

        <button className="checkout-btn" onClick={onCheckout}>
          Ödemeye Geç
        </button>
      </div>
    </div>
  );
}
