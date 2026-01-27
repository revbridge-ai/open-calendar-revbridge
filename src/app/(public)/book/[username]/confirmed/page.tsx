'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { trackEvent, BookingEvents } from '@/lib/mixpanel';

interface BookingData {
  id: string;
  meetingTypeName: string;
  guestName: string;
  guestEmail: string;
  guestNotes: string | null;
  guestTimezone: string;
  startTime: string;
  endTime: string;
  status: string;
}

function ConfirmedContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const bookingId = searchParams.get('id');
  const username = params.username as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    // Track booking confirmed event (only once)
    if (!hasTracked.current) {
      hasTracked.current = true;
      trackEvent(BookingEvents.BOOKING_CONFIRMED, {
        username,
        bookingId,
      });
    }

    // For the confirmed page, we just display success message
    // The booking details would need an API endpoint to fetch by ID
    // For now, we show a generic success message
    setLoading(false);
  }, [bookingId, username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo-rev.svg"
                alt="RevBridge"
                width={48}
                height={48}
                className="w-12 h-12"
              />
            </div>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-gray-600">
              You will receive an email invitation with the meeting details.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-gray-600">
                Check your email for the calendar invitation and meeting link.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link href={`/book/${username}`}>Make another booking</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      }
    >
      <ConfirmedContent />
    </Suspense>
  );
}
