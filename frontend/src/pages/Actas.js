import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { FileText, Download, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Actas = () => {
  const [actas, setActas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const handleDownload = async (actaId, code) => {
    try {
      const token = localStorage.getItem('token');
      const url = `${BACKEND_URL}/api/actas/${actaId}/download`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${code}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Acta descargada exitosamente');
    } catch (error) {
      toast.error('Error al descargar el acta');
      console.error('Download error:', error);
    }
  };

  const handleOpenUploadDialog = (assignment) => {
    setSelectedAssignment(assignment);
    setUploadFile(null);
    setUploadDialogOpen(true);
  };

  const handleUploadSignedActa = async () => {
    if (!uploadFile || !selectedAssignment) {
      toast.error('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/actas/${selectedAssignment.assignment_id}/upload-signed`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      toast.success('Acta firmada subida exitosamente');
      setUploadDialogOpen(false);
      loadActas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al subir acta firmada');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSigned = async (assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      const url = `${BACKEND_URL}/api/actas/${assignmentId}/download-signed`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `ACTA_FIRMADA_${assignmentId.substring(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Acta firmada descargada exitosamente');
    } catch (error) {
      toast.error('Error al descargar el acta firmada');
      console.error('Download error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-blue-600" />
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
                    {acta.assignment.signed_acta_uploaded && (
                      <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Acta Firmada Disponible
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-500 mb-3">
                  Creado: {new Date(acta.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleDownload(acta.id, acta.code)}
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    data-testid={`download-acta-${acta.id}`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar para Firmar
                  </Button>
                  
                  {!acta.assignment?.signed_acta_uploaded ? (
                    <Button
                      onClick={() => handleOpenUploadDialog(acta)}
                      size="sm"
                      variant="outline"
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                      data-testid={`upload-signed-${acta.id}`}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir Acta Firmada
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleDownloadSigned(acta.assignment_id)}
                      size="sm"
                      variant="outline"
                      className="w-full border-green-600 text-green-600 hover:bg-green-50"
                      data-testid={`download-signed-${acta.id}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Acta Firmada
                    </Button>
                  )}
                </div>
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

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Acta Firmada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAssignment && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Código:</span> {selectedAssignment.code}
                </p>
                {selectedAssignment.assignment && (
                  <>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Instructor:</span> {selectedAssignment.assignment.instructor_name}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Disciplina:</span> {selectedAssignment.assignment.discipline}
                    </p>
                  </>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="file-upload">Seleccionar archivo PDF firmado</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="mt-2"
              />
              {uploadFile && (
                <p className="text-sm text-slate-600 mt-2">
                  Archivo seleccionado: {uploadFile.name}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUploadSignedActa}
                disabled={!uploadFile || uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? 'Subiendo...' : 'Subir Acta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Actas;