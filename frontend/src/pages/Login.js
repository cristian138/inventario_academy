import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Lock, Mail, Package } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('¡Bienvenido!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:block lg:w-1/2 relative bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1758778932827-52b7e4799fbf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBhY2FkZW15JTIwZmFjaWxpdHklMjBlcXVpcG1lbnR8ZW58MHx8fHwxNzY3MzA4NTU5fDA&ixlib=rb-4.1.0&q=85)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-slate-900/70"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6">
              <Package className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-black mb-4 leading-tight">Sistema de Inventarios</h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              Gestión profesional de equipamiento deportivo para tu academia
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Iniciar Sesión</h2>
              <p className="text-slate-600">Accede a tu cuenta para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                    placeholder="correo@ejemplo.com"
                    required
                    data-testid="email-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
                    placeholder="••••••••"
                    required
                    data-testid="password-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="login-button"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;