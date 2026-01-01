import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { FileText, Download } from 'lucide-react';
import { Button } from '../components/ui/button';

const Actas = () => {
  const [actas, setActas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActas();
  }, []);

  const loadActas = async () => {
    try {
      const response = await api.getActas();
      setActas(response.data);
    } catch (error) {
      toast.error('Error al cargar actas');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (actaId, code) => {
    const url = api.downloadActa(actaId);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${code}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Descargando acta...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="actas-page">
      <h2 className="text-2xl font-bold text-slate-900">Actas de Entrega</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actas.map((acta) => (
          <div
            key={acta.id}
            className="bg-white rounded-xl border border-slate-200 p-6 card-hover"
            data-testid={`acta-card-${acta.id}`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-slate-900 mb-1 mono">{acta.code}</h3>
                {acta.assignment && (
                  <div className="space-y-1 mb-3">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Instructor:</span> {acta.assignment.instructor_name}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Disciplina:</span> {acta.assignment.discipline}
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-500 mb-3">
                  Creado: {new Date(acta.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <Button
                  onClick={() => handleDownload(acta.id, acta.code)}
                  size="sm"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  data-testid={`download-acta-${acta.id}`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {actas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No hay actas generadas aún</p>
          <p className="text-slate-400 text-sm">Las actas se generan automáticamente al crear asignaciones</p>
        </div>
      )}
    </div>
  );
};

export default Actas;