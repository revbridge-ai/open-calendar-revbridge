'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Booking, MeetingType } from '@/types';
import { format } from 'date-fns';
import { Trash2, Copy, ExternalLink } from 'lucide-react';

interface UserProfile {
  username: string;
  displayName: string;
  email: string;
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [bookingsRes, typesRes, profileRes] = await Promise.all([
          fetch('/api/bookings?upcoming=true'),
          fetch('/api/meeting-types'),
          fetch('/api/profile'),
        ]);

        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setBookings(data);
        }

        if (typesRes.ok) {
          const data = await typesRes.json();
          setMeetingTypes(data);
        }

        if (profileRes.ok) {
          const data = await profileRes.json();
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleDelete(bookingId: string) {
    if (!confirm('Are you sure you want to cancel this booking? The event will be removed from Google Calendar.')) {
      return;
    }

    setDeleting(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setBookings(bookings.filter((b) => b.id !== bookingId));
      } else {
        const data = await res.json();
        alert(data.error || 'Error canceling booking');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Error canceling booking');
    } finally {
      setDeleting(null);
    }
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const publicUrl = userProfile ? `${baseUrl}/book/${userProfile.username}` : `${baseUrl}/book`;

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600">
          {userProfile ? `Welcome back, ${userProfile.displayName}` : 'Overview of your bookings'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Upcoming</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900">{bookings.length}</p>
          <p className="text-xs text-gray-400 hidden sm:block">bookings</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Meeting</p>
          <p className="text-xl sm:text-3xl font-bold text-gray-900">{meetingTypes.length}</p>
          <p className="text-xs text-gray-400 hidden sm:block">types</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Active</p>
          <p className="text-xl sm:text-3xl font-bold text-[#e81111]">
            {meetingTypes.filter((t) => t.isActive).length}
          </p>
          <p className="text-xs text-gray-400 hidden sm:block">types</p>
        </div>
      </div>

      {/* Public Link */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm overflow-hidden">
        <h2 className="font-semibold text-gray-900 mb-2">Your Booking Link</h2>
        <p className="text-sm text-gray-500 mb-4">
          Share this link to let people book meetings with you
        </p>
        <div className="space-y-3">
          <code className="block w-full bg-gray-50 px-3 py-2.5 rounded-lg text-xs sm:text-sm text-gray-700 border border-gray-100 truncate">
            {publicUrl}
          </code>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => handleCopy(publicUrl)}
            >
              <Copy className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              asChild
            >
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Open</span>
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Upcoming Bookings</h2>
        </div>
        <div className="p-4 sm:p-6">
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No upcoming bookings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  {/* Mobile layout - stacked */}
                  <div className="flex items-start justify-between mb-3 sm:mb-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{booking.guestName}</p>
                      <p className="text-sm text-gray-500 truncate">{booking.guestEmail}</p>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        <span className="font-medium">{booking.guestCompany}</span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(booking.id)}
                      disabled={deleting === booking.id}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-1"
                    >
                      {deleting === booking.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#e81111]/10 text-[#e81111]">
                      {booking.meetingTypeName}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(booking.startTime), 'MMM dd')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
