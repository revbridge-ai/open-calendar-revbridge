# Open Calendar

A modern, open-source Calendly alternative built with Next.js, Firebase, and Google APIs. Multi-user support with personal booking pages, Google Calendar integration, and Slack notifications.

## Features

### Core Features
- **Multi-User Support** - Each user gets their own account and booking page
- **Personal Booking Pages** - Public URL: `/book/{username}`
- **Team Landing Page** - Homepage shows all team members with photos
- **Google Calendar Integration** - Events automatically created with color coding
- **Google Meet Integration** - Automatic video conference links
- **Gmail Integration** - Automatic confirmation and cancellation emails
- **Slack Integration** - Webhook notifications for new bookings and cancellations
- **Real-time Availability** - Checks Google Calendar for conflicts

### Booking Experience
- **2-Step Booking Wizard** - Clean UX: Date/Time selection -> Guest details
- **Smart Calendar** - Only shows days with available slots
- **Timezone Support** - Automatic detection with manual override
- **Per-Meeting-Type Availability** - Custom availability per meeting type
- **Buffer Times** - Configurable buffer before/after meetings
- **Multiple Guests** - Support for additional attendees (up to 10)
- **Company Field** - Required company name for all bookings

### Admin Dashboard
- **Mobile Optimized** - Responsive design with hamburger menu
- **Profile Configuration** - Name, title, bio, and custom cancellation message
- **Availability Settings** - Global and per-meeting-type scheduling
- **Meeting Type Management** - Create, edit, delete meeting types with custom colors
- **Integrations** - Multiple Slack webhook configurations

### Analytics
- **Mixpanel Integration** - Full booking funnel tracking
  - Booking Page Viewed
  - Meeting Type Selected
  - Date Selected
  - Time Selected
  - Form Started
  - Booking Submitted
  - Booking Confirmed

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Database | Firebase Firestore |
| Storage | Firebase Storage (profile photos) |
| Authentication | Google OAuth 2.0 |
| Calendar | Google Calendar API |
| Email | Gmail API |
| Analytics | Mixpanel (optional) |
| UI | Tailwind CSS, shadcn/ui |
| Deployment | Docker / Google Cloud Run |
| Language | TypeScript |

## Getting Started

### Prerequisites

- Node.js 20+
- Google Cloud Console project with:
  - OAuth 2.0 credentials
  - Calendar API enabled
  - Gmail API enabled
- Firebase project with Firestore enabled
- (Optional) Firebase Storage for profile photos

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Firebase Admin
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_STORAGE_BUCKET=your-bucket-name

# App
ENCRYPTION_KEY=your_32_byte_hex_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Restrict login to specific email domain
ALLOWED_EMAIL_DOMAIN=your-company.com

# Optional: Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN=your_token
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

### Initial Setup

1. Open `http://localhost:3000/login`
2. Sign in with your Google account
3. Your account is automatically created with your email username
4. Configure your profile at `/profile` (name, title, bio, cancellation message)
5. Configure your global availability at `/availability`
6. Create meeting types at `/meeting-types`
7. Share your booking link: `{your-domain}/book/{your-username}`

## Project Structure

```
src/
├── app/
│   ├── (admin)/           # Protected admin pages
│   │   ├── dashboard/     # Booking overview
│   │   ├── profile/       # User profile settings
│   │   ├── availability/  # Schedule settings
│   │   ├── meeting-types/ # Meeting type management
│   │   └── integrations/  # Slack and other integrations
│   ├── (public)/          # Public pages
│   │   └── book/
│   │       ├── [username]/           # User's meeting types list
│   │       ├── [username]/[slug]/    # Booking wizard
│   │       └── [username]/confirmed/ # Confirmation
│   └── api/               # API routes
├── components/
│   ├── admin/             # Admin components (Sidebar)
│   ├── ui/                # shadcn/ui components
│   └── MixpanelProvider   # Analytics provider
├── lib/
│   ├── firebase/          # Firestore collections & storage
│   ├── google/            # Calendar, Gmail & Auth APIs
│   ├── integrations/      # Slack webhook dispatcher
│   └── mixpanel.ts        # Analytics tracking
└── types/                 # TypeScript types
```

## API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/google` | GET | - | Initiate OAuth flow |
| `/api/auth/callback` | GET | - | OAuth callback |
| `/api/auth/logout` | GET | - | Clear session |
| `/api/auth/me` | GET | - | Check authentication status |
| `/api/profile` | GET/PUT | Yes | User profile |
| `/api/settings` | GET/PUT | Yes | User settings |
| `/api/meeting-types` | GET/POST | Yes | Meeting types |
| `/api/meeting-types/[id]` | GET/PUT/DELETE | Yes | Single meeting type |
| `/api/slots` | GET | - | Available time slots |
| `/api/bookings` | GET/POST | Mixed | Bookings |
| `/api/bookings/[id]` | GET/PUT/DELETE | Yes | Single booking |
| `/api/users/[username]` | GET | - | Public user info |
| `/api/users/[username]/meeting-types` | GET | - | Public meeting types |
| `/api/team` | GET | - | List all team members |
| `/api/integrations/slack/webhooks` | GET/POST | Yes | Slack webhooks |

## Deployment

### Docker

```bash
docker build -t open-calendar .
docker run -p 3000:3000 --env-file .env.local open-calendar
```

### Google Cloud Run

```bash
gcloud run deploy open-calendar \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

Configure secrets via Google Secret Manager or environment variables.

## Firestore Data Structure

```
users/{userId}/
├── profile/data           # User profile
├── settings/config        # Availability, timezone
├── tokens/oauth           # Encrypted Google tokens
├── meeting-types/{id}     # Meeting types
├── bookings/{id}          # Bookings
└── slack-webhooks/{id}    # Slack webhook configs

usernames/{username}       # Global index: username -> userId
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Built with love by [RevBridge AI](https://revbridge.ai)
