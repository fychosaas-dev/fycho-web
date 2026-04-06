'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface FranjaHoraria {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  buffer_minutos: number;
  max_servicios: number;
  activo: boolean;
}

interface Bloqueo {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
}

type FranjaForm = {
  hora_inicio: string;
  hora_fin: string;
  buffer_minutos: number;
  max_servicios: number;
  activo: boolean;
};

type BloqueoForm = {
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
};

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// --- Page ---

export default function AgendaPage() {
  const queryClient = useQueryClient();
  const [editingFranja, setEditingFranja] = useState<FranjaHoraria | null>(null);
  const [franjaModalOpen, setFranjaModalOpen] = useState(false);
  const [bloqueoModalOpen, setBloqueoModalOpen] = useState(false);

  // Fetch agenda (franjas horarias)
  const { data: agendaRes, isLoading: loadingAgenda } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => api.get<FranjaHoraria[]>('/api/demand/agenda'),
  });
  const franjas = agendaRes?.data ?? [];

  // Fetch bloqueos
  const { data: bloqueosRes, isLoading: loadingBloqueos } = useQuery({
    queryKey: ['bloqueos'],
    queryFn: () => api.get<Bloqueo[]>('/api/demand/bloqueos'),
  });
  const bloqueos = bloqueosRes?.data ?? [];

  // Update franja mutation
  const updateFranja = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put(`/api/demand/agenda/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      closeFranjaModal();
    },
  });

  // Create bloqueo mutation
  const createBloqueo = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/demand/bloqueos', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloqueos'] });
      setBloqueoModalOpen(false);
    },
  });

  // Delete bloqueo mutation
  const deleteBloqueo = useMutation({
    mutationFn: (id: string) => api.delete(`/api/demand/bloqueos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bloqueos'] }),
  });

  function closeFranjaModal() {
    setFranjaModalOpen(false);
    setEditingFranja(null);
  }

  // Sort franjas by dia_semana (Monday first: 1,2,3,4,5,6,0)
  const franjasSorted = [...franjas].sort((a, b) => {
    const order = (d: number) => (d === 0 ? 7 : d);
    return order(a.dia_semana) - order(b.dia_semana);
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda Demand</h1>
        <p className="text-gray-500 mt-1">Configura los horarios de disponibilidad y bloqueos para reservas.</p>
      </div>

      {/* Horarios semanales */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Horarios semanales</h2>
        {loadingAgenda ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : franjas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No hay franjas horarias configuradas.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Día</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Hora inicio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Hora fin</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Buffer (min)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Máx. servicios</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {franjasSorted.map((f) => (
                  <tr key={f.id} className={!f.activo ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-900">{DIAS_SEMANA[f.dia_semana]}</td>
                    <td className="px-4 py-3 text-gray-600">{f.hora_inicio}</td>
                    <td className="px-4 py-3 text-gray-600">{f.hora_fin}</td>
                    <td className="px-4 py-3 text-gray-600">{f.buffer_minutos} min</td>
                    <td className="px-4 py-3 text-gray-600">{f.max_servicios}</td>
                    <td className="px-4 py-3">
                      <Badge color={f.activo ? 'green' : 'red'}>{f.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditingFranja(f); setFranjaModalOpen(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bloqueos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Bloqueos</h2>
          <button
            onClick={() => setBloqueoModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir bloqueo
          </button>
        </div>

        {loadingBloqueos ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : bloqueos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No hay bloqueos activos.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha inicio</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha fin</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Motivo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bloqueos.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-gray-900">
                      {format(parseISO(b.fecha_inicio), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {format(parseISO(b.fecha_fin), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.motivo ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { if (confirm('¿Eliminar este bloqueo?')) deleteBloqueo.mutate(b.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit franja modal */}
      <Modal open={franjaModalOpen} onClose={closeFranjaModal} title={`Editar — ${editingFranja ? DIAS_SEMANA[editingFranja.dia_semana] : ''}`}>
        {editingFranja && (
          <FranjaFormModal
            franja={editingFranja}
            onSubmit={(data) => {
              updateFranja.mutate({
                id: editingFranja.id,
                body: {
                  hora_inicio: data.hora_inicio,
                  hora_fin: data.hora_fin,
                  buffer_minutos: Number(data.buffer_minutos),
                  max_servicios: Number(data.max_servicios),
                  activo: data.activo,
                },
              });
            }}
            isLoading={updateFranja.isPending}
          />
        )}
      </Modal>

      {/* Create bloqueo modal */}
      <Modal open={bloqueoModalOpen} onClose={() => setBloqueoModalOpen(false)} title="Añadir bloqueo">
        <BloqueoFormModal
          onSubmit={(data) => {
            createBloqueo.mutate({
              fecha_inicio: data.fecha_inicio,
              fecha_fin: data.fecha_fin,
              motivo: data.motivo || null,
            });
          }}
          isLoading={createBloqueo.isPending}
        />
      </Modal>
    </div>
  );
}

// --- Franja Form ---

function FranjaFormModal({ franja, onSubmit, isLoading }: {
  franja: FranjaHoraria;
  onSubmit: (data: FranjaForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<FranjaForm>({
    defaultValues: {
      hora_inicio: franja.hora_inicio,
      hora_fin: franja.hora_fin,
      buffer_minutos: franja.buffer_minutos,
      max_servicios: franja.max_servicios,
      activo: franja.activo,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
          <input type="time" {...register('hora_inicio', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
          <input type="time" {...register('hora_fin', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buffer entre servicios (min)</label>
          <input type="number" {...register('buffer_minutos', { required: true, valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Máx. servicios/día</label>
          <input type="number" {...register('max_servicios', { required: true, valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('activo')} className="rounded border-gray-300" />
          <span className="font-medium text-gray-700">Día activo</span>
        </label>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

// --- Bloqueo Form ---

function BloqueoFormModal({ onSubmit, isLoading }: {
  onSubmit: (data: BloqueoForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<BloqueoForm>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
          <input type="date" {...register('fecha_inicio', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
          <input type="date" {...register('fecha_fin', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
        <input {...register('motivo')} placeholder="Vacaciones, festivo, mantenimiento..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Creando...' : 'Crear bloqueo'}
        </button>
      </div>
    </form>
  );
}
