'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Profile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  title: string | null;
  bio: string | null;
  cancellationMessage: string | null;
}

const DEFAULT_CANCELLATION_MESSAGE = "Unfortunately, we need to cancel your scheduled meeting. We apologize for any inconvenience this may cause.";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          title: profile.title,
          bio: profile.bio,
          cancellationMessage: profile.cancellationMessage,
        }),
      });

      if (res.ok) {
        alert('Profile saved!');
      } else {
        const data = await res.json();
        alert(data.error || 'Error saving profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!profile) {
    return <div>Error loading profile</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Profile</h1>
          <p className="text-sm text-gray-600">Manage your public profile information</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Profile Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {profile.photoUrl ? (
              <Image
                src={profile.photoUrl}
                alt={profile.displayName}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#e81111] flex items-center justify-center text-white text-2xl font-bold">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{profile.displayName}</h2>
              {profile.title && (
                <p className="text-gray-600">{profile.title}</p>
              )}
              <p className="text-sm text-gray-500">@{profile.username}</p>
            </div>
          </div>
          {profile.bio && (
            <p className="mt-4 text-gray-600 italic">"{profile.bio}"</p>
          )}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              Your public booking URL:{' '}
              <a
                href={`/book/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#e81111] hover:underline"
              >
                {typeof window !== 'undefined' ? window.location.origin : ''}/book/{profile.username}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={profile.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed
            </p>
          </div>

          <div>
            <Label>Username</Label>
            <Input
              type="text"
              value={profile.username}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Username is based on your email and cannot be changed
            </p>
          </div>

          <div>
            <Label>Display Name</Label>
            <Input
              type="text"
              value={profile.displayName}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
              placeholder="Your name"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the name that will be displayed on your booking page
            </p>
          </div>

          <div>
            <Label>Title / Role</Label>
            <Input
              type="text"
              value={profile.title || ''}
              onChange={(e) => setProfile({ ...profile, title: e.target.value || null })}
              placeholder="e.g., CEO, CTO, Sales Manager"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              Your job title or role (optional)
            </p>
          </div>

          <div>
            <Label>Welcome Message</Label>
            <textarea
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value || null })}
              placeholder="Say something to people who will schedule a meeting with you..."
              maxLength={500}
              rows={4}
              className="w-full mt-1 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#e81111] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will be shown to visitors on your booking page ({profile.bio?.length || 0}/500)
            </p>
          </div>

          <div>
            <Label>Cancellation Email Message</Label>
            <textarea
              value={profile.cancellationMessage || ''}
              onChange={(e) => setProfile({ ...profile, cancellationMessage: e.target.value || null })}
              placeholder={DEFAULT_CANCELLATION_MESSAGE}
              maxLength={1000}
              rows={4}
              className="w-full mt-1 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#e81111] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom message sent when you cancel a meeting. Leave empty to use default. ({profile.cancellationMessage?.length || 0}/1000)
            </p>
          </div>

          <div>
            <Label>Profile Photo</Label>
            <div className="mt-2 flex items-center gap-4">
              {profile.photoUrl ? (
                <Image
                  src={profile.photoUrl}
                  alt={profile.displayName}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div className="text-sm text-gray-500">
                <p>Your profile photo is synced from your Google account.</p>
                <p>To change it, update your Google profile picture.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
