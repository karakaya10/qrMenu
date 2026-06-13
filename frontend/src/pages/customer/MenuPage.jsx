import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CartDrawer from '../../components/CartDrawer.jsx';
import Chatbot from '../../components/Chatbot.jsx';
import './MenuPage.css';

const API = '/api';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/ping`)
      .then(r => {
        if (!r.ok) throw new Error('API yanıt vermiyor (' + r.status + ')');
        return r.json();
      })
      .then(() => fetch(`${API}/products`))
      .then(r => {
        if (!r.ok) throw new Error('Sunucu yanıt vermiyor (' + r.status + ')');
        return r.json();
      })
      .then(data => {
        setCategories(data);
        if (data.length > 0) setActiveCategory(data[0].id);
      })
      .catch(err => setError(err.message));
  }, []);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      const newCart = prev.map(i =>
        i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i
      ).filter(i => i.qty > 0);
      return newCart;
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
          total: cartTotal,
          table_no: 14,
          split_count: 1
        })
      });
      const data = await res.json();
      if (data.order_id) {
        setCart([]);
        setShowCart(false);
        navigate(`/payment/${data.order_id}`);
      }
    } catch (err) {
      alert('Sipariş gönderilemedi: ' + err.message);
    }
  };

  const activeProducts = categories.find(c => c.id === activeCategory)?.products || [];

  return (
    <div className="menu-page">
      <header className="menu-header">
        <div className="header-top">
          <h1>ROAST<span>&</span>DARK</h1>
          <button className="chat-toggle-btn" onClick={() => setShowChat(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            AI Asistan
          </button>
        </div>
        <div className="table-badge">Masa 14</div>
      </header>

      {error && (
        <div className="error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          <span>{error}</span>
          <button onClick={() => { setError(null); window.location.reload(); }}>Tekrar Dene</button>
        </div>
      )}

      <nav className="category-nav">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      <main className="product-list">
        {activeProducts.map(product => (
          <div key={product.id} className="product-card fade-in">
            <div className="product-img" style={{ background: getProductColor(product.name) }}>
              <span className="product-emoji">{getProductEmoji(product.name)}</span>
            </div>
            <div className="product-info">
              <div className="product-header">
                <h3>{product.name}</h3>
                <span className="product-price">{product.price} TL</span>
              </div>
              <p className="product-desc">{product.description}</p>
              <button className="add-btn" onClick={() => addToCart(product)}>
                Sepete Ekle
              </button>
            </div>
          </div>
        ))}
      </main>

      {cartCount > 0 && (
        <div className="cart-bar" onClick={() => setShowCart(true)}>
          <div className="cart-bar-info">
            <span className="cart-bar-count">{cartCount} ürün</span>
            <span className="cart-bar-total">{cartTotal} TL</span>
          </div>
          <button className="view-cart-btn">Sepeti Gör</button>
        </div>
      )}

      {showCart && (
        <CartDrawer
          cart={cart}
          cartTotal={cartTotal}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onClose={() => setShowCart(false)}
          onCheckout={handleCheckout}
        />
      )}

      {showChat && (
        <Chatbot
          onClose={() => setShowChat(false)}
          onAddToCart={(product) => {
            addToCart(product);
            setShowChat(false);
          }}
          products={categories.flatMap(c => c.products)}
        />
      )}
    </div>
  );
}

function getProductColor(name) {
  const colors = {
    'Latte Macchiato': '#3a2312',
    'Cortado': '#2d1f16',
    'Filter Kahve': '#4a3520',
    'Espresso': '#1a0f08',
    'Mocha': '#3d1f12',
    'San Sebastian': '#5a3d28',
    'Tiramisu': '#4a2f1a',
    'Cheesecake': '#f5e6c8',
    'Limonata': '#e8d44d',
    'Portakal Suyu': '#ff8c00',
    'Ayran': '#f0f0f0',
    'Patates Kızartması': '#daa520',
    'Soğan Halkası': '#c4a035',
    'Serpme Kahvaltı': '#8B7355',
    'Menemen': '#d44a2a',
  };
  return colors[name] || '#2a323d';
}

function getProductEmoji(name) {
  const emojis = {
    'Latte Macchiato': '☕',
    'Cortado': '☕',
    'Filter Kahve': '☕',
    'Espresso': '☕',
    'Mocha': '☕',
    'San Sebastian': '🍰',
    'Tiramisu': '🍰',
    'Cheesecake': '🍰',
    'Limonata': '🍋',
    'Portakal Suyu': '🍊',
    'Ayran': '🥛',
    'Patates Kızartması': '🍟',
    'Soğan Halkası': '🧅',
    'Serpme Kahvaltı': '🍳',
    'Menemen': '🍳',
  };
  return emojis[name] || '🍽️';
}
