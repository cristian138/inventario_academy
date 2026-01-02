import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Package, ClipboardList, FolderOpen, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pieData = [
    { name: 'Disponible', value: stats?.available_quantity || 0, color: '#10B981' },
    { name: 'Asignado', value: stats?.assigned_quantity || 0, color: '#F97316' },
  ];

  return (
    <div className="space-y-8 animate-slide-in" data-testid="dashboard-container">
      {/* Header */}
      <div
        className="relative rounded-2xl overflow-hidden p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1649366911759-1f5c5cc1560c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHw0fHxzcG9ydHMlMjBhY2FkZW15JTIwZmFjaWxpdHklMjBlcXVpcG1lbnQlMjBzb2NjZXIlMjBiYXNrZXRiYWxsJTIwdGVubmlzfGVufDB8fHx8MTc2NzMwODU2MXww&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-slate-900/85"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black mb-2">Panel de Control</h1>
          <p className="text-slate-300 text-lg">Resumen general del inventario</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 card-hover" data-testid="total-goods-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">Total de Bienes</p>
          <p className="text-3xl font-black text-slate-900">{stats?.total_goods || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 card-hover" data-testid="total-quantity-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">Cantidad Total</p>
          <p className="text-3xl font-black text-slate-900">{stats?.total_quantity || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 card-hover" data-testid="assignments-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-blue-700" />
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">Asignaciones</p>
          <p className="text-3xl font-black text-slate-900">{stats?.total_assignments || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 card-hover" data-testid="categories-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">Categorías</p>
          <p className="text-3xl font-black text-slate-900">{stats?.total_categories || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Distribución de Inventario</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent assignments */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Asignaciones Recientes</h3>
          <div className="space-y-4">
            {stats?.recent_assignments && stats.recent_assignments.length > 0 ? (
              stats.recent_assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors duration-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{assignment.instructor_name}</p>
                    <p className="text-sm text-slate-600">{assignment.discipline}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">
                      {new Date(assignment.created_at).toLocaleDateString('es-ES')}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      {assignment.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">No hay asignaciones recientes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;