'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plug, Unplug, TestTube } from 'lucide-react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// --- Types ---

interface ErpConfig {
  id: string;
  provider: string;
  activo: boolean;
}

type ConectarForm = { api_key: string };

const ERP_PROVIDERS = [
  {
    key: 'holded',
    nombre: 'Holded',
    descripcion: 'ERP y facturación en la nube para pymes. Sincroniza facturas automáticamente.',
    color: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-700',
  },
  {
    key: 'billin',
    nombre: 'Billin',
    descripcion: 'Facturación online para autónomos y pymes. Envío directo de facturas.',
    color: 'bg-green-50 border-green-200',
    textColor: 'text-green-700',
  },
  {
    key: 'sage',
    nombre: 'Sage',
    descripcion: 'Exportación CSV compatible con Sage 50 y Sage 200. Importación manual.',
    color: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-700',
  },
];

// --- Page ---

export default function IntegracionesPage() {
  const queryClient = useQueryClient();
  const [conectarModal, setConectarModal] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; ok: boolean; message: string } | null>(null);

  // Fetch ERP configs
  const { data: configRes, isLoading } = useQuery({
    queryKey: ['erp-configs'],
    queryFn: () => api.get<ErpConfig[]>('/api/billing/erp/config'),
  });
  const configs = configRes?.data ?? [];

  function isConnected(provider: string): boolean {
    return configs.some((c) => c.provider === provider && c.activo);
  }

  // Connect mutation
  const conectarMutation = useMutation({
    mutationFn: ({ provider, api_key }: { provider: string; api_key: string }) =>
      api.post('/api/billing/erp/conectar', { provider, api_key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-configs'] });
      setConectarModal(null);
    },
  });

  // Test mutation
  const probarMutation = useMutation({
    mutationFn: (provider: string) => api.post('/api/billing/erp/probar', { provider }),
    onSuccess: (_, provider) => {
      setTestResult({ provider, ok: true, message: 'Conexión exitosa' });
    },
    onError: (_, provider) => {
      setTestResult({ provider, ok: false, message: 'Error de conexión' });
    },
  });

  // Disconnect mutation
  const desconectarMutation = useMutation({
    mutationFn: (provider: string) => api.delete(`/api/billing/erp/${provider}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-configs'] });
      setTestResult(null);
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integraciones ERP</h1>
        <p className="text-gray-500 mt-1">Conecta tu ERP para sincronizar facturas automáticamente.</p>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ERP_PROVIDERS.map((erp) => {
            const connected = isConnected(erp.key);
            return (
              <div
                key={erp.key}
                className={`rounded-xl border-2 p-6 ${connected ? erp.color : 'bg-white border-gray-200'}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-lg font-bold ${connected ? erp.textColor : 'text-gray-900'}`}>
                    {erp.nombre}
                  </h3>
                  <Badge color={connected ? 'green' : 'gray'}>
                    {connected ? 'Conectado' : 'No conectado'}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-5">{erp.descripcion}</p>

                {/* Test result */}
                {testResult && testResult.provider === erp.key && (
                  <div className={`text-sm mb-4 px-3 py-2 rounded-lg ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {testResult.message}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {connected ? (
                    <>
                      <button
                        onClick={() => probarMutation.mutate(erp.key)}
                        disabled={probarMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <TestTube className="w-3.5 h-3.5" />
                        Probar
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Desconectar ${erp.nombre}?`)) desconectarMutation.mutate(erp.key); }}
                        disabled={desconectarMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Unplug className="w-3.5 h-3.5" />
                        Desconectar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConectarModal(erp.key)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plug className="w-3.5 h-3.5" />
                      Conectar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect modal */}
      <Modal
        open={conectarModal !== null}
        onClose={() => setConectarModal(null)}
        title={`Conectar ${ERP_PROVIDERS.find((e) => e.key === conectarModal)?.nombre ?? ''}`}
      >
        <ConectarFormModal
          provider={conectarModal ?? ''}
          onSubmit={(data) => {
            if (conectarModal) conectarMutation.mutate({ provider: conectarModal, api_key: data.api_key });
          }}
          isLoading={conectarMutation.isPending}
        />
      </Modal>
    </div>
  );
}

// --- Connect Form ---

function ConectarFormModal({ provider, onSubmit, isLoading }: {
  provider: string;
  onSubmit: (data: ConectarForm) => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<ConectarForm>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
        <input
          type="password"
          {...register('api_key', { required: true })}
          placeholder="Introduce tu API Key..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">
          La API key se almacena cifrada con AES-256. Nunca se muestra en texto plano.
        </p>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isLoading ? 'Conectando...' : 'Conectar'}
        </button>
      </div>
    </form>
  );
}
