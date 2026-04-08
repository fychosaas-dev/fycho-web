'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface Operario {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  modulos: string[];
  precio_hora_base: number | null;
  activo: boolean;
}

// --- Zod schema ---

type OperarioForm = {
  nombre: string;
  email: string;
  telefono?: string;
  rol: 'operario' | 'supervisor' | 'admin';
  modulos: ('teams' | 'demand')[];
  precio_hora_base?: number | null;
};

// --- Page ---

export default function OperariosPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Operario | null>(null);

  // Fetch operarios
  const { data: response, isLoading } = useQuery({
    queryKey: ['operarios'],
    queryFn: () => api.get<Operario[]>('/api/config/operarios'),
  });

  const operarios = response?.data ?? [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: OperarioForm) => api.post('/api/config/operarios', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operarios'] });
      closeModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<OperarioForm> }) =>
      api.put(`/api/config/operarios/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operarios'] });
      closeModal();
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/config/operarios/${id}/desactivar`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operarios'] }),
  });

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(op: Operario) {
    setEditing(op);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operarios</h1>
          <p className="text-gray-500 mt-1">Gestión de operarios de la empresa.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo operario
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : operarios.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No hay operarios. Crea el primero.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Módulos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Precio/h</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {operarios.map((op) => (
                <tr key={op.id} className={!op.activo ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{op.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{op.email}</td>
                  <td className="px-4 py-3">
                    <Badge color={op.rol === 'admin' ? 'blue' : op.rol === 'supervisor' ? 'yellow' : 'gray'}>
                      {op.rol}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {op.modulos?.map((m) => (
                        <Badge key={m} color={m === 'teams' ? 'blue' : 'green'}>{m}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {op.precio_hora_base ? `${op.precio_hora_base} €/h` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={op.activo ? 'green' : 'red'}>
                      {op.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(op)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {op.activo && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Desactivar a ${op.nombre}?`)) {
                              deactivateMutation.mutate(op.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Desactivar"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar operario' : 'Nuevo operario'}
      >
        <OperarioFormModal
          editing={editing}
          onSubmit={(data) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, body: data });
            } else {
              createMutation.mutate(data as OperarioForm);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
          error={createMutation.error?.message ?? updateMutation.error?.message}
        />
      </Modal>
    </div>
  );
}

// --- Form component ---

function OperarioFormModal({
  editing,
  onSubmit,
  isLoading,
  error,
}: {
  editing: Operario | null;
  onSubmit: (data: Partial<OperarioForm>) => void;
  isLoading: boolean;
  error?: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<OperarioForm>({
    defaultValues: editing
      ? {
          nombre: editing.nombre,
          email: editing.email,
          telefono: editing.telefono ?? '',
          rol: editing.rol as OperarioForm['rol'],
          modulos: editing.modulos as OperarioForm['modulos'],
          precio_hora_base: editing.precio_hora_base,
        }
      : {
          rol: 'operario',
          modulos: ['teams'],
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          {...register('nombre')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.nombre && <p className="text-sm text-red-600 mt-1">{errors.nombre.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          {...register('email')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
        <input
          {...register('telefono')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="+34..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            {...register('rol')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="operario">Operario</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio/hora base</label>
          <input
            type="number"
            step="0.01"
            {...register('precio_hora_base', { setValueAs: (v) => v === '' || v == null ? null : Number(v) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="15.00"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Módulos</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" value="teams" {...register('modulos')} className="rounded border-gray-300" />
            Teams
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" value="demand" {...register('modulos')} className="rounded border-gray-300" />
            Demand
          </label>
        </div>
        {errors.modulos && <p className="text-sm text-red-600 mt-1">{errors.modulos.message}</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear operario'}
        </button>
      </div>
    </form>
  );
}
