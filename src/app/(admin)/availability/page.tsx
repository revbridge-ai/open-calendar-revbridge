'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, WeeklyAvailability } from '@/types';
import { BRAZIL_TIMEZONES } from '@/lib/timezone';

const DAYS = [
  { key: 0, name: 'Sunday', short: 'Sun' },
  { key: 1, name: 'Monday', short: 'Mon' },
  { key: 2, name: 'Tuesday', short: 'Tue' },
  { key: 3, name: 'Wednesday', short: 'Wed' },
  { key: 4, name: 'Thursday', short: 'Thu' },
  { key: 5, name: 'Friday', short: 'Fri' },
  { key: 6, name: 'Saturday', short: 'Sat' },
];

export default function AvailabilityPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert('Settings saved!');
      } else {
        alert('Error saving settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayKey: number) => {
    if (!settings) return;

    const day = dayKey as keyof WeeklyAvailability;
    const current = settings.availability[day];

    setSettings({
      ...settings,
      availability: {
        ...settings.availability,
        [day]: {
          ...current,
          enabled: !current.enabled,
          slots: current.slots.length > 0 ? current.slots : [{ start: '09:00', end: '18:00' }],
        },
      },
    });
  };

  const updateSlot = (
    dayKey: number,
    slotIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    if (!settings) return;

    const day = dayKey as keyof WeeklyAvailability;
    const slots = [...settings.availability[day].slots];
    slots[slotIndex] = { ...slots[slotIndex], [field]: value };

    setSettings({
      ...settings,
      availability: {
        ...settings.availability,
        [day]: {
          ...settings.availability[day],
          slots,
        },
      },
    });
  };

  const addSlot = (dayKey: number) => {
    if (!settings) return;

    const day = dayKey as keyof WeeklyAvailability;
    const slots = [...settings.availability[day].slots, { start: '14:00', end: '18:00' }];

    setSettings({
      ...settings,
      availability: {
        ...settings.availability,
        [day]: {
          ...settings.availability[day],
          slots,
        },
      },
    });
  };

  const removeSlot = (dayKey: number, slotIndex: number) => {
    if (!settings) return;

    const day = dayKey as keyof WeeklyAvailability;
    const slots = settings.availability[day].slots.filter((_, i) => i !== slotIndex);

    setSettings({
      ...settings,
      availability: {
        ...settings.availability,
        [day]: {
          ...settings.availability[day],
          slots,
          enabled: slots.length > 0,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!settings) {
    return <div>Error loading settings</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Availability</h1>
          <p className="text-sm text-gray-600">Configure your available hours</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto bg-[#e81111] hover:bg-[#c50f0f]"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">General Settings</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <Label className="text-sm text-gray-600">Timezone</Label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e81111]/20 focus:border-[#e81111]"
            >
              {BRAZIL_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Min. Notice (hrs)</Label>
              <Input
                type="number"
                min={0}
                max={168}
                value={settings.minimumNotice}
                onChange={(e) =>
                  setSettings({ ...settings, minimumNotice: parseInt(e.target.value) || 0 })
                }
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm text-gray-600">Max Days Ahead</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={settings.maxDaysAhead}
                onChange={(e) =>
                  setSettings({ ...settings, maxDaysAhead: parseInt(e.target.value) || 60 })
                }
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Weekly Schedule</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {DAYS.map((day) => {
            const dayConfig = settings.availability[day.key as keyof WeeklyAvailability];

            return (
              <div key={day.key} className="p-4 sm:p-5">
                {/* Day toggle */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => toggleDay(day.key)}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-10 h-6 rounded-full transition-colors relative ${
                      dayConfig.enabled ? 'bg-[#e81111]' : 'bg-gray-200'
                    }`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        dayConfig.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </div>
                    <span className={`text-sm font-medium ${
                      dayConfig.enabled ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {day.name}
                    </span>
                  </button>
                  {dayConfig.enabled && (
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {dayConfig.slots.length} slot{dayConfig.slots.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Time slots */}
                {dayConfig.enabled && (
                  <div className="pl-0 sm:pl-13 space-y-2">
                    {dayConfig.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) =>
                              updateSlot(day.key, slotIndex, 'start', e.target.value)
                            }
                            className="flex-1 min-w-0 bg-transparent text-sm text-center border-0 focus:outline-none focus:ring-0"
                          />
                          <span className="text-gray-400 text-xs">→</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) =>
                              updateSlot(day.key, slotIndex, 'end', e.target.value)
                            }
                            className="flex-1 min-w-0 bg-transparent text-sm text-center border-0 focus:outline-none focus:ring-0"
                          />
                        </div>
                        {dayConfig.slots.length > 1 && (
                          <button
                            onClick={() => removeSlot(day.key, slotIndex)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addSlot(day.key)}
                      className="text-xs text-[#e81111] hover:text-[#c50f0f] font-medium flex items-center gap-1 mt-2"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add time slot
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile save button (sticky) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#e81111] hover:bg-[#c50f0f]"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Spacer for mobile sticky button */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
