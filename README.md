# Interview Coach

**Live demo:** [interview-coach-95be.onrender.com](https://interview-coach-95be.onrender.com/)

A full-stack AI interview practice app with real-time facial emotion detection. Users sign in, upload their resume, select an interview type, and practice with GPT-generated questions while a custom-trained emotion model analyzes their expressions via webcam. After the interview, they receive structured AI feedback including speech analysis, strengths, and areas for improvement.

## Tech Stack

- **Frontend:** React 18, Tailwind CSS, TensorFlow.js
- **Backend:** Node.js, Express
- **AI/ML:** OpenAI API (GPT) for interview Q&A and feedback, custom MobileNetV2 model for emotion detection
- **Auth & Data:** Firebase Authentication (Google OAuth), Cloud Firestore
- **Speech:** Web Speech API for real-time transcription
- **Deployment:** Docker, Render

## Emotion Detection Model

The facial emotion recognition model was trained from scratch on the [FER-2013 dataset](https://www.kaggle.com/datasets/msambare/fer2013) (~35k labeled facial expression images across 7 emotion classes). Training uses a MobileNetV2 backbone with a two-phase approach: frozen-base warmup followed by partial fine-tuning. The trained Keras model is then converted to TensorFlow.js format for in-browser inference. Training scripts are in [`fer2013-scripts/`](fer2013-scripts/).

## Run Locally

### Prerequisites

- Node.js 18+
- An OpenAI API key
- A Firebase project with Google sign-in and Firestore enabled

### Setup

```bash
git clone https://github.com/M-Tameem/interview-coach.git
cd interview-coach
npm install
cd client && npm install && cd ..

# Configure environment variables
cp server/.env.example server/.env    # add your OPENAI_API_KEY
cp client/.env.example client/.env    # add your Firebase config values
```

### Development

```bash
# Terminal 1 - API server (port 5000)
npm run dev

# Terminal 2 - React dev server (port 3000)
cd client && npm start
```

### Docker

```bash
docker compose up --build
# App runs at http://localhost:5000
```

Requires `server/.env` with at minimum `OPENAI_API_KEY` set. Client Firebase env vars must be in `client/.env` before building.
