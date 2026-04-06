'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { FileText, CheckCircle, Mail, Upload, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface Factura {
  id: string;
  numero: string;
  cliente: { id: string; nombre: string } | null;
  tipo: string;
  fecha: string;
  total: number;
  estado: string;
  erp_enviado: boolean;
  pdf_url: string | null;
}

interface SelectOption { id: string; nombre: string }

type GenerarPeriodicaForm = {
  cliente_id: string;
  periodo_inicio: string;
  periodo_fin: string;
};

const estadoColor: Record<string, string> = {
  borrador: 'gray',
  aprobada: 'blue',
  enviada: 'green',
  pagada: 'purple',
};

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'pagada', label: 'Pagada' },
];

const TIPOS = [
  { value: '', label: 'Todos' },
  { value: 'periodica', label: 'Periódica' },
  { value: 'servicio', label: 'Servicio' },
];

// --- Page ---

export default function FacturacionPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'teams' | 'demand'>('teams');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [generarModal, setGenerarModal] = useState(false);

  // Build query params
  const params = new URLSearchParams({ per_page: '50' });
  if (filtroEstado) params.set('estado', filtroEstado);
  if (filtroTipo) params.set('tipo', filtroTipo);
  if (filtroFecha) params.set('fecha', filtroFecha);
  params.set('modulo', tab);

  // Fetch facturas
  const { data: facturasRes, isLoading } = useQuery({
    queryKey: ['facturas', tab, filtroEstado, filtroTipo, filtroFecha],
    queryFn: () => api.get<Factura[]>(`/api/billing/facturas?${params.toString()}`),
  });
  const facturas = facturasRes?.data ?? [];

  // Fetch clientes for modal
  const { data: clientesRes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: () => api.get<SelectOption[]>('/api/config/clientes?activo=true'),
  });
  const clientes = clientesRes?.data ?? [];

  // Check if ERP is configured
  const { data: erpConfigRes } = useQuery({
    queryKey: ['erp-config'],
    queryFn: () => api.get<{ provider: string } | null>('/api/billing/erp/config'),
  });
  const erpConfigured = !!erpConfigRes?.data;

  // Generate periódica mutation
  const generarPeriodica = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/billing/facturas/generar-periodica', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      setGenerarModal(false);
    },
  });

  // Approve mutation
  const aprobarMutation = useMutation({
    mutationFn: (id: string) => api.put(`/api/billing/facturas/${id}/aprobar`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['facturas'] }),
  });

  // Send email mutation
  const enviarEmailMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/billing/facturas/${id}/enviar`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['facturas'] }),
  });

  // Send to ERP mutation
  const enviarErpMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/billing/erp/enviar/${id}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['facturas'] }),
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-500 mt-1">Generación y gestión de facturas.</p>
        </div>
        {tab === 'teams' && (
          <button
            onClick={() => setGenerarModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generar factura periódica
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab('teams')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'teams'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Teams
        </button>
        <button
          onClick={() => setTab('demand')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'demand'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Demand
        </button>
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
          <label className="text-sm font-medium text-gray-600 mr-2">Tipo:</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
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
      ) : facturas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay facturas con los filtros seleccionados.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Número</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ERP</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{f.numero}</td>
                  <td className="px-4 py-3 text-gray-900">{f.cliente?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={f.tipo === 'periodica' ? 'blue' : 'green'}>
                      {f.tipo === 'periodica' ? 'Periódica' : 'Servicio'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {format(parseISO(f.fecha), "d MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{f.total.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <Badge color={estadoColor[f.estado] ?? 'gray'}>{f.estado}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={f.erp_enviado ? 'green' : 'gray'}>
                      {f.erp_enviado ? 'Enviado' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Ver PDF */}
                      {f.pdf_url && (
                        <a
                          href={f.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                          title="Ver PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                      {/* Aprobar */}
                      {f.estado === 'borrador' && (
                        <button
                          onClick={() => aprobarMutation.mutate(f.id)}
                          disabled={aprobarMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                          title="Aprobar"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {/* Enviar email */}
                      {f.estado === 'aprobada' && (
                        <button
                          onClick={() => { if (confirm('¿Enviar factura por email al cliente?')) enviarEmailMutation.mutate(f.id); }}
                          disabled={enviarEmailMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                          title="Enviar por email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
                      {/* Enviar a ERP */}
                      {erpConfigured && !f.erp_enviado && (f.estado === 'aprobada' || f.estado === 'enviada') && (
                        <button
                          onClick={() => { if (confirm('¿Enviar factura al ERP?')) enviarErpMutation.mutate(f.id); }}
                          disabled={enviarErpMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                          title="Enviar a ERP"
                        >
                          <Upload className="w-4 h-4" />
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

      {/* Generate modal */}
      <Modal open={generarModal} onClose={() => setGenerarModal(false)} title="Generar factura periódica">
        <GenerarPeriodicaFormModal
          clientes={clientes}
          onSubmit={(data) => {
            generarPeriodica.mutate({
              cliente_id: data.cliente_id,
              periodo_inicio: data.periodo_inicio,
              periodo_fin: data.periodo_fin,
            });
          }}
          isLoading={generarPeriodica.isPending}
        />
      </Modal>
    </div>
  );
}

// --- Generate Form ---

function GenerarPeriodicaFormModal({ clientes, onSubmit, isLoading }: {
  clientes: SelectOption[];
  onSubmit: (data: GenerarPeriodicaForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<GenerarPeriodicaForm>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
        <select
          {...register('cliente_id', { required: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Seleccionar cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Período inicio</label>
          <input type="date" {...register('periodo_inicio', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Período fin</label>
          <input type="date" {...register('periodo_fin', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>
      <p className="text-xs text-gray-400">Se calcularán automáticamente las horas, suplementos, materiales y gastos aprobados del período seleccionado.</p>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Generando...' : 'Generar factura'}
        </button>
      </div>
    </form>
  );
}
