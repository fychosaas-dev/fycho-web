'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface Material {
  id: string;
  nombre: string;
  unidad: string | null;
  coste_ref: number | null;
  categoria: string | null;
  facturable: boolean;
  activo: boolean;
}

type MaterialForm = {
  nombre: string;
  unidad: string;
  coste_ref: number;
  categoria: string;
  facturable: boolean;
};

const CATEGORIAS = [
  { value: '', label: 'Todas' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'epi', label: 'EPI' },
  { value: 'fontaneria', label: 'Fontanería' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'otro', label: 'Otro' },
];

const UNIDADES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'kg', label: 'Kg' },
  { value: 'litro', label: 'Litro' },
  { value: 'metro', label: 'Metro' },
  { value: 'caja', label: 'Caja' },
];

// --- Page ---

export default function MaterialesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Fetch
  const { data: response, isLoading } = useQuery({
    queryKey: ['materiales'],
    queryFn: () => api.get<Material[]>('/api/config/materiales'),
  });
  const allMateriales = response?.data ?? [];
  const materiales = filtroCategoria
    ? allMateriales.filter((m) => m.categoria === filtroCategoria)
    : allMateriales;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/config/materiales', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materiales'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.put(`/api/config/materiales/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materiales'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/config/materiales/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['materiales'] }),
  });

  function closeModal() { setModalOpen(false); setEditing(null); }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiales</h1>
          <p className="text-gray-500 mt-1">Catálogo de materiales con flag facturable.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo material
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-600 mr-2">Filtrar por categoría:</label>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : materiales.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filtroCategoria ? 'No hay materiales en esta categoría.' : 'No hay materiales. Crea el primero.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unidad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Coste ref.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Facturable</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materiales.map((m) => (
                <tr key={m.id} className={!m.activo ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{m.unidad ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.coste_ref != null ? `${m.coste_ref} €` : '—'}</td>
                  <td className="px-4 py-3">
                    {m.categoria ? <Badge color="gray">{m.categoria}</Badge> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={m.facturable ? 'green' : 'gray'}>
                      {m.facturable ? 'Sí' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={m.activo ? 'green' : 'red'}>{m.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditing(m); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {m.activo && (
                        <button onClick={() => { if (confirm(`¿Desactivar material "${m.nombre}"?`)) deleteMutation.mutate(m.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Desactivar">
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
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar material' : 'Nuevo material'}>
        <MaterialFormModal
          editing={editing}
          onSubmit={(data) => {
            const body = {
              nombre: data.nombre,
              unidad: data.unidad || null,
              coste_ref: data.coste_ref ? Number(data.coste_ref) : null,
              categoria: data.categoria || null,
              facturable: data.facturable,
            };
            if (editing) updateMutation.mutate({ id: editing.id, body });
            else createMutation.mutate(body);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}

// --- Form ---

function MaterialFormModal({ editing, onSubmit, isLoading }: {
  editing: Material | null;
  onSubmit: (data: MaterialForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<MaterialForm>({
    defaultValues: editing
      ? {
          nombre: editing.nombre,
          unidad: editing.unidad ?? 'unidad',
          coste_ref: editing.coste_ref ?? 0,
          categoria: editing.categoria ?? '',
          facturable: editing.facturable,
        }
      : { unidad: 'unidad', facturable: false },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input {...register('nombre', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
          <select {...register('unidad')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            {UNIDADES.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coste referencia (€)</label>
          <input type="number" step="0.01" {...register('coste_ref', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select {...register('categoria')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Sin categoría</option>
          {CATEGORIAS.filter((c) => c.value).map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('facturable')} className="rounded border-gray-300" />
          <span className="font-medium text-gray-700">Facturable al cliente</span>
        </label>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear material'}
        </button>
      </div>
    </form>
  );
}
