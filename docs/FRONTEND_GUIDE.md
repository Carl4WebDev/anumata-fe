# Anumata Frontend Guide

## Overview

React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + React Router 7.

---

## Directory Structure

```
src/
├── app/                            # App shell, routing
│   ├── App.tsx                     # Route definitions
│   └── routes.tsx                  # Route config
│
├── feature/                        # Feature modules (organized by domain)
│   ├── auth/                       # Login, Register
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       └── RegisterPage.tsx
│   │
│   ├── dashboard/                  # Therapist dashboard
│   │   └── pages/
│   │       └── DashboardPage.tsx
│   │
│   ├── patients/                   # Patient management
│   │   ├── components/
│   │   └── pages/
│   │       └── PatientPage.tsx
│   │
│   ├── questionSets/               # Question set management
│   │   └── pages/
│   │       └── QuestionSetsPage.tsx
│   │
│   ├── interviewLinks/             # Interview link management
│   │   └── pages/
│   │       └── InterviewLinksPage.tsx
│   │
│   ├── interview/                  # Patient interview (recording)
│   │   └── pages/
│   │       ├── InterviewRoomPage.tsx   # Camera + mic recording
│   │       ├── ProcessingPage.tsx      # Upload + AI analysis
│   │       └── ResultsPage.tsx         # Immediate results view
│   │
│   ├── sessionReview/              # Therapist session review
│   │   ├── components/
│   │   │   ├── SessionOverviewCard.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── ModelSubCard.tsx
│   │   │   ├── FusionResultCard.tsx
│   │   │   ├── AgreementBar.tsx
│   │   │   ├── AiReportSection.tsx
│   │   │   ├── EvidenceSnapshot.tsx
│   │   │   ├── EmotionTimelineHeatmap.tsx
│   │   │   ├── SpikeContextPanel.tsx
│   │   │   └── PerQuestionNotes.tsx
│   │   ├── hooks/
│   │   │   ├── useSessionComputed.ts
│   │   │   └── usePerQuestionNotes.ts
│   │   └── pages/
│   │       └── SessionReviewPage.tsx
│   │
│   ├── context/                    # React contexts/providers
│   │   ├── auth/
│   │   │   └── AuthProvider.tsx
│   │   ├── patients/
│   │   │   └── PatientsProvider.tsx
│   │   ├── questionSets/
│   │   │   └── QuestionSetsProvider.tsx
│   │   ├── interviewLinks/
│   │   │   └── InterviewLinksProvider.tsx
│   │   └── sessions/
│   │       ├── SessionsContext.tsx
│   │       ├── SessionsProvider.tsx    # CRITICAL: Session → MappedSession mapping
│   │       └── useSessions.js
│   │
│   └── settings/                   # User settings
│       └── pages/
│           └── SettingsPage.tsx
│
└── shared/                         # Shared utilities
    ├── api/
    │   ├── httpClient.ts           # fetch wrapper with JWT injection
    │   ├── emotionApi.ts           # POST /api/emotion/... (multipart)
    │   ├── sessionsApi.ts          # CRUD /api/sessions
    │   ├── patientsApi.ts          # CRUD /api/patients
    │   ├── questionSetsApi.ts      # CRUD /api/question-sets
    │   ├── interviewLinksApi.ts    # CRUD /api/interview-links
    │   ├── authApi.ts              # POST /api/auth/...
    │   └── dashboardApi.ts         # GET /api/dashboard/...
    │
    ├── components/
    │   ├── EmotionTag.tsx           # Colored emotion badge
    │   ├── ConfidenceBadge.tsx      # Percentage badge with color
    │   ├── CollapsibleSection.tsx   # Expandable section
    │   └── LoadingSpinner.tsx
    │
    ├── types/
    │   └── session.ts              # Session, MappedSession, InterviewResponse types
    │
    └── utils/
        ├── emotionColors.ts        # Emotion → Tailwind color mapping
        ├── agreementCalculator.ts  # Modality agreement calculation
        ├── fusionExplanation.ts    # Human-readable fusion explanation
        └── fileStorage.ts          # IndexedDB storage for interview files
```

