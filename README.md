# Bangladesh Government Job Preparation Platform (MERN)

Full-stack MERN starter for Bangladesh job aspirants preparing for BCS, Primary, NTRCA, Bank and other competitive exams.

## Features Included

- Vite + React 18 frontend with Tailwind CSS
- Dynamic homepage sections:
  - Hero with animated counters
  - Featured exams carousel
  - Success stories slider
  - Latest job circulars ticker
  - Quick stats chart dashboard
  - CTA: Start Preparation Now
- Express + MongoDB backend
- JWT auth using httpOnly cookies
- Redux Toolkit state management
- React Hook Form + Yup validation
- Socket.io foundation for live exam/chat
- Cloudinary upload config scaffold

## Project Structure

- `client/` React frontend
- `server/` Express backend

## Setup

1. Copy env files:
   - `server/.env.example` to `server/.env`
   - `client/.env.example` to `client/.env`
2. Install dependencies:

```bash
npm run install:all
```

3. Run backend:

```bash
npm run dev:server
```

4. Run frontend (new terminal):

```bash
npm run dev:client
```

## Seed Data

```bash
npm run seed --prefix server
```

Default seeded admin:

- Email: `admin@jobprep.com`
- Password: `admin123`

## Deployment (Render)

This repository includes a Render Blueprint file: `render.yaml`.

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial full-stack app setup"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

### 2. Deploy Backend + Frontend on Render

1. In Render dashboard, choose **New > Blueprint**.
2. Connect your GitHub repo and select this project.
3. Render will detect `render.yaml` and create:
   - `bcs-ntrc-api` (Node backend)
   - `bcs-ntrc-web` (Static frontend)
4. Set required env vars in Render:
   - Backend (`bcs-ntrc-api`):
     - `MONGODB_URI`
     - `CLIENT_URL` (your frontend URL)
     - `JWT_SECRET`
     - `REFRESH_JWT_SECRET`
     - `ADMIN_EMAIL`
     - `ADMIN_PASSWORD`
     - Optional: Cloudinary/SMTP vars
   - Frontend (`bcs-ntrc-web`):
     - `VITE_API_URL` = `https://<your-backend-domain>/api`

### 3. Final CORS sync

After frontend deploy URL is available, update backend `CLIENT_URL` to that exact frontend URL and redeploy backend once.

## Important Notes

- Update `JWT_SECRET` in production.
- Enable secure cookies (`secure: true`) behind HTTPS.
- Add rate limiting and CSRF protection before production launch.
- Add payment gateway integration (SSLCommerz or bKash) and SMS provider (Twilio/GreenWeb) in service layer.
