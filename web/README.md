# TAKDA Web App

A modern React/Next.js web application for TAKDA - Personal Life Operating System.

## Features

- 📱 Responsive design with dark theme
- 🔐 Supabase authentication
- 📅 Calendar integration (coming soon)
- 📧 Email integration (coming soon)
- ☁️ Cloud storage integration (coming soon)
- 🎨 Modern UI with Framer Motion animations

## Tech Stack

- **Framework**: Next.js 16.2.2 with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Icons**: Phosphor Icons
- **Backend**: Supabase + Custom API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Dev-jpl/TAKDA-Web.git
cd TAKDA-Web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see Environment Setup below)

4. Run development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Setup

### Development

Copy `.env.local` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Google OAuth for calendar integration
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```

### Production

The app automatically uses production settings when deployed. For manual production builds:

```bash
npm run build:prod
npm run start:prod
```

Production environment variables are set via your hosting platform (Vercel, Netlify, etc.).

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL=https://takda-backend.onrender.com`
3. Deploy automatically on push

### Other Platforms

The app is compatible with:
- Netlify
- Railway
- Render
- Any Node.js hosting service

## API Integration

The web app communicates with the TAKDA backend API. Make sure the backend is running and accessible.

### Development API
- URL: `http://localhost:8000`
- Environment: `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Production API
- URL: `https://takda-backend.onrender.com`
- Environment: `NEXT_PUBLIC_API_URL=https://takda-backend.onrender.com`

## Project Structure

```
web/
├── app/                    # Next.js app router
│   ├── (auth)/            # Authentication pages
│   ├── profile/           # User profile
│   ├── settings/          # Settings page
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── common/           # Shared components
│   ├── navigation/       # Navigation components
│   └── profile/          # Profile components
├── constants/            # App constants
├── hooks/                # Custom React hooks
├── services/            # API service functions
├── store/               # State management
├── utils/               # Utility functions
└── styles/              # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:prod` - Build with production environment
- `npm run start` - Start production server
- `npm run start:prod` - Start with production environment
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is part of the TAKDA Personal Life Operating System.
