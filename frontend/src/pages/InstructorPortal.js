import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Package, FileText, History, CheckCircle, Download, Clock } from 'lucide-react';

const InstructorPortal = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [history, setHistory] = useState([]);
  const [actas, setActas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, historyRes, actasRes] = await Promise.all([
        api.getInstructorAssignments(),
        api.getInstructorHistory(),
        api.getInstructorActas()
      ]);
      setAssignments(assignmentsRes.data);
      setHistory(historyRes.data);
      setActas(actasRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReception = async (assignmentId) => {
    if (!window.confirm('¿Confirmas que has recibido estos bienes?')) return;
    
    setConfirmingId(assignmentId);
    try {
      await api.confirmReception(assignmentId);
      toast.success('Recepción confirmada exitosamente');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al confirmar recepción');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDownloadActa = async (actaId, filename) => {
    try {
      const response = await api.downloadActa(actaId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `acta_${actaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Error al descargar el acta');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'Pendiente': 'bg-yellow-100 text-yellow-800',
      'Entregado': 'bg-green-100 text-green-800',
      'Devuelto': 'bg-blue-100 text-blue-800'
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingAssignments = assignments.filter(a => a.status === 'Pendiente');
  const confirmedAssignments = assignments.filter(a => a.status === 'Entregado');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Portal del Instructor</h1>
        <p className="text-slate-600">Bienvenido, {user?.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendientes de Confirmar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{pendingAssignments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Bienes Asignados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{confirmedAssignments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Actas Generadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{actas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Asignaciones Actuales
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="actas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Mis Actas
          </TabsTrigger>
        </TabsList>

        {/* Current Assignments Tab */}
        <TabsContent value="current" className="space-y-4">
          {pendingAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pendientes de Confirmar Recepción
                </CardTitle>
                <CardDescription>
                  Confirma la recepción de estos bienes cuando los hayas recibido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingAssignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4 bg-yellow-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{assignment.discipline}</p>
                          <p className="text-sm text-slate-600">
                            Asignado: {new Date(assignment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleConfirmReception(assignment.id)}
                          disabled={confirmingId === assignment.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {confirmingId === assignment.id ? 'Confirmando...' : 'Confirmar Recepción'}
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Bien</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignment.details?.map((detail, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{detail.good_name}</TableCell>
                              <TableCell>{detail.category_name}</TableCell>
                              <TableCell className="text-right">{detail.quantity_assigned}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {assignment.notes && (
                        <p className="text-sm text-slate-600 mt-2">
                          <strong>Notas:</strong> {assignment.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {confirmedAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Bienes en Mi Poder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {confirmedAssignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{assignment.discipline}</p>
                          <p className="text-sm text-slate-600">
                            Recibido: {assignment.confirmed_at ? new Date(assignment.confirmed_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        {getStatusBadge(assignment.status)}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Bien</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignment.details?.map((detail, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{detail.good_name}</TableCell>
                              <TableCell>{detail.category_name}</TableCell>
                              <TableCell className="text-right">{detail.quantity_assigned}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {assignments.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600">No tienes asignaciones activas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Asignaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Disciplina</TableHead>
                      <TableHead>Bienes</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          {new Date(assignment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{assignment.discipline}</TableCell>
                        <TableCell>
                          {assignment.details?.map(d => d.good_name).join(', ') || 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p>No hay historial de asignaciones</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actas Tab */}
        <TabsContent value="actas">
          <Card>
            <CardHeader>
              <CardTitle>Mis Actas</CardTitle>
              <CardDescription>
                Documentos de entrega y devolución generados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actas.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Archivo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actas.map((acta) => (
                      <TableRow key={acta.id}>
                        <TableCell>
                          {new Date(acta.generated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={acta.type === 'entrega' ? 'default' : 'secondary'}>
                            {acta.type === 'entrega' ? 'Entrega' : 'Devolución'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {acta.filename}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadActa(acta.id, acta.filename)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p>No hay actas generadas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstructorPortal;
