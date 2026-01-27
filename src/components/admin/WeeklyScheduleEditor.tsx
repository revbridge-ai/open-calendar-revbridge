'use client';

import { Input } from '@/components/ui/input';
import { WeeklyAvailability } from '@/types';

const DAYS = [
  { key: 0, name: 'Sunday', short: 'Sun' },
  { key: 1, name: 'Monday', short: 'Mon' },
  { key: 2, name: 'Tuesday', short: 'Tue' },
  { key: 3, name: 'Wednesday', short: 'Wed' },
  { key: 4, name: 'Thursday', short: 'Thu' },
  { key: 5, name: 'Friday', short: 'Fri' },
  { key: 6, name: 'Saturday', short: 'Sat' },
];

interface WeeklyScheduleEditorProps {
  availability: WeeklyAvailability;
  onChange: (availability: WeeklyAvailability) => void;
  compact?: boolean;
}

export function WeeklyScheduleEditor({
  availability,
  onChange,
  compact = false,
}: WeeklyScheduleEditorProps) {
  const toggleDay = (dayKey: number) => {
    const day = dayKey as keyof WeeklyAvailability;
    const current = availability[day];

    onChange({
      ...availability,
      [day]: {
        ...current,
        enabled: !current.enabled,
        slots: current.slots.length > 0 ? current.slots : [{ start: '09:00', end: '18:00' }],
      },
    });
  };

  const updateSlot = (
    dayKey: number,
    slotIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const day = dayKey as keyof WeeklyAvailability;
    const slots = [...availability[day].slots];
    slots[slotIndex] = { ...slots[slotIndex], [field]: value };

    onChange({
      ...availability,
      [day]: {
        ...availability[day],
        slots,
      },
    });
  };

  const addSlot = (dayKey: number) => {
    const day = dayKey as keyof WeeklyAvailability;
    const slots = [...availability[day].slots, { start: '14:00', end: '18:00' }];

    onChange({
      ...availability,
      [day]: {
        ...availability[day],
        slots,
      },
    });
  };

  const removeSlot = (dayKey: number, slotIndex: number) => {
    const day = dayKey as keyof WeeklyAvailability;
    const slots = availability[day].slots.filter((_, i) => i !== slotIndex);

    onChange({
      ...availability,
      [day]: {
        ...availability[day],
        slots,
        enabled: slots.length > 0,
      },
    });
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {DAYS.map((day) => {
        const dayConfig = availability[day.key as keyof WeeklyAvailability];

        return (
          <div
            key={day.key}
            className={`flex flex-col md:flex-row md:items-start gap-2 md:gap-4 ${
              compact ? 'p-2' : 'p-4'
            } bg-gray-50 rounded-lg`}
          >
            <div className={`${compact ? 'w-20' : 'w-32'} flex items-center gap-2`}>
              <input
                type="checkbox"
                checked={dayConfig.enabled}
                onChange={() => toggleDay(day.key)}
                className="h-4 w-4"
              />
              <span className={`${compact ? 'text-sm' : ''} ${dayConfig.enabled ? 'font-medium' : 'text-gray-400'}`}>
                {compact ? day.short : day.name}
              </span>
            </div>

            {dayConfig.enabled && (
              <div className="flex-1 space-y-2">
                {dayConfig.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={slot.start}
                      onChange={(e) => updateSlot(day.key, slotIndex, 'start', e.target.value)}
                      className={compact ? 'w-28 text-sm' : 'w-32'}
                    />
                    <span className={compact ? 'text-sm' : ''}>to</span>
                    <Input
                      type="time"
                      value={slot.end}
                      onChange={(e) => updateSlot(day.key, slotIndex, 'end', e.target.value)}
                      className={compact ? 'w-28 text-sm' : 'w-32'}
                    />
                    {dayConfig.slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(day.key, slotIndex)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className={compact ? 'w-4 h-4' : 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSlot(day.key)}
                  className={`${compact ? 'text-xs' : 'text-sm'} text-blue-600 hover:text-blue-800`}
                >
                  + Add time slot
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
