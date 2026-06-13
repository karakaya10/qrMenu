import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AdminLogin from './AdminLogin.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminProducts from './AdminProducts.jsx';
import AdminOrders from './AdminOrders.jsx';
import './AdminApp.css';

export default function AdminApp() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!token && location.pathname !== '/admin/login') {
      navigate('/admin/login');
    }
  }, [token, location.pathname]);

  const handleLogin = (jwt) => {
    localStorage.setItem('admin_token', jwt);
    setToken(jwt);
    navigate('/admin/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    navigate('/admin/login');
  };

  if (!token) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <div className="admin-nav-header">
          <h2>ROAST<span>&</span>DARK</h2>
          <span className="admin-badge">Admin</span>
        </div>
        <div className="admin-nav-links">
          <button onClick={() => navigate('/admin/dashboard')} className={location.pathname === '/admin/dashboard' ? 'active' : ''}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </button>
          <button onClick={() => navigate('/admin/products')} className={location.pathname === '/admin/products' ? 'active' : ''}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
            Ürünler
          </button>
          <button onClick={() => navigate('/admin/orders')} className={location.pathname === '/admin/orders' ? 'active' : ''}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Siparişler
          </button>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Çıkış
        </button>
      </nav>
      <main className="admin-content">
        <Routes>
          <Route path="/dashboard" element={<AdminDashboard token={token} />} />
          <Route path="/products" element={<AdminProducts token={token} />} />
          <Route path="/orders" element={<AdminOrders token={token} />} />
        </Routes>
      </main>
    </div>
  );
}
