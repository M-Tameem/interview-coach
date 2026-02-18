# Interview Coach

AI-powered mock interview app with real-time facial emotion detection. Users upload their resume, pick an interview type, and get GPT-generated questions + structured feedback at the end.

**Stack:** React · TensorFlow.js · Express · OpenAI · Firebase Auth/Firestore

---

## Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A [Firebase project](https://console.firebase.google.com/) with **Google sign-in** and **Firestore** enabled

---

## Local development

### 1. Clone and install

```bash
git clone https://github.com/your-username/interview-coach.git
cd interview-coach
npm install
cd client && npm install --legacy-peer-deps && cd ..
```

### 2. Configure environment variables

```bash
# Server
cp server/.env.example server/.env
# Fill in OPENAI_API_KEY (and optionally GPT_MODEL)

# Client
cp client/.env.example client/.env
# Fill in all REACT_APP_FIREBASE_* values from your Firebase project settings
```

### 3. Run

In two separate terminals:

```bash
# Terminal 1 — API server (port 5000)
npm run dev

# Terminal 2 — React dev server (port 3000, proxies /api to :5000)
cd client && npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker (production build locally)

```bash
# Build and start
docker compose up --build

# The app is served at http://localhost:5000
```

Requires a `server/.env` file with at minimum `OPENAI_API_KEY` set.

---

## Deploy to Render

1. Push the repo to GitHub.
2. In the [Render dashboard](https://render.com), create a **New Web Service** connected to the repo.
   Render will auto-detect `render.yaml` and pre-fill the settings.
3. Set the secret environment variables in the Render dashboard:
   - `OPENAI_API_KEY`
   - All `REACT_APP_FIREBASE_*` keys
4. Deploy. The build command installs deps, builds the React client, and the start command serves everything from the same Express process.

> **Note:** `REACT_APP_*` env vars are baked into the React bundle at build time. They must be set in Render **before** the first deploy (or trigger a redeploy after adding them).

---

## Environment variable reference

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI secret key |
| `GPT_MODEL` | optional | Model to use (default: `gpt-3.5-turbo`) |
| `PORT` | optional | Server port (default: `5000`) |
| `CORS_ORIGIN` | optional | Allowed origin in dev/split-service setups |

### `client/.env`

All `REACT_APP_FIREBASE_*` values come from **Firebase Console → Project Settings → Your Apps → SDK setup and configuration**.

---

## Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication → Google** sign-in.
3. Enable **Firestore Database** in production mode (add security rules as needed).
4. Register a **Web App** and copy the config values into `client/.env`.
5. Add your domain (or `localhost`) to **Authentication → Authorized Domains**.
