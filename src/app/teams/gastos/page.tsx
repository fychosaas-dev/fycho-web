'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface Gasto {
  id: string;
  operario: { id: string; nombre: string } | null;
  categoria: string;
  importe: number;
  descripcion: string | null;
  foto_url: string | null;
  fecha: string;
  estado: string;
  nota_admin: string | null;
}

interface SelectOption { id: string; nombre: string }

type RechazoForm = { nota_admin: string };

const estadoColor: Record<string, string> = {
  pendiente: 'yellow',
  aprobado: 'green',
  rechazado: 'red',
};

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
];

// --- Page ---

export default function GastosPage() {
  const queryClient = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [filtroOperario, setFiltroOperario] = useState('');
  const [rechazoModal, setRechazoModal] = useState<string | null>(null);

  // Build query params
  const params = new URLSearchParams({ per_page: '50' });
  if (filtroEstado) params.set('estado', filtroEstado);
  if (filtroOperario) params.set('operario_id', filtroOperario);

  // Fetch gastos
  const { data: gastosRes, isLoading } = useQuery({
    queryKey: ['gastos', filtroEstado, filtroOperario],
    queryFn: () => api.get<Gasto[]>(`/api/teams/gastos?${params.toString()}`),
  });
  const gastos = gastosRes?.data ?? [];

  // Fetch operarios for filter
  const { data: operariosRes } = useQuery({
    queryKey: ['operarios-select'],
    queryFn: () => api.get<SelectOption[]>('/api/config/operarios?activo=true'),
  });
  const operarios = operariosRes?.data ?? [];

  // Approve mutation
  const aprobarMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/teams/gastos/${id}/aprobar`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gastos'] }),
  });

  // Reject mutation
  const rechazarMutation = useMutation({
    mutationFn: ({ id, nota_admin }: { id: string; nota_admin: string }) =>
      api.put(`/api/teams/gastos/${id}/rechazar`, { nota_admin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      setRechazoModal(null);
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gastos de Operarios</h1>
        <p className="text-gray-500 mt-1">Revisa y aprueba los gastos registrados por los operarios.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <label className="text-sm font-medium text-gray-600 mr-2">Estado:</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 mr-2">Operario:</label>
          <select
            value={filtroOperario}
            onChange={(e) => setFiltroOperario(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {operarios.map((o) => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : gastos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay gastos con los filtros seleccionados.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Operario</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Importe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Foto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-3 text-gray-600">
                    {format(parseISO(g.fecha), "d MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{g.operario?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color="gray">{g.categoria}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{g.importe.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{g.descripcion ?? '—'}</td>
                  <td className="px-4 py-3">
                    {g.foto_url ? (
                      <a href={g.foto_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={estadoColor[g.estado] ?? 'gray'}>{g.estado}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {g.estado === 'pendiente' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => aprobarMutation.mutate(g.id)}
                          disabled={aprobarMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                          title="Aprobar"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRechazoModal(g.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Rechazar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : g.estado === 'rechazado' && g.nota_admin ? (
                      <span className="text-xs text-gray-400" title={g.nota_admin}>Nota: {g.nota_admin}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject modal */}
      <Modal open={rechazoModal !== null} onClose={() => setRechazoModal(null)} title="Rechazar gasto">
        <RechazoFormModal
          onSubmit={(data) => {
            if (rechazoModal) rechazarMutation.mutate({ id: rechazoModal, nota_admin: data.nota_admin });
          }}
          isLoading={rechazarMutation.isPending}
        />
      </Modal>
    </div>
  );
}

// --- Rechazo Form ---

function RechazoFormModal({ onSubmit, isLoading }: {
  onSubmit: (data: RechazoForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<RechazoForm>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del rechazo</label>
        <textarea
          {...register('nota_admin', { required: true })}
          rows={3}
          placeholder="Indica el motivo del rechazo..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">Este campo es obligatorio.</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Rechazando...' : 'Rechazar gasto'}
        </button>
      </div>
    </form>
  );
}
