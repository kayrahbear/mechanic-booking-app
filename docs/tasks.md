| # | Task | Deliverables / Checks |
| --- | --- | --- |
| 0 | Local prerequisites | * gcloud CLI installed and authenticated* Docker Desktop (or Podman) running* Node ≥ 18, Python ≥ 3.11, Poetry or pip‑tools |
| 1 | Create & secure GCP project | * New project auto‑mech‑booking* Billing linked + budget alert* Owner → your main account only |
| 2 | Enable required APIs | Cloud Run, Artifact Registry, Firestore, IAM, Cloud Build, Cloud Tasks, Eventarc, Secret Manager, Cloud Logging/Monitoring |
| 3 | Terraform bootstrap | * Remote state bucket + state lock table* Root main.tf that just creates a VPC and reserved Firestore location (Native mode) |
| 4 | CI/CD foundation | * cloudbuild.yaml with steps:  1. Terraform init/plan/apply (separate workspace)  2. Build & push frontend and backend containers to Artifact Registry* GitHub trigger enabled |
| 5 | Define core infra (Terraform) | * Cloud Run services: frontend‑ssr, backend‑api (minInstances = 0)* Artifact Registry repos (docker)* Cloud Tasks queue notification‑tasks* Secret Manager placeholders (SENDGRID_KEY, TWILIO_SID, etc.)* IAM service accounts with least privilege |
| 6 | FastAPI skeleton | * /healthz & /version endpoints* /availability GET, /bookings POST (no logic yet)* Firestore client wired via env var* Dockerfile (distroless) |
| 7 | Next.js project (SSR mode) | * Pages: /, /services, /availability, /bookings* Fetch API data with getServerSideProps* Dockerfile (next start in prod mode) |
| 8 | Firestore data model & security rules | * Collections: services, availability, bookings, users* Write security rules (only authenticated user can read/write their bookings) |
| 9 | Booking transaction logic | * Firestore transaction in FastAPI to atomically validate free slot → create booking* Unit tests using the Firestore emulator |
| 10 | Cloud Tasks + notifications (stub) | * On successful booking, push task to queue; worker logs payload (email/SMS send deferred) |
| 11 | Google Calendar sync | * Create event with service account; store calendar_event_id in booking doc |
| 12 | Frontend UX polish | * Availability picker (date + time grid)* Service selection tied to duration filtering* Toasts for success/error |
| 13 | Observability & SLOs | * Log‑based metric: booking_latency* Alert policy: > 1 booking failure in 15 min* Uptime check on /healthz |
| 14 | Secrets + provider integration | * Store real SendGrid/Twilio creds in Secret Manager* Worker sends email & SMS on booking create |
| 15 | Smoke & load tests | * Locust or k6 script (≤ 30 concurrent users)* Ensure p90 latency < 500 ms |
| 16 | Go‑live checklist | * Custom domain & Cloud Run domain mapping* Cloud Armor basic rule set* Daily Firestore export schedule |