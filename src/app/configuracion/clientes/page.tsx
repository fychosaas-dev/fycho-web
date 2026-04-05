'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface Cliente {
  id: string;
  nombre: string;
  datos_fiscales: {
    nif?: string;
    razon_social?: string;
    direccion?: string;
    cp?: string;
    ciudad?: string;
  } | null;
  email_factura: string | null;
  telefono: string | null;
  radio_geofence_m: number;
  notas_internas: string | null;
  activo: boolean;
}

// --- Zod schema ---

type ClienteForm = {
  nombre: string;
  nif?: string;
  direccion?: string;
  email_factura?: string;
  telefono?: string;
  radio_geofence_m: number;
  lat?: string;
  lng?: string;
  notas_internas?: string;
};

// --- Page ---

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  // Fetch clientes
  const { data: response, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.get<Cliente[]>('/api/config/clientes'),
  });

  const clientes = response?.data ?? [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/config/clientes', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      closeModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put(`/api/config/clientes/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      closeModal();
    },
  });

  // Delete mutation (deactivate)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/config/clientes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
  });

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(cliente: Cliente) {
    setEditing(cliente);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function transformFormToPayload(data: ClienteForm): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      nombre: data.nombre,
      datos_fiscales: {
        nif: data.nif || undefined,
        direccion: data.direccion || undefined,
      },
      email_factura: data.email_factura || null,
      telefono: data.telefono || null,
      radio_geofence_m: data.radio_geofence_m,
      notas_internas: data.notas_internas || null,
    };

    const lat = data.lat ? parseFloat(data.lat) : NaN;
    const lng = data.lng ? parseFloat(data.lng) : NaN;
    if (!isNaN(lat) && !isNaN(lng)) {
      payload.lat = lat;
      payload.lng = lng;
    }

    return payload;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Gestión de clientes Teams.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo cliente
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : clientes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No hay clientes. Crea el primero.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">NIF</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email factura</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Radio geofence</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientes.map((c) => (
                <tr key={c.id} className={!c.activo ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{c.datos_fiscales?.nif ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email_factura ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.radio_geofence_m} m</td>
                  <td className="px-4 py-3">
                    <Badge color={c.activo ? 'green' : 'red'}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {c.activo && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar a ${c.nombre}?`)) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
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
        title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <ClienteFormModal
          editing={editing}
          onSubmit={(data) => {
            const payload = transformFormToPayload(data);
            if (editing) {
              updateMutation.mutate({ id: editing.id, body: payload });
            } else {
              createMutation.mutate(payload);
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

function ClienteFormModal({
  editing,
  onSubmit,
  isLoading,
  error,
}: {
  editing: Cliente | null;
  onSubmit: (data: ClienteForm) => void;
  isLoading: boolean;
  error?: string;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ClienteForm>({
    defaultValues: editing
      ? {
          nombre: editing.nombre,
          nif: editing.datos_fiscales?.nif ?? '',
          direccion: editing.datos_fiscales?.direccion ?? '',
          email_factura: editing.email_factura ?? '',
          telefono: editing.telefono ?? '',
          radio_geofence_m: editing.radio_geofence_m,
          notas_internas: editing.notas_internas ?? '',
        }
      : {
          radio_geofence_m: 200,
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NIF</label>
          <input
            {...register('nif')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="B12345678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            {...register('telefono')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+34..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
        <input
          {...register('direccion')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Calle, número, ciudad"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email facturación</label>
        <input
          type="email"
          {...register('email_factura')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.email_factura && <p className="text-sm text-red-600 mt-1">{errors.email_factura.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Radio geofencing (metros)
        </label>
        <input
          type="number"
          {...register('radio_geofence_m')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">Mínimo 50m, máximo 5000m</p>
        {errors.radio_geofence_m && <p className="text-sm text-red-600 mt-1">{errors.radio_geofence_m.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
          <input
            type="number"
            step="any"
            {...register('lat')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="40.4168"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
          <input
            type="number"
            step="any"
            {...register('lng')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="-3.7038"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
        <textarea
          {...register('notas_internas')}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cliente'}
        </button>
      </div>
    </form>
  );
}
