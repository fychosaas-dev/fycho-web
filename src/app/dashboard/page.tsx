'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, CalendarCheck, Bell, FileText, Package, Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface KpiData {
  operarios_activos: number;
  turnos_hoy: number;
  reservas_nuevas: number;
  facturas_pendientes: number;
}

interface TurnoHoy {
  id: string;
  operario: { nombre: string } | null;
  cliente: { nombre: string } | null;
  inicio_plan: string;
  fin_plan: string;
  estado: string;
}

interface ReservaHoy {
  id: string;
  fecha_hora: string;
  cliente_nombre: string;
  servicio: { nombre: string } | null;
  operario: { nombre: string } | null;
  estado: string;
}

interface SolicitudMaterial {
  id: string;
  operario: { nombre: string } | null;
  material: { nombre: string } | null;
  cantidad: number;
  fecha: string;
  estado: string;
}

interface GastoPendiente {
  id: string;
  operario: { nombre: string } | null;
  categoria: string;
  importe: number;
  fecha: string;
}

const estadoTurnoColor: Record<string, string> = {
  programado: 'blue',
  en_curso: 'yellow',
  completado: 'green',
  ausencia: 'red',
};

const estadoReservaColor: Record<string, string> = {
  nueva: 'yellow',
  confirmada: 'blue',
  asignada: 'green',
  en_curso: 'purple',
  completada: 'gray',
  cancelada: 'red',
};

// --- Page ---

export default function DashboardPage() {
  const hoy = new Date().toISOString().split('T')[0];

  // KPIs
  const { data: kpiRes } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => api.get<KpiData>('/api/dashboard/kpis'),
    refetchInterval: 30000,
  });
  const kpis = kpiRes?.data ?? null;

  // Turnos de hoy
  const { data: turnosRes } = useQuery({
    queryKey: ['dashboard-turnos-hoy'],
    queryFn: () => api.get<TurnoHoy[]>(`/api/teams/turnos?fecha=${hoy}&per_page=20`),
  });
  const turnosHoy = turnosRes?.data ?? [];

  // Reservas de hoy
  const { data: reservasRes } = useQuery({
    queryKey: ['dashboard-reservas-hoy'],
    queryFn: () => api.get<ReservaHoy[]>(`/api/demand/reservas?fecha=${hoy}&per_page=20`),
  });
  const reservasHoy = reservasRes?.data ?? [];

  // Solicitudes de material pendientes
  const { data: materialesRes } = useQuery({
    queryKey: ['dashboard-materiales-pendientes'],
    queryFn: () => api.get<SolicitudMaterial[]>('/api/teams/solicitudes-material?estado=pendiente&per_page=5'),
  });
  const materialesPendientes = materialesRes?.data ?? [];

  // Gastos pendientes
  const { data: gastosRes } = useQuery({
    queryKey: ['dashboard-gastos-pendientes'],
    queryFn: () => api.get<GastoPendiente[]>('/api/teams/gastos?estado=pendiente&per_page=5'),
  });
  const gastosPendientes = gastosRes?.data ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          iconBg="bg-green-100 text-green-600"
          label="Operarios activos ahora"
          value={kpis?.operarios_activos ?? 0}
        />
        <KpiCard
          icon={<CalendarCheck className="w-5 h-5" />}
          iconBg="bg-blue-100 text-blue-600"
          label="Turnos programados hoy"
          value={kpis?.turnos_hoy ?? 0}
        />
        <KpiCard
          icon={<Bell className="w-5 h-5" />}
          iconBg="bg-yellow-100 text-yellow-600"
          label="Reservas sin confirmar"
          value={kpis?.reservas_nuevas ?? 0}
        />
        <KpiCard
          icon={<FileText className="w-5 h-5" />}
          iconBg="bg-gray-100 text-gray-600"
          label="Facturas por aprobar"
          value={kpis?.facturas_pendientes ?? 0}
        />
      </div>

      {/* Middle row: Turnos + Reservas de hoy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Turnos de hoy */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Turnos de hoy</h2>
          </div>
          {turnosHoy.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay turnos programados para hoy.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Operario</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Cliente</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Horario</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {turnosHoy.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{t.operario?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {format(parseISO(t.inicio_plan), 'HH:mm')}–{format(parseISO(t.fin_plan), 'HH:mm')}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge color={estadoTurnoColor[t.estado] ?? 'gray'}>{t.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Reservas de hoy */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Reservas de hoy</h2>
          </div>
          {reservasHoy.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay reservas para hoy.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Hora</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Cliente</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Servicio</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Operario</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reservasHoy.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 text-gray-900">{format(parseISO(r.fecha_hora), 'HH:mm')}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{r.cliente_nombre}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.servicio?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.operario?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={estadoReservaColor[r.estado] ?? 'gray'}>{r.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom row: Materials + Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solicitudes de material pendientes */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Solicitudes de material pendientes</h2>
          </div>
          {materialesPendientes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay solicitudes pendientes.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {materialesPendientes.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.material?.nombre ?? '—'} <span className="text-gray-400">x{s.cantidad}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.operario?.nombre ?? '—'} · {format(parseISO(s.fecha), "d MMM", { locale: es })}
                    </p>
                  </div>
                  <Badge color="yellow">{s.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gastos pendientes */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Gastos pendientes de aprobar</h2>
          </div>
          {gastosPendientes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No hay gastos pendientes.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {gastosPendientes.map((g) => (
                <div key={g.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {g.categoria} — <span className="font-semibold">{g.importe.toFixed(2)} €</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {g.operario?.nombre ?? '—'} · {format(parseISO(g.fecha), "d MMM", { locale: es })}
                    </p>
                  </div>
                  <Badge color="yellow">pendiente</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- KPI Card ---

function KpiCard({ icon, iconBg, label, value }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
