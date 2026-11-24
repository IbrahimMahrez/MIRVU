# MIRVU- AI Interview Simulator — Project Overview

## What the project does

The AI Interview Simulator is a web application for practicing technical job interviews. A candidate configures a session by choosing a target role, experience level, interview type, language, and number of main questions. The application asks questions, accepts written or spoken answers, can ask follow-up questions, and produces a feedback report at the end.

The interface includes setup, interview, and report screens. The translation catalog currently contains Arabic, English, Spanish, French, and German interface text.

## Main capabilities

- Builds interviews from a local question bank and, when configured, AI-generated questions.
- Evaluates submitted answers and reports technical accuracy, completeness, relevance, and clarity, with a total score out of 100.
- Can ask follow-up questions based on an answer.
- Produces a final report with scores, strengths, weaknesses, missing concepts, and recommendations.
- Supports recorded interview media and local audio/video feedback analysis.
- Offers optional Azure Speech text-to-speech when Azure Speech credentials are configured.
- Provides a server health endpoint at `/api/health`.

## How the application is organized

```text
MIRVU/
├── client/                 React and Vite frontend
│   └── src/
│       ├── components/     Setup, interview, report, and UI components
│       ├── context/        Interview state and actions
│       └── services/       Frontend API client
└── server/                 Express backend
    ├── controllers/        Interview session flow
    ├── routes/             HTTP endpoints and upload handling
    ├── services/           Questions, AI providers, evaluation, media analysis
    ├── data/               Local interview question bank
    └── analysis/           Python recording analyzer and requirements
```

### Frontend

The frontend is built with React 18 and Vite. It gathers the interview settings, presents questions and answer controls, and displays the final report. During development, Vite serves the app on port `5173` and proxies `/api` requests to the backend on port `3001`.

### Backend

The backend uses Node.js and Express. It validates requests, creates and tracks interview sessions, selects questions, evaluates answers, and returns the report to the frontend. Interview session data is held in server memory and expires after the configured timeout; it is not a persistent database.

### AI question and evaluation service

The backend can connect to configured language-model providers for question generation, follow-up decisions, answer evaluation, and recommendations. A local question bank in `server/data/interviewQuestions.json` provides questions and supports fallback behavior when AI is unavailable. Provider selection and credentials are configured through `server/.env`.

### Recording analysis

The Node.js backend invokes `server/analysis/analyze_recording.py` to inspect an uploaded WebM recording. The Python analyzer uses PyAV, NumPy, and OpenCV to produce audio and visual observations. According to the analyzer documentation, this local analysis does not send the recording to an AI provider. Temporary recordings are stored under `server/tmp/recordings` and expired files are cleaned up periodically.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, Axios, Tailwind CSS, Lucide React |
| Backend | Node.js, Express, Multer, Zod |
| AI integration | Google Gemini SDK, with optional provider configuration for OpenAI or Groq |
| Recording analysis | Python 3.10+, PyAV, NumPy, OpenCV |
| Optional speech output | Azure Speech service |

## Configuration

Copy `server/.env.example` to `server/.env` and set the credentials for the services you intend to use. The main settings include:

- `PORT` and `CLIENT_URL` for the backend and frontend addresses.
- `LLM_PROVIDER` and provider API keys for AI functionality.
- `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` for optional neural speech output.
- `PYTHON_EXECUTABLE` if Python is not available as `python` on `PATH`.
- Interview question counts, dataset/AI question ratio, and session timeout.

Keep `.env` files and API keys private. Do not commit secrets to a public repository.

## Local development

Install Node.js (LTS) and Python 3.10 or newer. Install the JavaScript dependencies separately in each application folder:

```powershell
cd server
npm install
npm run setup:analysis
```

In a second terminal, from the project root:

```powershell
cd client
npm install
```

Configure `server/.env`, then start the backend and frontend in separate terminals:

```powershell
# Terminal 1 — from server/
npm run dev
```

```powershell
# Terminal 2 — from client/
npm run dev
```

Open <http://localhost:5173> in a browser. The backend health endpoint is <http://localhost:3001/api/health>.

For more detailed setup instructions in Arabic, see [دليل_تشغيل_المشروع.md](دليل_تشغيل_المشروع.md).
