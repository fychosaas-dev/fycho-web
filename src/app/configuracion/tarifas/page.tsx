'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface Tarifa {
  id: string;
  nombre: string;
  precio_hora: number;
  tipo: string | null;
  activa: boolean;
}

interface Suplemento {
  id: string;
  nombre: string;
  tipo_valor: string;
  valor: number;
  regla_auto: { tipo: string; umbral?: number; hora_inicio?: number; hora_fin?: number; km_minimo?: number } | null;
  activo: boolean;
}

type TarifaForm = {
  nombre: string;
  precio_hora: number;
  tipo: string;
};

type SuplementoForm = {
  nombre: string;
  tipo_valor: 'fijo' | 'porcentaje';
  valor: number;
  regla_tipo: string;
  regla_umbral?: number;
};

// --- Page ---

export default function TarifasPage() {
  const queryClient = useQueryClient();

  // --- Tarifa state ---
  const [tarifaModalOpen, setTarifaModalOpen] = useState(false);
  const [editingTarifa, setEditingTarifa] = useState<Tarifa | null>(null);

  // --- Suplemento state ---
  const [supModalOpen, setSupModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Suplemento | null>(null);

  // --- Queries ---
  const { data: tarifasRes, isLoading: loadingTarifas } = useQuery({
    queryKey: ['tarifas'],
    queryFn: () => api.get<Tarifa[]>('/api/config/tarifas/tarifas'),
  });
  const tarifas = tarifasRes?.data ?? [];

  const { data: supsRes, isLoading: loadingSups } = useQuery({
    queryKey: ['suplementos'],
    queryFn: () => api.get<Suplemento[]>('/api/config/tarifas/suplementos'),
  });
  const suplementos = supsRes?.data ?? [];

  // --- Tarifa mutations ---
  const createTarifa = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/config/tarifas/tarifas', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarifas'] }); setTarifaModalOpen(false); setEditingTarifa(null); },
  });

  const updateTarifa = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.put(`/api/config/tarifas/tarifas/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tarifas'] }); setTarifaModalOpen(false); setEditingTarifa(null); },
  });

  const deleteTarifa = useMutation({
    mutationFn: (id: string) => api.delete(`/api/config/tarifas/tarifas/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tarifas'] }),
  });

  // --- Suplemento mutations ---
  const createSup = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/config/tarifas/suplementos', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suplementos'] }); setSupModalOpen(false); setEditingSup(null); },
  });

  const updateSup = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.put(`/api/config/tarifas/suplementos/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suplementos'] }); setSupModalOpen(false); setEditingSup(null); },
  });

  const deleteSup = useMutation({
    mutationFn: (id: string) => api.delete(`/api/config/tarifas/suplementos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suplementos'] }),
  });

  return (
    <div className="space-y-10">
      {/* ===== TARIFAS SECTION ===== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tarifas</h1>
            <p className="text-gray-500 mt-1">Precios por hora para operarios.</p>
          </div>
          <button
            onClick={() => { setEditingTarifa(null); setTarifaModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva tarifa
          </button>
        </div>

        {loadingTarifas ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : tarifas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No hay tarifas. Crea la primera.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Precio/hora</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tarifas.map((t) => (
                  <tr key={t.id} className={!t.activa ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{t.precio_hora} €/h</td>
                    <td className="px-4 py-3">
                      <Badge color={t.tipo === 'festivo' ? 'yellow' : t.tipo === 'nocturno' ? 'blue' : t.tipo === 'extra' ? 'red' : 'gray'}>
                        {t.tipo ?? 'estándar'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={t.activa ? 'green' : 'red'}>{t.activa ? 'Activa' : 'Inactiva'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingTarifa(t); setTarifaModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {t.activa && (
                          <button onClick={() => { if (confirm(`¿Desactivar tarifa "${t.nombre}"?`)) deleteTarifa.mutate(t.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Desactivar">
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
      </section>

      {/* ===== SUPLEMENTOS SECTION ===== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Suplementos</h2>
            <p className="text-gray-500 mt-1">Recargos automáticos o manuales sobre tarifas base.</p>
          </div>
          <button
            onClick={() => { setEditingSup(null); setSupModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo suplemento
          </button>
        </div>

        {loadingSups ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : suplementos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No hay suplementos. Crea el primero.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Regla automática</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suplementos.map((s) => (
                  <tr key={s.id} className={!s.activo ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.nombre}</td>
                    <td className="px-4 py-3">
                      <Badge color={s.tipo_valor === 'fijo' ? 'blue' : 'yellow'}>{s.tipo_valor}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.tipo_valor === 'fijo' ? `${s.valor} €` : `${s.valor}%`}
                    </td>
                    <td className="px-4 py-3">
                      {s.regla_auto ? (
                        <Badge color="green">{s.regla_auto.tipo}</Badge>
                      ) : (
                        <span className="text-gray-400">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={s.activo ? 'green' : 'red'}>{s.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingSup(s); setSupModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {s.activo && (
                          <button onClick={() => { if (confirm(`¿Desactivar suplemento "${s.nombre}"?`)) deleteSup.mutate(s.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Desactivar">
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
      </section>

      {/* ===== MODALS ===== */}
      <Modal open={tarifaModalOpen} onClose={() => { setTarifaModalOpen(false); setEditingTarifa(null); }} title={editingTarifa ? 'Editar tarifa' : 'Nueva tarifa'}>
        <TarifaFormModal
          editing={editingTarifa}
          onSubmit={(data) => {
            const body = { nombre: data.nombre, precio_hora: Number(data.precio_hora), tipo: data.tipo || null };
            if (editingTarifa) updateTarifa.mutate({ id: editingTarifa.id, body });
            else createTarifa.mutate(body);
          }}
          isLoading={createTarifa.isPending || updateTarifa.isPending}
        />
      </Modal>

      <Modal open={supModalOpen} onClose={() => { setSupModalOpen(false); setEditingSup(null); }} title={editingSup ? 'Editar suplemento' : 'Nuevo suplemento'}>
        <SuplementoFormModal
          editing={editingSup}
          onSubmit={(data) => {
            const regla_auto = data.regla_tipo === 'ninguna' ? null : buildReglaAuto(data);
            const body = { nombre: data.nombre, tipo_valor: data.tipo_valor, valor: Number(data.valor), regla_auto };
            if (editingSup) updateSup.mutate({ id: editingSup.id, body });
            else createSup.mutate(body);
          }}
          isLoading={createSup.isPending || updateSup.isPending}
        />
      </Modal>
    </div>
  );
}

