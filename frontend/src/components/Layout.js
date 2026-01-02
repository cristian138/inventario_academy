import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  FileText,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  X,
  FolderOpen
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'control'] },
    { path: '/users', icon: Users, label: 'Usuarios', roles: ['admin'] },
    { path: '/categories', icon: FolderOpen, label: 'Categorías', roles: ['admin', 'control'] },
    { path: '/goods', icon: Package, label: 'Inventario', roles: ['admin', 'control'] },
    { path: '/assignments', icon: ClipboardList, label: 'Asignaciones', roles: ['admin', 'control'] },
    { path: '/actas', icon: FileText, label: 'Actas', roles: ['admin', 'control'] },
    { path: '/reports', icon: BarChart3, label: 'Reportes', roles: ['admin', 'control'] },
    { path: '/audit', icon: Shield, label: 'Auditoría', roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 transition-transform duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_cc84c26b-490c-4e94-9201-0c145d45c1fb/artifacts/p507w2uv_LOGO-PRINCIPAL-CON-FONDO.jpg" 
                alt="Logo" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-white font-bold text-lg">Sistema de Inventarios</h1>
                <p className="text-slate-400 text-xs">Academia Deportiva</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                <p className="text-slate-400 text-xs truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
              data-testid="menu-button"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {filteredMenuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium capitalize">
              {user?.role}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;