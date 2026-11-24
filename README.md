# MIRVU — AI Interview Simulator

MIRVU is a web app for practicing technical job interviews. Configure a mock interview for a target role and experience level, answer questions, and review a report with scores and feedback.

## Features

- Configure the target role, experience level, interview type, language, and number of questions.
- Combine questions from the local question bank with AI-generated questions when an AI provider is configured.
- Submit answers and receive feedback on technical accuracy, completeness, relevance, and clarity.
- Ask adaptive follow-up questions and review a final interview report.
- Analyze uploaded WebM recordings locally with Python, PyAV, NumPy, and OpenCV.
- Optional neural text-to-speech through Azure Speech.
- Multilingual interface text, including Arabic, English, Spanish, French, and German.

## Project structure

```text
MIRVU/
├── client/                 React + Vite frontend
│   └── src/
│       ├── components/     Setup, interview, report, and UI components
│       ├── context/        Interview state management
│       └── services/       API client
└── server/                 Express backend
    ├── controllers/        Interview session flow
    ├── routes/             API endpoints and uploads
    ├── services/           Questions, AI, evaluation, and recording analysis
    ├── data/               Local interview question bank
    └── analysis/           Python recording analyzer
```

## Requirements

- Node.js (LTS recommended) and npm
- Python 3.10 or newer, including pip, for recording analysis
- An API key for the AI provider you want to use
- Optional: Azure Speech credentials for neural text-to-speech

## Setup

Run these commands from the project root in PowerShell.

### 1. Install backend dependencies

```powershell
cd server
npm install
```

### 2. Configure the backend

While in `server`, create your local environment file:

```powershell
Copy-Item .env.example .env
```

Edit `server/.env` and add the API key for your chosen provider. The default configuration uses Gemini. The example file also documents optional OpenAI, Groq, and Azure Speech settings.

Keep `.env` private. It is excluded from Git by the root `.gitignore`.

### 3. Install Python analysis packages

From the `server` directory, run:

```powershell
npm run setup:analysis
```

If the `python` command is unavailable, use `py -m pip install -r analysis/requirements.txt`, then set `PYTHON_EXECUTABLE` in `server/.env` to the full path of `python.exe`.

### 4. Install frontend dependencies

Return to the project root and install the client packages:

```powershell
cd ..
cd client
npm install
```

Each folder has its own `package.json`. If `node_modules` was deleted, run `npm install` inside the affected folder (`server` or `client`).

## Run locally

Start the backend in one terminal:

```powershell
cd server
npm run dev
```

Start the frontend in a second terminal:

```powershell
cd client
npm run dev
```

Open <http://localhost:5173>. The Vite development server forwards `/api` requests to the backend at <http://localhost:3001>.

Check backend health at <http://localhost:3001/api/health>.

Press `Ctrl+C` in each terminal to stop its process.

## Configuration

The main settings are in `server/.env`:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port; defaults to `3001` |
| `CLIENT_URL` | Frontend origin allowed by CORS; defaults to `http://localhost:5173` |
| `LLM_PROVIDER` | Preferred AI provider |
| `GEMINI_API_KEY` | Gemini API key |
| `OPENAI_API_KEY` | Optional OpenAI API key |
| `GROQ_API_KEY` | Optional Groq API key |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Optional Azure Speech credentials |
| `PYTHON_EXECUTABLE` | Python executable used for recording analysis |
| `DEFAULT_MAIN_QUESTIONS`, `MAX_FOLLOW_UP_QUESTIONS` | Interview question limits |
| `DATASET_QUESTION_RATIO` | Target share of questions selected from the local dataset |
| `SESSION_TIMEOUT_MS` | In-memory session expiration time in milliseconds |

## Architecture notes

- The frontend is a React app served by Vite during development.
- The backend is an Express API. Interview sessions are held in memory and expire after the configured timeout; they are not stored in a persistent database.
- The question bank is located at `server/data/interviewQuestions.json`. AI features depend on configured provider credentials; local questions are available as fallback.
- The Node.js backend runs `server/analysis/analyze_recording.py` for local media analysis. The analyzer uses PyAV, NumPy, and OpenCV and does not send the recording to an AI provider.
- Temporary analysis recordings are stored in `server/tmp/recordings` and expired files are removed periodically. See `server/analysis/README.md` for details.

## Documentation

- [Arabic setup and run guide](دليل_تشغيل_المشروع.md)
- [English project overview](PROJECT_OVERVIEW.md)
- [Recording analysis notes](server/analysis/README.md)
