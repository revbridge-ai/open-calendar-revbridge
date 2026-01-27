'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trackEvent, BookingEvents } from '@/lib/mixpanel';

interface PublicMeetingType {
  id: string;
  slug: string;
  name: string;
  description: string;
  duration: number;
  color: string;
}

interface PublicUser {
  username: string;
  displayName: string;
  photoUrl: string | null;
  title: string | null;
  bio: string | null;
}

export default function UserBookPage() {
  const params = useParams();
  const username = params.username as string;

  const [user, setUser] = useState<PublicUser | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<PublicMeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          const typesData = await typesRes.json();
          setMeetingTypes(typesData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error loading data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [username]);

  // Track page view when data is loaded
  useEffect(() => {
    if (!loading && user) {
      trackEvent(BookingEvents.BOOKING_PAGE_VIEWED, {
        username,
        displayName: user.displayName,
        meetingTypesCount: meetingTypes.length,
      });
    }
  }, [loading, user, username, meetingTypes.length]);

  const handleMeetingTypeClick = (mt: PublicMeetingType) => {
    trackEvent(BookingEvents.MEETING_TYPE_SELECTED, {
      username,
      meetingTypeId: mt.id,
      meetingTypeName: mt.name,
      meetingTypeSlug: mt.slug,
      duration: mt.duration,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">{error || 'User not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            {user.photoUrl ? (
              <Image
                src={user.photoUrl}
                alt={user.displayName}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#e81111] flex items-center justify-center text-white text-2xl font-bold">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-1">{user.displayName}</h1>
          {user.title && (
            <p className="text-lg text-gray-600 mb-2">{user.title}</p>
          )}
          {user.bio && (
            <p className="text-gray-500 max-w-md mx-auto mb-4">{user.bio}</p>
          )}
          <p className="text-gray-600">
            Choose the type of meeting you want to schedule
          </p>
        </div>

        {meetingTypes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No meeting types available at the moment
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {meetingTypes.map((mt) => (
              <Link key={mt.id} href={`/book/${username}/${mt.slug}`} onClick={() => handleMeetingTypeClick(mt)}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer block">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: mt.color }}
                      />
                      <CardTitle>{mt.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-2">{mt.description}</p>
                    <p className="text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {mt.duration} minutes
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          <Image
            src="/logo-rev.svg"
            alt="RevBridge"
            width={24}
            height={24}
            className="w-6 h-6 inline-block mr-2"
          />
          Powered by RevBridge Calendar
        </div>
      </div>
    </div>
  );
}
