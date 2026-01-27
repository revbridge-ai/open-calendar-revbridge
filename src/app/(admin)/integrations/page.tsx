'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SlackWebhook } from '@/types';

interface WebhookFormData {
  name: string;
  webhookUrl: string;
  channelName?: string;
  enabled: boolean;
  notifyOnBooking: boolean;
  notifyOnCancel: boolean;
}

export default function IntegrationsPage() {
  const [webhooks, setWebhooks] = useState<SlackWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<SlackWebhook | null>(null);
  const [formData, setFormData] = useState<WebhookFormData>({
    name: '',
    webhookUrl: '',
    channelName: '',
    enabled: true,
    notifyOnBooking: true,
    notifyOnCancel: true,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Verificar se precisa migração
      const migrationRes = await fetch('/api/integrations/slack/migrate');
      if (migrationRes.ok) {
        const migrationData = await migrationRes.json();
        setNeedsMigration(migrationData.needsMigration);
      }

      // Carregar webhooks
      const res = await fetch('/api/integrations/slack/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMigrate() {
    setMigrating(true);
    try {
      const res = await fetch('/api/integrations/slack/migrate', { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Migração realizada com sucesso!' });
        setNeedsMigration(false);
        await loadData();
      } else {
        setMessage({ type: 'error', text: 'Erro ao migrar configuração' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao migrar configuração' });
    } finally {
      setMigrating(false);
    }
  }

  function openCreateDialog() {
    setEditingWebhook(null);
    setFormData({
      name: '',
      webhookUrl: '',
      channelName: '',
      enabled: true,
      notifyOnBooking: true,
      notifyOnCancel: true,
    });
    setDialogOpen(true);
    setMessage(null);
  }

  function openEditDialog(webhook: SlackWebhook) {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      webhookUrl: webhook.webhookUrl,
      channelName: webhook.channelName || '',
      enabled: webhook.enabled,
      notifyOnBooking: webhook.notifyOnBooking,
      notifyOnCancel: webhook.notifyOnCancel,
    });
    setDialogOpen(true);
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const url = editingWebhook
        ? `/api/integrations/slack/webhooks/${editingWebhook.id}`
        : '/api/integrations/slack/webhooks';

      const method = editingWebhook ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: editingWebhook ? 'Webhook atualizado!' : 'Webhook criado!' });
        setDialogOpen(false);
        await loadData();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar webhook' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(webhookUrl: string) {
    setTesting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/integrations/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Conexão testada! Verifique seu canal Slack.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Falha no teste' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao testar conexão' });
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete(webhookId: string) {
    if (!confirm('Tem certeza que deseja excluir este webhook?')) return;

    try {
      const res = await fetch(`/api/integrations/slack/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Webhook excluído' });
        await loadData();
      } else {
        setMessage({ type: 'error', text: 'Erro ao excluir webhook' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao excluir webhook' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-gray-600">Connect your tools to receive booking notifications</p>
      </div>

      {/* Migration Banner */}
      {needsMigration && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Atualização Disponível</h3>
              <p className="text-sm text-blue-700 mt-1">
                Atualizamos a integração do Slack para suportar múltiplos canais!
                Clique em migrar para converter sua configuração atual.
              </p>
            </div>
            <Button
              onClick={handleMigrate}
              disabled={migrating}
              size="sm"
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-100"
            >
              {migrating ? 'Migrando...' : 'Migrar Agora'}
            </Button>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Slack Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4A154B] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.124a2.528 2.528 0 0 1 2.523 2.52A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.52v-2.521h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Slack Webhooks</h2>
              <p className="text-sm text-gray-600">Envie notificações para diferentes canais</p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>Adicionar Canal</Button>
        </div>

        {/* Webhooks List */}
        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-gray-500 mb-4">Nenhum canal configurado ainda</p>
                <Button onClick={openCreateDialog} variant="outline">
                  Adicionar Primeiro Canal
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{webhook.name}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            webhook.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {webhook.enabled ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {webhook.channelName && (
                        <p className="text-sm text-gray-600 mb-2">{webhook.channelName}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>
                          {webhook.notifyOnBooking ? '✓' : '✗'} Novos bookings
                        </span>
                        <span>
                          {webhook.notifyOnCancel ? '✓' : '✗'} Cancelamentos
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(webhook.webhookUrl)}
                        disabled={testing}
                      >
                        {testing ? 'Testando...' : 'Testar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(webhook)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(webhook.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingWebhook ? 'Editar Webhook' : 'Adicionar Webhook'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure um canal do Slack para receber notificações
                </p>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Vendas, Suporte, Marketing"
                />
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label>Webhook URL *</Label>
                <Input
                  type="url"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                />
                <p className="text-xs text-gray-500">
                  <a
                    href="https://api.slack.com/messaging/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#e81111] hover:underline"
                  >
                    Como criar um Incoming Webhook
                  </a>
                </p>
              </div>

              {/* Canal */}
              <div className="space-y-2">
                <Label>Nome do Canal (opcional)</Label>
                <Input
                  value={formData.channelName || ''}
                  onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                  placeholder="#vendas"
                />
                <p className="text-xs text-gray-500">
                  Para referência - o canal é definido no webhook
                </p>
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Ativar webhook</p>
                  <p className="text-sm text-gray-500">Enviar notificações para este canal</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.enabled ? 'bg-[#e81111]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notificações */}
              <div className="space-y-3">
                <Label>Notificar quando:</Label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyOnBooking}
                    onChange={(e) => setFormData({ ...formData, notifyOnBooking: e.target.checked })}
                    className="w-4 h-4 text-[#e81111] rounded border-gray-300 focus:ring-[#e81111]"
                  />
                  <span>Novo booking criado</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyOnCancel}
                    onChange={(e) => setFormData({ ...formData, notifyOnCancel: e.target.checked })}
                    className="w-4 h-4 text-[#e81111] rounded border-gray-300 focus:ring-[#e81111]"
                  />
                  <span>Booking cancelado</span>
                </label>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => setDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.webhookUrl}
                  className="flex-1"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
