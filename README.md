# Mechanic Scheduling App

### Follow Progress: [Notion Kanban Board](https://graceful-bougon-a08.notion.site/Board-1d9a7ae26817816cbafbce6e5ff7c608)

## Services Overview

<img src="docs/mech_app_services.svg" alt="Services Overview" width="800">

A cloud-based scheduling application for booking mechanic services. This app uses Google Cloud Platform (GCP) services, a FastAPI backend, and a Next.js SSR frontend to provide a seamless user experience for viewing, selecting, and booking available service slots.

## Firestore Data Model

The application uses Google Cloud Firestore (native mode) as the primary database. The data model consists of the following collections:

- **services**: Available service types offered by mechanics
- **availability**: Available time slots for each day
- **bookings**: Customer appointments
- **mechanics**: Staff information and schedules
- **users**: User accounts and roles

For detailed schema information, see [firestore-schema.md](./firestore-schema.md).

## Security Rules

Firestore security rules enforce access control:

- Anonymous users can read services and availability
- Authenticated users can create bookings and read their own bookings
- Only admins can manage services, mechanics, and all bookings
- Users can only access their own profile data

## Getting Started

### Prerequisites

- Google Cloud account with Firestore and Cloud Run access
- Node.js 16+ and Python 3.11+
- Firebase CLI (for deploying security rules)

### Local Development Setup

1. Clone the repository

   ```
   git clone https://github.com/yourusername/mechanic-scheduling-app.git
   cd mechanic-scheduling-app
   ```

2. Install dependencies

   ```
   # Backend
   cd backend
   pip install -r requirements.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. Set up local environment

   ```
   # Set up Firebase emulator
   firebase init emulators
   
   # Start Docker containers
   docker-compose up -d
   ```

4. Initialize sample data

   ```
   cd backend
   python -m scripts.init_firestore
   ```

5. Deploy Firestore security rules

   ```
   ./deploy_rules.sh
   ```

## Deployment

The application is deployed to Google Cloud Run via Cloud Build:

```
gcloud builds submit
```

## Data Access Patterns

The application uses Firebase Authentication for user management and Firestore transactions to ensure data consistency during booking operations.

Key access patterns:

- Query available slots by day
- Create bookings within a transaction
- List bookings by customer or mechanic
- Filter services by type

For more information about the infrastructure, see the `infra/` directory.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Architecture](#architecture)
5. [Services](#services)
6. [Infrastructure Provisioning](#infrastructure-provisioning)

---

## Overview

The Mechanic Scheduling App allows users to:

- Browse available services (e.g., oil change, tire rotation).
- Check time-slot availability on a daily calendar grid.
- Book appointments with transactional integrity.
- Receive booking confirmations via email/SMS.
- Sync appointments to Google Calendar.

The application follows a serverless, microservices-inspired design on GCP, leveraging managed services to minimize operational overhead.

---

## Technology Stack

- **Frontend:** Next.js (Server-Side Rendering)
- **Backend:** Python 3.11 + FastAPI
- **Database:** Firestore (Native Mode)
- **Messaging & Tasks:** Cloud Tasks, Eventarc
- **Deployment & IaC:** Terraform, Cloud Build
- **Containers & Registry:** Docker (Distroless images), Artifact Registry
- **Notifications:** SendGrid (Email), Twilio (SMS)
- **Observability:** Cloud Logging, Monitoring, Uptime Checks

---

## Prerequisites

Before you begin, ensure you have installed and configured:

- **gcloud CLI:** Authenticated to your Google account
- **Docker Desktop** (or Podman) running locally
- **Node.js ≥ 18**
- **Python ≥ 3.11** with **Poetry** or **pip‑tools** for dependency management

---

## Architecture

```mermaid
flowchart LR
  Browser -->|HTTPS GET| NextJS_FE[Next.js SSR]
  NextJS_FE -->|REST /availability<br>/bookings| FastAPI_BE[FastAPI Backend]
  FastAPI_BE -->|Firestore Client| Firestore[(Firestore)]
  FastAPI_BE -->|enqueue_Task| Cloud_Tasks[Cloud Tasks]
  Cloud_Tasks -->|push| Worker[Notification Worker]
  Worker -->|SendGrid/Twilio| External_Services[(Email/SMS APIs)]
  FastAPI_BE -->|Calendar Sync| Calendar_API[(Google Calendar)]
```

---

## Services

### Frontend (frontend-ssr)

- Built with Next.js in SSR mode
- Pages: `/`, `/services`, `/availability`, `/bookings`
- Data fetched via `getServerSideProps`
- Dockerized for production

### Backend API (backend-api)

- FastAPI application
- Endpoints:
  - `GET /healthz` — Health check
  - `GET /version` — API version
  - `GET /availability` — List free slots
  - `POST /bookings` — Create a booking
- Firestore client wired via environment variables
- Atomic booking logic using Firestore transactions

### Notification Worker

- Pulls tasks from the `notification-tasks` Cloud Tasks queue
- Stub logs payload; later integrates with SendGrid and Twilio

### Google Calendar Sync

- Uses a service account to create calendar events
- Stores `calendar_event_id` in booking documents

---

## Infrastructure Provisioning

All infrastructure is defined and provisioned via Terraform:

1. **Bootstrap**
   - Remote state bucket & state lock table
   - VPC + reserved Firestore location
2. **Core Components**
   - Artifact Registry repositories (`frontend`, `backend`)
   - Cloud Run services:
     - `frontend-ssr` (minInstances=0)
     - `backend-api`  (minInstances=0)
   - Cloud Tasks queue: `notification-tasks`
   - Secret Manager placeholders ( `SENDGRID_KEY`, `TWILIO_SID`, `TWILIO_TOKEN`, etc.)
   - IAM service accounts with least privilege
