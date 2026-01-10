# GreenSteps

GreenSteps is a sustainability coaching platform that turns eco-goals into clear, step-by-step impact plans. Each step can launch a live voice coaching session for guidance and encouragement.

## Project Idea
- Create practical sustainability plans from a topic in seconds.
- Break each impact into actionable steps with icons and descriptions.
- Offer live, voice-guided coaching for each step.
- Personalize guidance using user profile data (full name, age, interests).

## Features
- JWT authentication with refresh tokens.
- Impact generation with AI and structured validation.
- Step-by-step impact navigation.
- Live voice coaching via WebSocket audio streaming.
- Profile editing (full name, age, interests).
- Frontend health checks and auth heartbeat.

## Architecture
- **Backend**: FastAPI + PostgreSQL.
- **Frontend**: React + Vite.
- **Voice**: WebSocket streaming with AI audio responses.
- **Web**: Nginx serves the built frontend.

## Services
- `api`: FastAPI backend
- `db`: PostgreSQL database
- `web`: Nginx serving the frontend build

## Production URLs
- Backend API: `https://greensteps-api.devlix.org`

## Environment
Copy `.env` from `example.env` and update values as needed.

## Deployment (Docker)
Build and run the full stack:

```bash
docker compose up --build
```

The services will be available at:
- Frontend: `http://localhost`
- Backend: `http://localhost:8000`

## Notes
- The frontend is configured to use `https://greensteps-api.devlix.org` by default.
- If you need a different API base, update `frontend/src/config.js`.
- Reset the database if you removed or changed models (e.g., `user_data`).

## Development (optional)
Frontend dev server:

```bash
cd frontend
npm install
npm run dev
```

Backend dev server (outside Docker):

```bash
uvicorn main:app --reload
```

## API Reference
FastAPI docs are available at:
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`
