import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Instructors from './pages/Instructors';
import Sports from './pages/Sports';
import Warehouses from './pages/Warehouses';
import Categories from './pages/Categories';
import Goods from './pages/Goods';
import Assignments from './pages/Assignments';
import Actas from './pages/Actas';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Layout from './components/Layout';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="instructors" element={<Instructors />} />
        <Route path="sports" element={<Sports />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="categories" element={<Categories />} />
        <Route path="goods" element={<Goods />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="actas" element={<Actas />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<AdminRoute><Audit /></AdminRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;