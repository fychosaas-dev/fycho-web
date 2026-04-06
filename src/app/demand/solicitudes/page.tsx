'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CheckCircle, UserPlus, XCircle, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface Reserva {
  id: string;
  fecha_hora: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  servicio: { id: string; nombre: string } | null;
  direccion: string | null;
  operario: { id: string; nombre: string } | null;
  estado: string;
  notas: string | null;
  precio_estimado: number | null;
  duracion_estimada_min: number | null;
}

interface SelectOption { id: string; nombre: string }

type AsignarForm = { operario_id: string };

const estadoColor: Record<string, string> = {
  nueva: 'yellow',
  confirmada: 'blue',
  asignada: 'green',
  en_curso: 'purple',
  completada: 'gray',
  cancelada: 'red',
};

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'nueva', label: 'Nueva' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'asignada', label: 'Asignada' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
];

// --- Page ---

export default function SolicitudesPage() {
  const queryClient = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [asignarModal, setAsignarModal] = useState<string | null>(null);

  // Build query params
  const params = new URLSearchParams({ per_page: '50' });
  if (filtroEstado) params.set('estado', filtroEstado);
  if (filtroFecha) params.set('fecha', filtroFecha);

  // Fetch reservas
  const { data: reservasRes, isLoading } = useQuery({
    queryKey: ['reservas', filtroEstado, filtroFecha],
    queryFn: () => api.get<Reserva[]>(`/api/demand/reservas?${params.toString()}`),
  });
  const reservas = reservasRes?.data ?? [];

  // Fetch operarios for assignment
  const { data: operariosRes } = useQuery({
    queryKey: ['operarios-select'],
    queryFn: () => api.get<SelectOption[]>('/api/config/operarios?activo=true'),
  });
  const operarios = operariosRes?.data ?? [];

  // Confirm mutation
  const confirmarMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/demand/reservas/${id}`, { estado: 'confirmada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      setSelectedReserva(null);
    },
  });

  // Assign mutation
  const asignarMutation = useMutation({
    mutationFn: ({ id, operario_id }: { id: string; operario_id: string }) =>
      api.put(`/api/demand/reservas/${id}`, { operario_id, estado: 'asignada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      setAsignarModal(null);
      setSelectedReserva(null);
    },
  });

  // Cancel mutation
  const cancelarMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/demand/reservas/${id}`, { estado: 'cancelada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservas'] });
      setSelectedReserva(null);
    },
  });

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className={`flex-1 ${selectedReserva ? 'max-w-[calc(100%-380px)]' : ''}`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes y Reservas</h1>
          <p className="text-gray-500 mt-1">Gestiona las reservas del portal Demand.</p>
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
            <label className="text-sm font-medium text-gray-600 mr-2">Fecha:</label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {filtroFecha && (
              <button onClick={() => setFiltroFecha('')} className="ml-1 text-gray-400 hover:text-gray-600 text-sm">
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : reservas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No hay reservas con los filtros seleccionados.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Servicio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Dirección</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Operario</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservas.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedReserva(r)}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedReserva?.id === r.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-900">
                      {format(parseISO(r.fecha_hora), "d MMM yyyy HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.cliente_nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{r.servicio?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{r.direccion ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.operario?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={estadoColor[r.estado] ?? 'gray'}>{r.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {r.estado === 'nueva' && (
                          <button
                            onClick={() => confirmarMutation.mutate(r.id)}
                            disabled={confirmarMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Confirmar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {(r.estado === 'nueva' || r.estado === 'confirmada') && (
                          <button
                            onClick={() => setAsignarModal(r.id)}
                            className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                            title="Asignar operario"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                        {r.estado !== 'completada' && r.estado !== 'cancelada' && (
                          <button
                            onClick={() => { if (confirm('¿Cancelar esta reserva?')) cancelarMutation.mutate(r.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Cancelar"
                          >
                            <XCircle className="w-4 h-4" />
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
      </div>

      {/* Detail side panel */}
      {selectedReserva && (
        <div className="w-[360px] shrink-0 bg-white rounded-xl border border-gray-200 p-5 h-fit sticky top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Detalle de reserva</h3>
            <button onClick={() => setSelectedReserva(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Estado</span>
              <div className="mt-0.5">
                <Badge color={estadoColor[selectedReserva.estado] ?? 'gray'}>{selectedReserva.estado}</Badge>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Fecha y hora</span>
              <p className="font-medium text-gray-900">
                {format(parseISO(selectedReserva.fecha_hora), "EEEE d 'de' MMMM yyyy, HH:mm", { locale: es })}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Cliente</span>
              <p className="font-medium text-gray-900">{selectedReserva.cliente_nombre}</p>
              {selectedReserva.cliente_telefono && <p className="text-gray-600">{selectedReserva.cliente_telefono}</p>}
              {selectedReserva.cliente_email && <p className="text-gray-600">{selectedReserva.cliente_email}</p>}
            </div>
            <div>
              <span className="text-gray-500">Servicio</span>
              <p className="font-medium text-gray-900">{selectedReserva.servicio?.nombre ?? '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Dirección</span>
              <p className="font-medium text-gray-900">{selectedReserva.direccion ?? '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Operario asignado</span>
              <p className="font-medium text-gray-900">{selectedReserva.operario?.nombre ?? 'Sin asignar'}</p>
            </div>
            {selectedReserva.precio_estimado != null && (
              <div>
                <span className="text-gray-500">Precio estimado</span>
                <p className="font-medium text-gray-900">{selectedReserva.precio_estimado.toFixed(2)} €</p>
              </div>
            )}
            {selectedReserva.duracion_estimada_min != null && (
              <div>
                <span className="text-gray-500">Duración estimada</span>
                <p className="font-medium text-gray-900">{selectedReserva.duracion_estimada_min} min</p>
              </div>
            )}
            {selectedReserva.notas && (
              <div>
                <span className="text-gray-500">Notas</span>
                <p className="text-gray-700">{selectedReserva.notas}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-5 pt-4 border-t border-gray-200">
            {selectedReserva.estado === 'nueva' && (
              <button
                onClick={() => confirmarMutation.mutate(selectedReserva.id)}
                disabled={confirmarMutation.isPending}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Confirmar
              </button>
            )}
            {(selectedReserva.estado === 'nueva' || selectedReserva.estado === 'confirmada') && (
              <button
                onClick={() => setAsignarModal(selectedReserva.id)}
                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                Asignar
              </button>
            )}
            {selectedReserva.estado !== 'completada' && selectedReserva.estado !== 'cancelada' && (
              <button
                onClick={() => { if (confirm('¿Cancelar esta reserva?')) cancelarMutation.mutate(selectedReserva.id); }}
                className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Assign modal */}
      <Modal open={asignarModal !== null} onClose={() => setAsignarModal(null)} title="Asignar operario">
        <AsignarFormModal
          operarios={operarios}
          onSubmit={(data) => {
            if (asignarModal) asignarMutation.mutate({ id: asignarModal, operario_id: data.operario_id });
          }}
          isLoading={asignarMutation.isPending}
        />
      </Modal>
    </div>
  );
}

// --- Assign Form ---

function AsignarFormModal({ operarios, onSubmit, isLoading }: {
  operarios: SelectOption[];
  onSubmit: (data: AsignarForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<AsignarForm>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operario</label>
        <select
          {...register('operario_id', { required: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar operario...</option>
          {operarios.map((o) => (
            <option key={o.id} value={o.id}>{o.nombre}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Asignando...' : 'Asignar operario'}
        </button>
      </div>
    </form>
  );
}
