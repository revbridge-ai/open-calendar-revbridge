'use client';

import { useEffect } from 'react';
import mixpanel from 'mixpanel-browser';

// Expose mixpanel to window for debugging
if (typeof window !== 'undefined') {
  (window as any).mixpanel = mixpanel;
}

export function MixpanelProvider() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (!token) return;

    mixpanel.init(token, {
      autocapture: true,
      track_pageview: true,
      persistence: 'localStorage',
    });
  }, []);

  return null;
}
