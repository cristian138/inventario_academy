import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [goods, setGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    instructor_name: '',
    discipline: '',
    notes: '',
    details: [{ good_id: '', quantity_assigned: 1 }],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignmentsRes, goodsRes] = await Promise.all([
        api.getAssignments(),
        api.getGoods(),
      ]);
      setAssignments(assignmentsRes.data);
      setGoods(goodsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.createAssignment(formData);
      toast.success('Asignación creada exitosamente');
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear asignación');
    }
  };

  const resetForm = () => {
    setFormData({
      instructor_name: '',
      discipline: '',
      notes: '',
      details: [{ good_id: '', quantity_assigned: 1 }],
    });
  };

  const addDetail = () => {
    setFormData({
      ...formData,
      details: [...formData.details, { good_id: '', quantity_assigned: 1 }],
    });
  };

  const removeDetail = (index) => {
    setFormData({
      ...formData,
      details: formData.details.filter((_, i) => i !== index),
    });
  };

  const updateDetail = (index, field, value) => {
    const newDetails = [...formData.details];
    newDetails[index][field] = value;
    setFormData({ ...formData, details: newDetails });
  };

  const getGoodName = (goodId) => {
    const good = goods.find((g) => g.id === goodId);
    return good ? good.name : 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="assignments-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Asignaciones</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="create-assignment-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Asignación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Asignación</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instructor">Nombre del Instructor</Label>
                  <Input
                    id="instructor"
                    value={formData.instructor_name}
                    onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                    required
                    data-testid="instructor-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="discipline">Disciplina</Label>
                  <Input
                    id="discipline"
                    value={formData.discipline}
                    onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                    required
                    data-testid="discipline-input"
                  />
                </div>
              </div>

              <div>
                <Label>Bienes a Asignar</Label>
                <div className="space-y-3 mt-2">
                  {formData.details.map((detail, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <select
                          value={detail.good_id}
                          onChange={(e) => updateDetail(index, 'good_id', e.target.value)}
                          className="w-full h-11 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                          data-testid={`good-select-${index}`}
                        >
                          <option value="">Seleccionar bien</option>
                          {goods
                            .filter((g) => g.available_quantity > 0)
                            .map((good) => (
                              <option key={good.id} value={good.id}>
                                {good.name} (Disponible: {good.available_quantity})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          value={detail.quantity_assigned}
                          onChange={(e) =>
                            updateDetail(index, 'quantity_assigned', parseInt(e.target.value) || 1)
                          }
                          required
                          data-testid={`quantity-input-${index}`}
                        />
                      </div>
                      {formData.details.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeDetail(index)}
                          data-testid={`remove-detail-${index}`}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDetail}
                  className="mt-3"
                  data-testid="add-detail-button"
                >
                  + Agregar Bien
                </Button>
              </div>

              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  data-testid="notes-input"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" data-testid="save-assignment-button">
                  Crear Asignación
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assignments list */}
      <div className="space-y-4">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="bg-white rounded-xl border border-slate-200 p-6 card-hover"
            data-testid={`assignment-card-${assignment.id}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{assignment.instructor_name}</h3>
                <p className="text-sm text-slate-600">{assignment.discipline}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                  {assignment.status}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(assignment.created_at).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Bienes asignados:</p>
              <div className="space-y-2">
                {assignment.details && assignment.details.map((detail) => (
                  <div key={detail.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700">{getGoodName(detail.good_id)}</span>
                    <span className="font-semibold text-slate-900">
                      Cantidad: {detail.quantity_assigned}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {assignment.notes && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">Notas:</span> {assignment.notes}
                </p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
              Creado por: {assignment.created_by}
            </div>
          </div>
        ))}

        {assignments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No hay asignaciones aún</p>
            <p className="text-slate-400 text-sm">Crea la primera asignación para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assignments;