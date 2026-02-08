import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calculator from './pages/Calculator';
import Settings from './pages/Settings';
import Debts from './pages/Debts';
import TradeJournal from './pages/TradeJournal';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Yükleniyor...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/calculator" element={
            <ProtectedRoute>
              <Calculator />
            </ProtectedRoute>
          } />
          <Route path="/debts" element={
            <ProtectedRoute>
              <Debts />
            </ProtectedRoute>
          } />
          <Route path="/journal" element={
            <ProtectedRoute>
              <TradeJournal />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
