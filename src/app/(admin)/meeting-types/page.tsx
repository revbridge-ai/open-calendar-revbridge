'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { WeeklyScheduleEditor } from '@/components/admin/WeeklyScheduleEditor';
import { MeetingType, MeetingTypeCreate, WeeklyAvailability, SlackWebhook } from '@/types';

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

// Default availability (Mon-Fri 9-12, 14-18)
const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  0: { enabled: false, slots: [] },
  1: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  2: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  3: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  4: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  5: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  6: { enabled: false, slots: [] },
};

const defaultFormData: MeetingTypeCreate = {
  slug: '',
  name: '',
  description: '',
  duration: 30,
  color: COLORS[0],
  bufferBefore: 0,
  bufferAfter: 0,
  isActive: true,
  useCustomAvailability: false,
  availability: undefined,
  slackWebhookId: null,
};

export default function MeetingTypesPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [slackWebhooks, setSlackWebhooks] = useState<SlackWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MeetingTypeCreate>(defaultFormData);
  const [saving, setSaving] = useState(false);

  const loadMeetingTypes = async () => {
    try {
      const res = await fetch('/api/meeting-types?all=true');
      if (res.ok) {
        const data = await res.json();
        setMeetingTypes(data);
      }
    } catch (error) {
      console.error('Error loading meeting types:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetingTypes();
    loadSlackWebhooks();
  }, []);

  const loadSlackWebhooks = async () => {
    try {
      const res = await fetch('/api/integrations/slack/webhooks');
      if (res.ok) {
        const data = await res.json();
        setSlackWebhooks(data);
      }
    } catch (error) {
      console.error('Error loading Slack webhooks:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingId
        ? `/api/meeting-types/${editingId}`
        : '/api/meeting-types';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setDialogOpen(false);
        setEditingId(null);
        setFormData(defaultFormData);
        loadMeetingTypes();
      } else {
        const error = await res.json();
        alert(error.error || 'Error saving');
      }
    } catch (error) {
      console.error('Error saving meeting type:', error);
      alert('Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (mt: MeetingType) => {
    setEditingId(mt.id);
    setFormData({
      slug: mt.slug,
      name: mt.name,
      description: mt.description,
      duration: mt.duration,
      color: mt.color,
      bufferBefore: mt.bufferBefore,
      bufferAfter: mt.bufferAfter,
      isActive: mt.isActive,
      useCustomAvailability: mt.useCustomAvailability || false,
      availability: mt.availability,
      slackWebhookId: mt.slackWebhookId || null,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting type?')) return;

    try {
      const res = await fetch(`/api/meeting-types/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadMeetingTypes();
      } else {
        alert('Error deleting');
      }
    } catch (error) {
      console.error('Error deleting meeting type:', error);
      alert('Error deleting');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Meeting Types</h1>
          <p className="text-sm text-gray-600">Manage available meeting types</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData(defaultFormData);
              }}
            >
              + New Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Meeting Type' : 'New Meeting Type'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      slug: editingId ? formData.slug : generateSlug(name),
                    });
                  }}
                  required
                />
              </div>

              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  pattern="^[a-z0-9-]+$"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used in URL: /book/{formData.slug || 'slug'}
                </p>
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: parseInt(e.target.value) || 30,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-1">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-6 h-6 rounded-full ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Buffer Before (min)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={formData.bufferBefore}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bufferBefore: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Buffer After (min)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={formData.bufferAfter}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bufferAfter: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                <Label htmlFor="isActive">Active (publicly visible)</Label>
              </div>

              {/* Custom Availability */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="useCustomAvailability"
                    checked={formData.useCustomAvailability || false}
                    onChange={(e) => {
                      const useCustom = e.target.checked;
                      setFormData({
                        ...formData,
                        useCustomAvailability: useCustom,
                        availability: useCustom && !formData.availability
                          ? DEFAULT_AVAILABILITY
                          : formData.availability,
                      });
                    }}
                  />
                  <Label htmlFor="useCustomAvailability">
                    Use custom availability
                  </Label>
                </div>

                {formData.useCustomAvailability && formData.availability && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Set specific hours for this meeting type (overrides global availability)
                    </p>
                    <WeeklyScheduleEditor
                      availability={formData.availability}
                      onChange={(availability) => setFormData({ ...formData, availability })}
                      compact={true}
                    />
                  </div>
                )}
              </div>

              {/* Slack Notifications */}
              <div className="border-t pt-4 mt-4">
                <Label>Slack Notifications</Label>
                <p className="text-xs text-gray-500 mb-3">
                  Choose which Slack channel to notify for this meeting type
                </p>
                <select
                  value={formData.slackWebhookId || ''}
                  onChange={(e) => setFormData({ ...formData, slackWebhookId: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e81111] focus:border-transparent"
                >
                  <option value="">No notifications</option>
                  {slackWebhooks.map((webhook) => (
                    <option key={webhook.id} value={webhook.id}>
                      {webhook.name} {webhook.channelName ? `(${webhook.channelName})` : ''}
                    </option>
                  ))}
                </select>
                {slackWebhooks.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    No Slack channels configured.{' '}
                    <a href="/integrations" className="text-[#e81111] hover:underline">
                      Add one now
                    </a>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Meeting Types List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetingTypes.map((mt) => (
          <Card key={mt.id} className={!mt.isActive ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: mt.color }}
                  />
                  <CardTitle className="text-lg">{mt.name}</CardTitle>
                </div>
                {!mt.isActive && (
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                    Inactive
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {mt.description || 'No description'}
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span>{mt.duration} min</span>
                {mt.bufferBefore > 0 && <span>+{mt.bufferBefore}min before</span>}
                {mt.bufferAfter > 0 && <span>+{mt.bufferAfter}min after</span>}
              </div>

              {mt.useCustomAvailability && (
                <div className="text-xs text-blue-600 mb-3 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Custom availability
                </div>
              )}

              {mt.slackWebhookId && (
                <div className="text-xs text-green-600 mb-3 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.124a2.528 2.528 0 0 1 2.523 2.52A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.52v-2.521h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                  Slack notifications enabled
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(mt)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(mt.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {meetingTypes.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No meeting types created
          </div>
        )}
      </div>
    </div>
  );
}
