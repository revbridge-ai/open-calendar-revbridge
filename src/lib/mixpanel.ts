// Mixpanel tracking helper
import mixpanel from 'mixpanel-browser';

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  try {
    mixpanel.track(event, properties);
  } catch (e) {
    // Mixpanel not initialized yet, ignore
  }
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  try {
    mixpanel.identify(userId);
    if (properties) {
      mixpanel.people.set(properties);
    }
  } catch (e) {
    // Mixpanel not initialized yet, ignore
  }
}

// Booking funnel events
export const BookingEvents = {
  // Step 1: User lands on booking page
  BOOKING_PAGE_VIEWED: 'Booking Page Viewed',

  // Step 2: User selects a meeting type
  MEETING_TYPE_SELECTED: 'Meeting Type Selected',

  // Step 3: User selects a date
  DATE_SELECTED: 'Date Selected',

  // Step 4: User selects a time slot
  TIME_SELECTED: 'Time Selected',

  // Step 5: User advances to form (clicks Continue)
  FORM_STARTED: 'Form Started',

  // Step 6: User submits the booking
  BOOKING_SUBMITTED: 'Booking Submitted',

  // Step 7: Booking confirmed
  BOOKING_CONFIRMED: 'Booking Confirmed',
} as const;
