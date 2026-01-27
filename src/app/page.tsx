'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface TeamMember {
  username: string;
  displayName: string;
  photoUrl: string | null;
  title: string | null;
}

interface AuthUser {
  username: string;
  displayName: string;
  photoUrl: string | null;
}

export default function Home() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Load team members
    fetch('/api/team')
      .then((res) => res.json())
      .then((data) => setTeam(data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Check if user is logged in
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthUser(data.user);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-rev.svg"
              alt="RevBridge"
              width={36}
              height={36}
              className="w-9 h-9"
            />
            <span className="font-bold text-gray-900">RevBridge</span>
          </div>
          {authUser ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-gray-200 hover:border-[#e81111] hover:bg-red-50 transition-all"
            >
              <div className="flex items-center gap-2">
                <Image
                  src="/logo-rev.svg"
                  alt="RevBridge"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">Dashboard</span>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              {authUser.photoUrl && authUser.photoUrl.length > 0 ? (
                <img
                  src={authUser.photoUrl}
                  alt={authUser.displayName}
                  className="w-7 h-7 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#e81111] flex items-center justify-center text-white text-xs font-bold">
                  {authUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-[#e81111] transition-colors"
            >
              Admin
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo-rev.svg"
              alt="RevBridge"
              width={80}
              height={80}
              className="w-20 h-20"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Schedule a meeting with{' '}
            <span className="text-[#e81111]">RevBridge</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose a team member below to schedule a meeting.
          </p>
        </div>

        {/* Team Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e81111]" />
          </div>
        ) : team.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No team members available at the moment.
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {team.map((member) => (
              <Link
                key={member.username}
                href={`/book/${member.username}`}
                className="group bg-white border border-gray-200 rounded-xl p-6 hover:border-[#e81111] hover:shadow-lg transition-all duration-200 w-full sm:w-72"
              >
                <div className="flex flex-col items-center text-center">
                  {member.photoUrl && member.photoUrl.length > 0 ? (
                    <img
                      src={member.photoUrl}
                      alt={member.displayName}
                      className="w-20 h-20 rounded-full mb-4 group-hover:scale-105 transition-transform object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Se a imagem falhar, esconde e mostra o fallback
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-20 h-20 rounded-full bg-[#e81111] flex items-center justify-center text-white text-2xl font-bold mb-4 group-hover:scale-105 transition-transform ${member.photoUrl && member.photoUrl.length > 0 ? 'hidden' : ''}`}>
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#e81111] transition-colors">
                    {member.displayName}
                  </h3>
                  {member.title && (
                    <p className="text-sm text-gray-500 mt-1">{member.title}</p>
                  )}
                  <span className="mt-4 text-sm text-[#e81111] opacity-0 group-hover:opacity-100 transition-opacity">
                    View available times →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} RevBridge AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
