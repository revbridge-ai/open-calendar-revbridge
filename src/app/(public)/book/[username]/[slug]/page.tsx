'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { AvailableSlot } from '@/types';
import { format, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { BRAZIL_TIMEZONES, getAllTimezones } from '@/lib/timezone';
import { trackEvent, BookingEvents } from '@/lib/mixpanel';

interface PublicMeetingType {
  id: string;
  slug: string;
  name: string;
  description: string;
  duration: number;
  color: string;
  enabledDays: number[]; // 0 = Sunday, 1 = Monday, etc.
}

interface PublicUser {
  username: string;
  displayName: string;
  photoUrl: string | null;
  title: string | null;
  bio: string | null;
}

type Step = 1 | 2;

// Sites allowed to embed this page and hear about a confirmed booking.
// revbridge.ai's lead form (rbd-landing-page, DemoForm.tsx) listens for this
// message to count "Demo Booked" and fire its ad conversions (LinkedIn, Meta,
// Google). postMessage drops the message for any other parent origin.
const EMBEDDER_ORIGINS = ['https://revbridge.ai', 'https://www.revbridge.ai'];

/** Tells the embedding page that the booking went through. No personal data. */
function notifyEmbedder() {
  if (typeof window === 'undefined' || window.parent === window) return;
  for (const origin of EMBEDDER_ORIGINS) {
    try {
      window.parent.postMessage({ type: 'booking_successful' }, origin);
    } catch {
      // never block the confirmation on this
    }
  }
}

export default function UserBookSlugPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const slug = params.slug as string;

  const [user, setUser] = useState<PublicUser | null>(null);
  const [meetingType, setMeetingType] = useState<PublicMeetingType | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    notes: '',
  });

  const [additionalGuests, setAdditionalGuests] = useState<Array<{ name: string; email: string }>>([]);

  // Refs for auto-scroll
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const continueButtonRef = useRef<HTMLDivElement>(null);

  // Additional guests helpers
  const addGuest = () => {
    if (additionalGuests.length < 10) {
      setAdditionalGuests([...additionalGuests, { name: '', email: '' }]);
    }
  };

  const removeGuest = (index: number) => {
    setAdditionalGuests(additionalGuests.filter((_, i) => i !== index));
  };

  const updateGuest = (index: number, field: 'name' | 'email', value: string) => {
    const updated = [...additionalGuests];
    updated[index][field] = value;
    setAdditionalGuests(updated);
  };

  // Detect browser timezone
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detected);
    }
  }, []);

  // Load user and meeting type
  useEffect(() => {
    async function loadData() {
      try {
        // Load user info
        const userRes = await fetch(`/api/users/${username}`);
        if (!userRes.ok) {
          setError('User not found');
          return;
        }
        const userData = await userRes.json();
        setUser(userData);

        // Load meeting types
        const typesRes = await fetch(`/api/users/${username}/meeting-types`);
        if (typesRes.ok) {
          const types = await typesRes.json();
          const found = types.find((t: PublicMeetingType) => t.slug === slug);
          if (found) {
            setMeetingType(found);
          } else {
            setError('Meeting type not found');
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error loading data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [username, slug]);

  // Load slots when date is selected
  useEffect(() => {
    if (!selectedDate || !meetingType) return;

    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    fetch(`/api/slots?username=${username}&type=${slug}&date=${dateStr}&tz=${timezone}`)
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots || []);
        // Auto-scroll to time slots on mobile after loading
        setTimeout(() => {
          timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      })
      .catch((err) => {
        console.error('Error loading slots:', err);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedDate, username, slug, timezone, meetingType]);

  // Handle date selection with tracking
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && meetingType) {
      trackEvent(BookingEvents.DATE_SELECTED, {
        username,
        meetingTypeId: meetingType.id,
        meetingTypeName: meetingType.name,
        date: format(date, 'yyyy-MM-dd'),
        dayOfWeek: date.getDay(),
      });
    }
  };

  // Select slot (don't auto-advance anymore)
  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    // Track time selection
    if (meetingType) {
      trackEvent(BookingEvents.TIME_SELECTED, {
        username,
        meetingTypeId: meetingType.id,
        meetingTypeName: meetingType.name,
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        time: slot.time,
        timezone,
      });
    }
    // Auto-scroll to continue button on mobile
    setTimeout(() => {
      continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleAdvance = () => {
    if (selectedSlot && meetingType) {
      // Track form started
      trackEvent(BookingEvents.FORM_STARTED, {
        username,
        meetingTypeId: meetingType.id,
        meetingTypeName: meetingType.name,
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        time: selectedSlot.time,
        timezone,
      });
      setCurrentStep(2);
      // Scroll to top on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSlot || !meetingType) return;

    setSubmitting(true);

    // Filter valid additional guests (both name and email filled)
    const validGuests = additionalGuests.filter(g => g.name.trim() && g.email.trim());

    // Track booking submission
    trackEvent(BookingEvents.BOOKING_SUBMITTED, {
      username,
      meetingTypeId: meetingType.id,
      meetingTypeName: meetingType.name,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      time: selectedSlot.time,
      timezone,
      guestEmail: formData.email,
      guestCompany: formData.company,
      additionalGuestsCount: validGuests.length,
    });

    try {

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerUsername: username,
          meetingTypeId: meetingType.id,
          startTime: selectedSlot.datetime,
          guestName: formData.name,
          guestEmail: formData.email,
          guestCompany: formData.company,
          guestNotes: formData.notes || undefined,
          additionalGuests: validGuests.length > 0 ? validGuests : undefined,
          guestTimezone: timezone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        notifyEmbedder();
        router.push(`/book/${username}/confirmed?id=${data.booking.id}`);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error booking');
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      alert('Error booking');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !user || !meetingType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">{error || 'Not found'}</p>
            <Button onClick={() => router.push(`/book/${username}`)} className="mt-4">
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allTimezones = getAllTimezones();

  const steps = [
    { number: 1, label: 'Date & Time' },
    { number: 2, label: 'Details' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => currentStep === 1 ? router.push(`/book/${username}`) : goBack()}
            className="text-gray-600 hover:text-[#e81111] inline-flex items-center gap-1 mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {currentStep === 1 ? 'Back' : 'Previous step'}
          </button>

          <div className="flex items-center gap-4 mb-4">
            {user.photoUrl ? (
              <Image
                src={user.photoUrl}
                alt={user.displayName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#e81111] flex items-center justify-center text-white text-lg font-bold">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.displayName}</h1>
              {user.title && <p className="text-sm text-gray-500">{user.title}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: meetingType.color }}
            />
            <span className="font-semibold text-gray-800">{meetingType.name}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 text-sm">{meetingType.duration} min</span>
          </div>
          {meetingType.description && (
            <p className="text-gray-600 text-sm">{meetingType.description}</p>
          )}
        </div>

        {/* Step Indicator */}
        <div className="mb-8 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      currentStep >= step.number
                        ? 'bg-[#e81111] text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${currentStep >= step.number ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded transition-colors ${
                      currentStep > step.number ? 'bg-[#e81111]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {/* Step 1: Select Date & Time */}
        {currentStep === 1 && (
          <Card>
            <CardContent className="p-6">
              {/* Timezone Selector - Top */}
              <div className="flex items-center gap-2 mb-6 pb-4 border-b">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-gray-600">Timezone:</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="text-sm border-none bg-transparent font-medium text-gray-900 cursor-pointer hover:text-[#e81111] focus:outline-none focus:ring-0"
                >
                  <optgroup label="Brazil">
                    {BRAZIL_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Others">
                    {allTimezones
                      .filter((tz) => !BRAZIL_TIMEZONES.some((b) => b.value === tz.value))
                      .map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8">
                {/* Calendar Side */}
                <div className="flex flex-col items-center md:items-start">
                  <h2 className="text-base font-semibold mb-4 text-gray-700 self-start">Select a date</h2>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (date < today || date > addDays(new Date(), 60)) {
                        return true;
                      }
                      if (meetingType && !meetingType.enabledDays.includes(date.getDay())) {
                        return true;
                      }
                      return false;
                    }}
                    locale={enUS}
                    className="rounded-md border"
                  />
                </div>

                {/* Time Slots Side */}
                <div ref={timeSlotsRef} className="md:border-l md:pl-8 border-t pt-6 md:border-t-0 md:pt-0">
                  <h2 className="text-base font-semibold mb-4 text-gray-700">
                    {selectedDate
                      ? format(selectedDate, 'EEEE, MMMM d', { locale: enUS })
                      : 'Available times'}
                  </h2>

                  {!selectedDate ? (
                    <div className="flex items-center justify-center py-8 md:py-12 text-gray-400">
                      <div className="text-center">
                        <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">Select a date to see available times</p>
                      </div>
                    </div>
                  ) : loadingSlots ? (
                    <div className="flex items-center justify-center py-8 md:py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="flex items-center justify-center py-8 md:py-12 text-gray-400">
                      <div className="text-center">
                        <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">No available times</p>
                        <p className="text-xs mt-1">Try another day</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 max-h-64 md:max-h-72 overflow-y-auto">
                      {slots.map((slot) => (
                        <Button
                          key={slot.datetime}
                          variant={selectedSlot?.datetime === slot.datetime ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSlotSelect(slot)}
                          className={
                            selectedSlot?.datetime === slot.datetime
                              ? 'bg-[#e81111] border-[#e81111] text-white'
                              : 'hover:bg-[#e81111] hover:text-white hover:border-[#e81111] transition-colors'
                          }
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Advance Button */}
              {selectedSlot && (
                <div ref={continueButtonRef} className="mt-6 pt-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-gray-600 text-center sm:text-left">
                    <span className="font-medium text-gray-900">
                      {selectedDate && format(selectedDate, 'MMM d', { locale: enUS })}
                    </span>
                    {' at '}
                    <span className="font-medium text-gray-900">{selectedSlot.time}</span>
                  </div>
                  <Button
                    onClick={handleAdvance}
                    className="w-full sm:w-auto bg-[#e81111] hover:bg-[#c50f0f]"
                  >
                    Continue
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Enter Details */}
        {currentStep === 2 && (
          <div className="max-w-lg mx-auto">
            {/* Selected DateTime Summary */}
            <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e81111]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#e81111]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy', { locale: enUS })}
                    </p>
                    <p className="text-sm text-gray-600">{selectedSlot?.time}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-sm text-[#e81111] hover:underline"
                >
                  Change
                </button>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Enter your details</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Your name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <Label>Your email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="john@company.com"
                      required
                    />
                  </div>

                  {/* Additional Guests Section */}
                  <div className="border-t border-b py-6 my-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Additional Guests (Optional)
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Invite others to join this meeting
                        </p>
                      </div>
                      {additionalGuests.length < 10 && (
                        <button
                          type="button"
                          onClick={addGuest}
                          className="text-sm text-[#e81111] hover:text-[#c50f0f] font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Person
                        </button>
                      )}
                    </div>

                    {additionalGuests.length > 0 && (
                      <div className="space-y-3">
                        {additionalGuests.map((guest, index) => (
                          <div key={index} className="flex gap-2 items-start">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Input
                                type="text"
                                placeholder="Name"
                                value={guest.name}
                                onChange={(e) => updateGuest(index, 'name', e.target.value)}
                                className="text-sm"
                              />
                              <Input
                                type="email"
                                placeholder="Email"
                                value={guest.email}
                                onChange={(e) => updateGuest(index, 'email', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeGuest(index)}
                              className="text-gray-400 hover:text-red-600 p-2"
                              title="Remove guest"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {additionalGuests.length === 0 && (
                      <div className="text-center py-6 text-sm text-gray-400">
                        No additional guests yet
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Company *</Label>
                    <Input
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      placeholder="Your company name"
                      required
                    />
                  </div>

                  <div>
                    <Label>Notes (optional)</Label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      rows={3}
                      placeholder="Any additional information for the meeting?"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#e81111] hover:bg-[#c50f0f] h-12 text-base"
                    disabled={submitting}
                  >
                    {submitting ? 'Booking...' : 'Confirm Booking'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
