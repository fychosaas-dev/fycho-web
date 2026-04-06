'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { Plus, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, format, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface Turno {
  id: string;
  operario: { id: string; nombre: string } | null;
  cliente: { id: string; nombre: string } | null;
  tarifa: { id: string; nombre: string; precio_hora: number } | null;
  inicio_plan: string;
  fin_plan: string;
  estado: string;
  recurrente: boolean;
  notas: string | null;
}

interface SelectOption { id: string; nombre: string }

type TurnoForm = {
  operario_id: string;
  cliente_id: string;
  tarifa_id: string;
  inicio_plan: string;
  fin_plan: string;
  recurrente: boolean;
  freq: string;
  dias: number[];
  notas: string;
};

const estadoColor: Record<string, string> = {
  programado: 'blue',
  en_curso: 'yellow',
  completado: 'green',
  ausencia: 'red',
};

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// --- Page ---

export default function CalendarioPage() {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const currentWeekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addWeeks(base, weekOffset);
  }, [weekOffset]);

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const desde = currentWeekStart.toISOString();
  const hasta = currentWeekEnd.toISOString();

  // Fetch turnos for the week
  const { data: turnosRes, isLoading } = useQuery({
    queryKey: ['turnos', desde, hasta],
    queryFn: () => api.get<Turno[]>(`/api/teams/turnos?desde=${desde}&hasta=${hasta}&per_page=100`),
  });
  const turnos = turnosRes?.data ?? [];

  // Fetch select options
  const { data: operariosRes } = useQuery({
    queryKey: ['operarios-select'],
    queryFn: () => api.get<SelectOption[]>('/api/config/operarios?activo=true'),
  });
  const { data: clientesRes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: () => api.get<SelectOption[]>('/api/config/clientes?activo=true'),
  });
  const { data: tarifasRes } = useQuery({
    queryKey: ['tarifas-select'],
    queryFn: () => api.get<SelectOption[]>('/api/config/tarifas/tarifas'),
  });

  // Create mutation
  const createTurno = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/teams/turnos', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['turnos'] }); setModalOpen(false); },
  });

  // Cancel mutation
  const cancelTurno = useMutation({
    mutationFn: (id: string) => api.delete(`/api/teams/turnos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['turnos'] }),
  });

  function turnosForDay(day: Date): Turno[] {
    return turnos.filter((t) => isSameDay(parseISO(t.inicio_plan), day));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Turnos</h1>
          <p className="text-gray-500 mt-1">
            {format(currentWeekStart, "d 'de' MMMM", { locale: es })} — {format(currentWeekEnd, "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
            <button onClick={() => setWeekOffset((o) => o - 1)} className="p-2 hover:bg-gray-50 rounded-l-lg"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setWeekOffset(0)} className="px-3 py-2 text-sm hover:bg-gray-50">Hoy</button>
            <button onClick={() => setWeekOffset((o) => o + 1)} className="p-2 hover:bg-gray-50 rounded-r-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo turno
          </button>
        </div>
      </div>

      {/* Week grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayTurnos = turnosForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={`bg-white rounded-xl border ${isToday ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'} min-h-[200px]`}>
                <div className={`px-3 py-2 border-b ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} rounded-t-xl`}>
                  <p className="text-xs font-medium text-gray-500">{format(day, 'EEE', { locale: es })}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>{format(day, 'd')}</p>
                </div>
                <div className="p-2 space-y-2">
                  {dayTurnos.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-4">Sin turnos</p>
                  ) : (
                    dayTurnos.map((t) => (
                      <div key={t.id} className="p-2 bg-gray-50 rounded-lg text-xs space-y-1 group relative">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 truncate">{t.operario?.nombre ?? '—'}</span>
                          {t.estado !== 'completado' && t.estado !== 'ausencia' && (
                            <button
                              onClick={() => { if (confirm('¿Cancelar este turno?')) cancelTurno.mutate(t.id); }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                              title="Cancelar turno"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-500 truncate">{t.cliente?.nombre ?? '—'}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">
                            {format(parseISO(t.inicio_plan), 'HH:mm')}–{format(parseISO(t.fin_plan), 'HH:mm')}
                          </span>
                          <Badge color={estadoColor[t.estado] ?? 'gray'}>{t.estado}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo turno">
        <TurnoFormModal
          operarios={operariosRes?.data ?? []}
          clientes={clientesRes?.data ?? []}
          tarifas={tarifasRes?.data ?? []}
          onSubmit={(data) => {
            const body: Record<string, unknown> = {
              operario_id: data.operario_id,
              cliente_id: data.cliente_id,
              tarifa_id: data.tarifa_id,
              inicio_plan: data.inicio_plan,
              fin_plan: data.fin_plan,
              recurrente: data.recurrente,
              notas: data.notas || null,
            };
            if (data.recurrente) {
              if (data.freq === 'weekly') {
                body.regla_recurrencia = { freq: 'weekly', dias: data.dias.map(Number) };
              } else if (data.freq === 'monthly') {
                body.regla_recurrencia = { freq: 'monthly', dia: new Date(data.inicio_plan).getDate() };
              } else {
                body.regla_recurrencia = { freq: 'daily' };
              }
            }
            createTurno.mutate(body);
          }}
          isLoading={createTurno.isPending}
        />
      </Modal>
    </div>
  );
}

// --- Form ---

function TurnoFormModal({ operarios, clientes, tarifas, onSubmit, isLoading }: {
  operarios: SelectOption[];
  clientes: SelectOption[];
  tarifas: SelectOption[];
  onSubmit: (data: TurnoForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, watch, control } = useForm<TurnoForm>({
    defaultValues: { recurrente: false, freq: 'weekly', dias: [] },
  });

  const isRecurrente = watch('recurrente');
  const freq = watch('freq');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operario</label>
        <select {...register('operario_id', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Seleccionar...</option>
          {operarios.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
        <select {...register('cliente_id', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Seleccionar...</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa</label>
        <select {...register('tarifa_id', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Seleccionar...</option>
          {tarifas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Inicio</label>
          <input type="datetime-local" {...register('inicio_plan', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
          <input type="datetime-local" {...register('fin_plan', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('recurrente')} className="rounded border-gray-300" />
          <span className="font-medium text-gray-700">Turno recurrente</span>
        </label>

        {isRecurrente && (
          <div className="pl-6 space-y-3 border-l-2 border-blue-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
              <select {...register('freq')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>

            {freq === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Días de la semana</label>
                <Controller
                  control={control}
                  name="dias"
                  render={({ field }) => (
                    <div className="flex gap-2">
                      {DIAS_SEMANA.map((label, i) => {
                        const selected = (field.value ?? []).includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const current = field.value ?? [];
                              field.onChange(selected ? current.filter((d: number) => d !== i) : [...current, i]);
                            }}
                            className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                              selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea {...register('notas')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Creando...' : 'Crear turno'}
        </button>
      </div>
    </form>
  );
}
