import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './features/auth/AuthProvider';
import { useI18n } from './lib/i18n';
import { ErrorNotice, Loading } from './components/Feedback';
import { Layout, LanguageToggle } from './components/Layout';
import { LoginPage } from './features/auth/LoginPage';
import { PasswordPage } from './features/auth/PasswordPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { CreateOrderPage } from './features/orders/CreateOrderPage';
import { UsersPage } from './features/users/UsersPage';

function Protected() {
  const { user } = useAuth(); const { href } = useI18n(); const location = useLocation();
  if (!user) return <Navigate to={href('/login')} replace/>;
  if (user.mustChangePassword && location.pathname !== '/password') return <Navigate to={href('/password')} replace/>;
  return <Outlet/>;
}
function AdminOnly() { const { user } = useAuth(); const { href } = useI18n(); return user?.role === 'admin' ? <UsersPage/> : <Navigate to={href('/orders')} replace/>; }
export default function App() {
  const { loading, error, refresh } = useAuth(); const { href } = useI18n();
  if (loading) return <div className="boot-screen"><Loading/></div>;
  if (error) return <div className="boot-screen"><LanguageToggle/><ErrorNotice error={error} retry={refresh}/></div>;
  return <Routes><Route path="/login" element={<LoginPage/>}/><Route element={<Protected/>}><Route element={<Layout/>}><Route path="/orders" element={<OrdersPage/>}/><Route path="/orders/new" element={<CreateOrderPage/>}/><Route path="/team" element={<AdminOnly/>}/><Route path="/password" element={<PasswordPage/>}/></Route></Route><Route path="*" element={<Navigate to={href('/orders')} replace/>}/></Routes>;
}
