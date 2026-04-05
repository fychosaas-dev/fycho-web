'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  Users,
  Building2,
  Tag,
  Package,
  Clock,
  CalendarCheck,
  FileText,
  Plug,
} from 'lucide-react';

const navigation = [
  {
    label: 'General',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Teams',
    color: 'text-blue-600',
    items: [
      { name: 'Calendario', href: '/teams/calendario', icon: Calendar },
      { name: 'Gastos', href: '/teams/gastos', icon: Receipt },
    ],
  },
  {
    label: 'Demand',
    color: 'text-green-600',
    items: [
      { name: 'Agenda', href: '/demand/agenda', icon: Clock },
      { name: 'Solicitudes', href: '/demand/solicitudes', icon: CalendarCheck },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { name: 'Operarios', href: '/configuracion/operarios', icon: Users },
      { name: 'Clientes', href: '/configuracion/clientes', icon: Building2 },
      { name: 'Tarifas', href: '/configuracion/tarifas', icon: Tag },
      { name: 'Materiales', href: '/configuracion/materiales', icon: Package },
    ],
  },
  {
    label: 'Facturación',
    items: [
      { name: 'Facturas', href: '/facturacion', icon: FileText },
      { name: 'Integraciones', href: '/integraciones', icon: Plug },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Link href="/dashboard" className="text-xl font-bold text-gray-900">
          Fycho
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigation.map((section) => (
          <div key={section.label}>
            <p className={`px-3 mb-2 text-xs font-semibold uppercase tracking-wider ${section.color ?? 'text-gray-400'}`}>
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
