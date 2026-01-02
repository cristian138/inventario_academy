import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
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

const Sports = () => {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSport, setEditingSport] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = async () => {
    try {
      const response = await api.getSportsManagement();
      setSports(response.data);
    } catch (error) {
      toast.error('Error al cargar deportes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingSport) {
        await api.updateSport(editingSport.id, formData);
        toast.success('Deporte actualizado exitosamente');
      } else {
        await api.createSport(formData);
        toast.success('Deporte creado exitosamente');
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadSports();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar deporte');
    }
  };

  const handleEdit = (sport) => {
    setEditingSport(sport);
    setFormData({
      name: sport.name,
      description: sport.description,
    });
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (sportId, currentStatus) => {
    try {
      await api.updateSport(sportId, { active: !currentStatus });
      toast.success('Estado actualizado exitosamente');
      loadSports();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleDelete = async (sportId) => {
    if (!window.confirm('¿Estás seguro de eliminar este deporte?')) return;
    
    try {
      await api.deleteSport(sportId);
      toast.success('Deporte eliminado exitosamente');
      loadSports();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al eliminar deporte';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setEditingSport(null);
    setFormData({
      name: '',
      description: '',
    });
  };

  const filteredSports = sports.filter(
    (sport) =>
      sport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sport.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sports-page">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar deportes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-sports-input"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="create-sport-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Deporte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSport ? 'Editar Deporte' : 'Crear Deporte'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="sport-name-input"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  data-testid="sport-description-input"
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
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="save-sport-button">
                  {editingSport ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSports.map((sport) => (
          <div
            key={sport.id}
            className="bg-white rounded-xl border border-slate-200 p-6 card-hover"
            data-testid={`sport-card-${sport.id}`}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-slate-900">{sport.name}</h3>
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  sport.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {sport.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-4">{sport.description}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => handleEdit(sport)}
                size="sm"
                variant="outline"
                className="flex-1"
                data-testid={`edit-sport-${sport.id}`}
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button
                onClick={() => handleDelete(sport)}
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-50"
                data-testid={`delete-sport-${sport.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredSports.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 text-lg">No se encontraron deportes</p>
        </div>
      )}
    </div>
  );
};

export default Sports;