function buildReglaAuto(data: SuplementoForm): Record<string, unknown> | null {
  switch (data.regla_tipo) {
    case 'festivo': return { tipo: 'festivo' };
    case 'nocturno': return { tipo: 'nocturno', hora_inicio: 22, hora_fin: 6 };
    case 'horas_extra': return { tipo: 'horas_extra', umbral: Number(data.regla_umbral) || 8 };
    case 'desplazamiento': return { tipo: 'desplazamiento', km_minimo: Number(data.regla_umbral) || 10 };
    default: return null;
  }
}

// --- Tarifa form ---

function TarifaFormModal({ editing, onSubmit, isLoading }: {
  editing: Tarifa | null;
  onSubmit: (data: TarifaForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<TarifaForm>({
    defaultValues: editing
      ? { nombre: editing.nombre, precio_hora: editing.precio_hora, tipo: editing.tipo ?? 'estandar' }
      : { tipo: 'estandar' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input {...register('nombre', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio/hora (€)</label>
          <input type="number" step="0.01" {...register('precio_hora', { required: true, valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select {...register('tipo')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="estandar">Estándar</option>
            <option value="festivo">Festivo</option>
            <option value="nocturno">Nocturno</option>
            <option value="extra">Extra</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tarifa'}
        </button>
      </div>
    </form>
  );
}

// --- Suplemento form ---

function SuplementoFormModal({ editing, onSubmit, isLoading }: {
  editing: Suplemento | null;
  onSubmit: (data: SuplementoForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, watch } = useForm<SuplementoForm>({
    defaultValues: editing
      ? {
          nombre: editing.nombre,
          tipo_valor: editing.tipo_valor as 'fijo' | 'porcentaje',
          valor: editing.valor,
          regla_tipo: editing.regla_auto?.tipo ?? 'ninguna',
          regla_umbral: editing.regla_auto?.umbral ?? editing.regla_auto?.km_minimo,
        }
      : { tipo_valor: 'fijo', regla_tipo: 'ninguna' },
  });

  const reglaTipo = watch('regla_tipo');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input {...register('nombre', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo valor</label>
          <select {...register('tipo_valor')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="fijo">Fijo (€)</option>
            <option value="porcentaje">Porcentaje (%)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
          <input type="number" step="0.01" {...register('valor', { required: true, valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Regla automática</label>
        <select {...register('regla_tipo')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="ninguna">Ninguna (manual)</option>
          <option value="festivo">Festivo</option>
          <option value="nocturno">Nocturno (22:00-06:00)</option>
          <option value="horas_extra">Horas extra</option>
          <option value="desplazamiento">Desplazamiento</option>
        </select>
      </div>
      {reglaTipo === 'horas_extra' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Umbral (horas)</label>
          <input type="number" step="0.5" {...register('regla_umbral', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="8" />
        </div>
      )}
      {reglaTipo === 'desplazamiento' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Km mínimo</label>
          <input type="number" step="1" {...register('regla_umbral', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="10" />
        </div>
      )}
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear suplemento'}
        </button>
      </div>
    </form>
  );
}
