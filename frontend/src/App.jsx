import { Routes, Route } from 'react-router-dom';
import MenuPage from './pages/customer/MenuPage.jsx';
import PaymentPage from './pages/customer/PaymentPage.jsx';
import OrderSuccess from './pages/customer/OrderSuccess.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MenuPage />} />
      <Route path="/payment/:orderId" element={<PaymentPage />} />
      <Route path="/siparis-basarili/:orderId" element={<OrderSuccess />} />
    </Routes>
  );
}
