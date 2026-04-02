# TAKDA Workspace Instructions

## Project Overview

TAKDA is a personal life operating system built as a modular, AI-enhanced productivity platform. It organizes life into "Spaces" (domains like Health, Finance) containing "Hubs" (specific areas like Fitness, Nutrition). Each Hub supports 5 core modules: Track, Annotate, Knowledge, Deliver, Automate, plus a Kalay AI companion.

The system consists of:
- **Backend**: Python FastAPI API server with Supabase database
- **Mobile App**: React Native (Expo) app for iOS/Android/Web
- **AI Features**: Integrated OpenAI/Anthropic APIs for intelligent assistance

## Architecture

### Backend (FastAPI)
- Modular router structure (`/routers/`) for each feature module
- Shared services layer (`/services/`) for business logic
- AI agents (`/services/agents/`) for specialized AI functionality
- Supabase integration for database and real-time subscriptions
- RESTful API with Pydantic validation

### Mobile App (React Native + Expo)
- Screen-based navigation with React Navigation
- Service layer abstraction for API calls
- Real-time Supabase subscriptions for live updates
- Component-based UI with enforced dark theme
- Expo libraries for camera, file handling, and native features

### Data Flow
Mobile app ↔ Backend API ↔ Supabase Database
AI features integrate OpenAI/Anthropic APIs for enhanced functionality

## Key Technologies

### Backend
- Python 3.11, FastAPI, Uvicorn
- Supabase (PostgreSQL + Auth + Real-time)
- OpenAI + Anthropic APIs
- FastEmbed for embeddings
- PyPDF2, BeautifulSoup4 for document processing

### Mobile
- React Native 0.81.5, Expo ~54
- React Navigation
- Supabase JS client
- Phosphor Icons
- Expo AV/Camera/Document Picker/File System

## Development Setup

### Prerequisites
- Node.js, Python 3.11, Docker
- Supabase account and project
- OpenAI and Anthropic API keys

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Set up .env with SUPABASE_URL, SUPABASE_KEY, API keys
docker-compose up  # Runs on port 8000
```

### Mobile Setup
```bash
cd mobile
npm install
# Set up .env with EXPO_PUBLIC_SUPABASE_* vars
npm start  # or expo start --dev-client
```

### Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- OpenAI API key
- Anthropic API key

## Code Style and Conventions

### Naming
- **Python**: snake_case for variables/functions, PascalCase for classes
- **JavaScript**: camelCase for variables/functions, PascalCase for components
- **Files**: kebab-case for JS/TS, snake_case for Python

### Structure
- Backend: Feature-based routers, services for shared logic
- Mobile: Screen-based organization, service layer for API calls
- Components: Reusable, focused on single responsibility

### Design System
- **Dark-only theme**: Canvas `#0A0A0A`, layered backgrounds `#141414`/`#1A1A1A`
- **Module colors**: Track (purple), Annotate (teal), Knowledge (blue), Deliver (green), Automate (orange)
- **Typography**: Limited weights (400/500), specific sizes, uppercase labels
- **Icons**: Phosphor Icons only, no emojis
- **Spacing**: 20px horizontal edges, 8-12px internal gaps

## Common Patterns

### Backend
- Router classes with dependency injection
- Pydantic models for API validation
- Supabase client for database operations
- AI agent classes for specialized functionality

### Mobile
- Screen components with navigation props
- Service functions for API calls
- Real-time subscription hooks
- Component composition for UI building

### Error Handling
- Backend: HTTP exceptions with appropriate status codes
- Mobile: Try/catch with user-friendly error messages

## Potential Pitfalls

### Environment Issues
- Missing API keys cause AI features to fail silently
- Incorrect Supabase URLs break authentication
- Docker networking issues when running locally

### Development Challenges
- No local database - requires Supabase setup
- Real-time features depend on network connectivity
- iOS builds require CocoaPods setup
- Expo dev client needed for custom native code

### Architecture Considerations
- Heavy reliance on external APIs (Supabase, OpenAI)
- No offline mode implemented
- Real-time subscriptions can impact battery/performance

## Key Files and Directories

### Documentation
- `design_guide.md` - Complete UI/UX principles
- `takda_full_restructure_plan.md` - Architecture evolution
- `kalay_takda_companion_development_guid.md` - AI companion details

### Backend Core
- `backend/main.py` - FastAPI app setup
- `backend/database.py` - Supabase client
- `backend/routers/kalay.py` - AI companion endpoints
- `backend/services/kalay_agent.py` - AI logic
- `backend/schema.sql` - Database schema

### Mobile Core
- `mobile/App.js` - App entry point
- `mobile/src/components/navigation/RootNavigator.js` - Navigation setup
- `mobile/src/services/supabase.js` - Supabase client
- `mobile/src/screens/kalay/KalayScreen.js` - AI companion UI
- `mobile/src/constants/colors.js` - Module colors

### Configuration
- `backend/requirements.txt` - Python dependencies
- `mobile/package.json` - Node dependencies
- `docker-compose.yml` - Backend orchestration
- `backend/Dockerfile` - Container build

## AI Agent Guidelines

When working with this codebase:

1. **Respect the modular architecture** - Keep features within their appropriate modules
2. **Follow the design system** - Maintain dark theme and spacing consistency
3. **Test API integrations** - Supabase and AI APIs are critical dependencies
4. **Consider mobile-first** - UI decisions impact iOS/Android/Web
5. **Document AI features** - Kalay and agents require clear prompt engineering

## Build and Test Commands

### Backend
- Run: `cd backend && uvicorn main:app --reload`
- Docker: `docker-compose up`
- No tests currently implemented

### Mobile
- Start: `cd mobile && npm start`
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`
- No tests currently implemented</content>
<parameter name="filePath">/Users/patrick/Projects/Personal/takda/.github/copilot-instructions.md