---

## Important Files

### InterviewRoomPage.tsx
**Purpose:** Records patient interview (camera + microphone).
**Data flow:** MediaRecorder → capturedAudioRef/capturedFramesRef → IndexedDB → ProcessingPage.

### ProcessingPage.tsx
**Purpose:** Uploads files and triggers AI analysis.
**Data flow:** IndexedDB → emotionApi.analyze() → sessionStorage → ResultsPage.

### SessionsProvider.tsx
**Purpose:** Fetches sessions and maps them from backend format to frontend format.
**Data flow:** GET /api/sessions/:id → mapSession() → MappedSession → SessionReviewPage.
**Critical:** This is where `Session` (snake_case) becomes `MappedSession` (camelCase).

### useSessionComputed.ts
**Purpose:** Derives display-ready data from MappedSession.
**Computes:** per-question QuestionData, agreement, risk reasons, overview stats.

### SessionReviewPage.tsx
**Purpose:** Therapist's main view for inspecting a completed session.
**Renders:** Overview, timeline, question cards, AI report, emotional events, notes.

---

## Data Flow Summary

```
Patient Interview
    ↓ InterviewRoomPage.tsx (records audio + frames)
    ↓ IndexedDB (fileStorage.ts)
    ↓ ProcessingPage.tsx (uploads to backend)
    ↓ emotionApi.analyze() → POST /api/emotion/token/:token/analyze
    ↓ Backend → Python AI → PostgreSQL
    ↓ sessionStorage (immediate results)
    ↓ ResultsPage.tsx (patient sees results)

Therapist Review
    ↓ SessionReviewPage.tsx
    ↓ SessionsProvider.tsx (fetches from backend)
    ↓ GET /api/sessions/:id
    ↓ mapSession() → MappedSession
    ↓ useSessionComputed.ts (derives display data)
    ↓ Renders: overview, questions, evidence, report, events
```

---

## API Layer

All API clients are in `src/shared/api/`. They use `httpClient.ts` which:
- Adds `Authorization: Bearer {token}` to all requests
- Throws `ApiError` on non-ok responses
- Returns `ApiResponse<T>` with `{ status, message, data, meta }`

### Key API calls:

| Client | Endpoint | Purpose |
|---|---|---|
| `emotionApi.analyze()` | POST /api/emotion/token/:token/analyze | Upload files for AI analysis |
| `sessionsApi.getById()` | GET /api/sessions/:id | Fetch session for review |
| `sessionsApi.getAll()` | GET /api/sessions/ | List all sessions |
| `sessionsApi.updateNotes()` | PATCH /api/sessions/:id/notes | Save therapist notes |
| `patientsApi.getAll()` | GET /api/patients/ | List patients |
| `interviewLinksApi.getByToken()` | GET /api/interview-links/token/:token | Get interview details |

---

## Type Definitions

All in `src/shared/types/session.ts`:

| Type | Purpose |
|---|---|
| `Emotion` | `'Angry' \| 'Happy' \| 'Neutral' \| 'Sad'` |
| `Session` | Raw backend data (snake_case) |
| `MappedSession` | Frontend-friendly data (camelCase) |
| `InterviewResponse` | Per-question result with FER/SER/LER |
| `EmotionalSpike` | Spike detection result |
| `EmotionalEvent` | Structured event report |

---

## Emotion Colors

Defined in `src/shared/utils/emotionColors.ts`:

| Emotion | Color | Tailwind |
|---|---|---|
| Happy | Green | bg-green-100, text-green-700 |
| Sad | Blue | bg-blue-100, text-blue-700 |
| Angry | Red | bg-red-100, text-red-700 |
| Neutral | Slate | bg-slate-100, text-slate-700 |
