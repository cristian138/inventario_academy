import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

const Audit = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await api.getAuditLogs();
      setLogs(response.data);
    } catch (error) {
      toast.error('Error al cargar logs de auditoría');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeClass = (action) => {
    const classes = {
      LOGIN: 'bg-blue-100 text-blue-700',
      CREATE_USER: 'bg-green-100 text-green-700',
      UPDATE_USER: 'bg-yellow-100 text-yellow-700',
      DELETE_USER: 'bg-red-100 text-red-700',
      CREATE_CATEGORY: 'bg-purple-100 text-purple-700',
      CREATE_GOOD: 'bg-teal-100 text-teal-700',
      UPDATE_GOOD: 'bg-amber-100 text-amber-700',
      DELETE_GOOD: 'bg-red-100 text-red-700',
      CREATE_ASSIGNMENT: 'bg-indigo-100 text-indigo-700',
    };
    return classes[action] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-900">Auditoría del Sistema</h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Fecha/Hora
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Acción
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Módulo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Detalles
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50 transition-colors duration-200"
                  data-testid={`audit-log-${log.id}`}
                >
                  <td className="px-6 py-4 text-sm mono text-slate-700">
                    {new Date(log.timestamp).toLocaleString('es-ES')}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{log.user_email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        getActionBadgeClass(log.action)
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{log.module}</td>
                  <td className="px-6 py-4 text-sm mono text-slate-600">{log.ip}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No hay logs de auditoría</p>
            </div>
          )}
        </div>
      </div>

      {logs.length > 0 && (
        <p className="text-sm text-slate-600">
          Mostrando los últimos <span className="font-semibold">{logs.length}</span> registros de auditoría
        </p>
      )}
    </div>
  );
};

export default Audit;