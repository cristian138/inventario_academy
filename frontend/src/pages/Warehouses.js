import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Warehouse as WarehouseIcon } from 'lucide-react';
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

const Warehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: 0,
    responsible: '',
  });

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const response = await api.getWarehouses();
      setWarehouses(response.data);
    } catch (error) {
      toast.error('Error al cargar bodegas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingWarehouse) {
        await api.updateWarehouse(editingWarehouse.id, formData);
        toast.success('Bodega actualizada exitosamente');
      } else {
        await api.createWarehouse(formData);
        toast.success('Bodega creada exitosamente');
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar bodega');
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location,
      capacity: warehouse.capacity,
      responsible: warehouse.responsible,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (warehouseId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta bodega?')) return;
    
    try {
      await api.deleteWarehouse(warehouseId);
      toast.success('Bodega eliminada exitosamente');
      loadWarehouses();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al eliminar bodega';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      location: '',
      capacity: 0,
      responsible: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="warehouses-page">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Bodegas</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="create-warehouse-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Bodega
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWarehouse ? 'Editar Bodega' : 'Crear Bodega'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="warehouse-name-input"
                />
              </div>
              <div>
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  data-testid="warehouse-location-input"
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacidad</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="0"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                  required
                  data-testid="warehouse-capacity-input"
                />
              </div>
              <div>
                <Label htmlFor="responsible">Responsable</Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  required
                  data-testid="warehouse-responsible-input"
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
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="save-warehouse-button">
                  {editingWarehouse ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => (
          <div
            key={warehouse.id}
            className="bg-white rounded-xl border border-slate-200 p-6 card-hover"
            data-testid={`warehouse-card-${warehouse.id}`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <WarehouseIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-slate-900 mb-2">{warehouse.name}</h3>
                <div className="space-y-1 text-sm text-slate-600 mb-4">
                  <p><span className="font-semibold">Ubicación:</span> {warehouse.location}</p>
                  <p><span className="font-semibold">Capacidad:</span> {warehouse.capacity} m²</p>
                  <p><span className="font-semibold">Responsable:</span> {warehouse.responsible}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(warehouse)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    data-testid={`edit-warehouse-${warehouse.id}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDelete(warehouse.id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    data-testid={`delete-warehouse-${warehouse.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {warehouses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <WarehouseIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No hay bodegas aún</p>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
