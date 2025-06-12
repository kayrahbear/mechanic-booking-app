# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a cloud-based mechanic scheduling application built on Google Cloud Platform with a FastAPI backend and Next.js SSR frontend. The system uses Firestore as the primary database with Firebase Authentication for user management.

### Key Components
- **Backend**: Python 3.11 + FastAPI (`backend/app/`)
- **Frontend**: Next.js SSR with TypeScript (`frontend/`)
- **Database**: Google Cloud Firestore (native mode)
- **Infrastructure**: Terraform modules (`infra/`)
- **Worker**: Notification service (`backend/worker/`)
- **Functions**: Firebase Cloud Functions (`functions/`)

### Data Model (Firestore Collections)
- `services`: Available service types with duration and pricing
- `availability`: Daily time slots (free/booked/blocked status)
- `bookings`: Customer appointments with transactional integrity
- `mechanics`: Staff information and schedules
- `users`: User accounts with role-based access

## Development Commands

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt      # Install dependencies
uvicorn app.main:app --reload        # Run development server
python -m pytest tests/ -v          # Run tests
./run_tests.sh                       # Run tests with Firebase emulators
```

### Frontend (Next.js)
```bash
cd frontend
npm install                          # Install dependencies
npm run dev                          # Run development server with Turbopack
npm run build                        # Build for production
npm run lint                         # Run ESLint
```

### Full Stack Development
```bash
docker-compose up -d                 # Start both services
firebase emulators:start             # Start Firebase emulators (port 8080, 9099)
```

### Infrastructure
```bash
cd infra
terraform init                       # Initialize Terraform
terraform plan                       # Plan changes
terraform apply                      # Apply changes
gcloud builds submit                 # Deploy via Cloud Build
```

### Database Management
```bash
cd backend
python -m scripts.init_firestore     # Initialize sample data
python -m scripts.set_first_admin    # Set admin user
./deploy_rules.sh                    # Deploy Firestore security rules
```

## Code Patterns

### FastAPI Endpoints
- Use router-based organization (`backend/app/routers/`)
- Implement Firestore transactions for booking operations
- Follow dependency injection pattern for database clients
- Use environment variables for GCP configuration

### Next.js Pages
- All pages use Server-Side Rendering with `getServerSideProps`
- API calls through `lib/backendClient.ts`
- Firebase Authentication context in `lib/auth-context.tsx`
- Theme support via `lib/theme-context.tsx`

### Firestore Operations
- Booking creation uses atomic transactions
- Query patterns optimize for daily availability lookups
- Security rules enforce role-based access (admin/user/anonymous)

## Testing

Backend tests use Firebase emulators and require:
- Firestore emulator on port 8080
- Auth emulator on port 9099
- Environment variables: `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`

Run `./backend/run_tests.sh` to automatically start emulators and run tests.

## Environment Configuration

Project uses environment-specific configuration:
- `GCLOUD_PROJECT`: auto-mech-booking
- `GCLOUD_REGION`: us-central1
- Frontend environment variables prefixed with `NEXT_PUBLIC_`
- Backend uses Google Application Default Credentials

## Deployment

The application deploys to Google Cloud Run via Cloud Build pipeline defined in `cloudbuild.yaml`. Infrastructure is provisioned through Terraform modules with separate service accounts for each component.