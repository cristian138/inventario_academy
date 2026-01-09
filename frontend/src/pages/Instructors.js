import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, UserCheck, UserX, Key } from 'lucide-react';
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
import { Badge } from '../components/ui/badge';

const Instructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    password: '',
  });

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    try {
      const response = await api.getInstructorsManagement();
      setInstructors(response.data);
    } catch (error) {
      toast.error('Error al cargar instructores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingInstructor) {
        await api.updateInstructor(editingInstructor.id, formData);
        toast.success('Instructor actualizado exitosamente');
      } else {
        await api.createInstructor(formData);
        toast.success('Instructor creado exitosamente');
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadInstructors();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar instructor');
    }
  };

  const handleEdit = (instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      name: instructor.name,
      email: instructor.email,
      phone: instructor.phone,
      specialization: instructor.specialization,
      password: '', // Don't show existing password
    });
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (instructorId, currentStatus) => {
    try {
      await api.updateInstructor(instructorId, { active: !currentStatus });
      toast.success('Estado actualizado exitosamente');
      loadInstructors();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleDelete = async (instructorId) => {
    if (!window.confirm('¿Estás seguro de eliminar este instructor?')) return;
    
    try {
      await api.deleteInstructor(instructorId);
      toast.success('Instructor eliminado exitosamente');
      loadInstructors();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al eliminar instructor';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setEditingInstructor(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialization: '',
      password: '',
    });
  };

  const filteredInstructors = instructors.filter(
    (instructor) =>
      instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="instructors-page">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar instructores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-instructors-input"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="create-instructor-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Instructor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingInstructor ? 'Editar Instructor' : 'Crear Instructor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="instructor-name-input"
                />
              </div>
              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="instructor-email-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  data-testid="instructor-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="specialization">Especialización</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  required
                  data-testid="instructor-specialization-input"
                />
              </div>
              <div className="border-t pt-4 mt-4">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Contraseña de Acceso
                  <span className="text-xs text-slate-500 font-normal">(opcional)</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingInstructor ? "Dejar vacío para mantener la actual" : "Crear contraseña para acceso al portal"}
                  data-testid="instructor-password-input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Si asigna una contraseña, el instructor podrá iniciar sesión para ver sus bienes asignados.
                </p>
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
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="save-instructor-button">
                  {editingInstructor ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Instructor
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Especialización
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Acceso
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInstructors.map((instructor) => (
                <tr
                  key={instructor.id}
                  className="hover:bg-slate-50 transition-colors duration-200"
                  data-testid={`instructor-row-${instructor.id}`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">{instructor.name}</p>
                      <p className="text-sm text-slate-600">{instructor.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700">{instructor.specialization}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700">{instructor.phone}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        instructor.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {instructor.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {instructor.has_login ? (
                      <Badge className="bg-blue-100 text-blue-700">
                        <Key className="w-3 h-3 mr-1" />
                        Habilitado
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">Sin acceso</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(instructor)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        data-testid={`edit-instructor-${instructor.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(instructor.id, instructor.active)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors duration-200"
                        data-testid={`toggle-instructor-${instructor.id}`}
                      >
                        {instructor.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(instructor.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        data-testid={`delete-instructor-${instructor.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredInstructors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No se encontraron instructores</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Instructors;