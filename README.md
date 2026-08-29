# CareerAI — AI-Powered Career Intelligence Platform

## Overview
CareerAI is an enterprise-grade, AI-driven career development and growth intelligence platform designed to guide professionals through personalized skill gap analysis, ATS resume optimization, intelligent job matching, interactive mock interviews, and automated career roadmaps.

## Key Features
- **Comprehensive Career Readiness Analysis**: Real-time evaluation of profile, skills, resume quality, and market alignment.
- **ATS Resume Parsing & Optimization**: PDF/Text resume extraction with keyword matching and ATS scoring.
- **AI Career Copilot & Assistant**: Context-aware AI chat assistant with multi-provider fallback and RAG grounding.
- **Intelligent Job Matching Engine**: Live job aggregation with semantic signal scoring and custom job description comparison.
- **Interactive AI Mock Interviews**: Dynamic role-based technical/behavioral interview practice with real-time feedback and scoring.
- **Personalized Learning Roadmaps**: Step-by-step skill building milestones tailored to target roles.
- **Growth & Career Analytics**: Empirical tracking of career momentum, skill coverage, and milestone progression.
- **Admin Security & Health Console**: Protected administration metrics, system diagnostics, and AI provider gateway telemetry.

## System Architecture
CareerAI is built on a hybrid architecture combining a high-performance single-page client (SPA) with serverless backend processing:
- **Frontend SPA**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons.
- **Backend API Gateway**: Node.js/Express serverless functions hosted on Vercel (`/api/*`) handles secure AI provider dispatch, RAG search/ingestion, and PDF resume processing.
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security policies, Supabase Auth with JWT verification).

## AI Features
- **Multi-Provider Resilient Gateway**: Seamless fallback routing across OpenRouter, Groq, Gemini, Mistral, SambaNova, Cerebras, Cohere, Cloudflare, HuggingFace, and OpenAI.
- **Context-Aware Recommendations**: AI services consume user context (profile, target role, verified skills, and resume text) server-side.
- **Strict Data Privacy**: Private AI provider credentials remain entirely server-side and are never exposed to client bundles.

## RAG Architecture
- **Semantic Vector Knowledge Base**: Built on Supabase pgvector for contextual knowledge retrieval.
- **Hybrid Search**: Combines keyword filtering with dense vector embeddings to enhance AI response accuracy.
- **Server-Only Ingestion**: Document ingestion is protected via `RAG_INGEST_KEY` authorization.

## Career Intelligence
- **Growth Momentum Scoring**: Real-time calculation of activity velocity, milestone completion, and readiness trends.
- **Stagnation Prevention**: Early warning detection for stalled learning progress with actionable weekly focus recommendations.
- **Explainable Insights**: Transparency into *Why Am I Seeing This* for all AI recommendations.

## Job Matching
- **Multi-Provider Live Aggregation**: Integrates live job feeds with fallback to deterministic matching.
- **Semantic Match Scoring**: Evaluates candidate experience, skill overlap, and target role alignment.
- **Tailored Resume Generator**: Generates targeted resume summary points tailored to specific job postings.

## Interview Preparation
- **Role-Based Question Generation**: Tailored technical, scenario-based, and behavioral questions.
- **Real-Time Evaluation Engine**: Instant feedback on answer quality, clarity, and technical accuracy.
- **Historical Session Tracking**: Progress tracking across multiple mock interview sessions.

## Career Analytics
- **Readiness Trends**: Empirical historical tracking of career readiness metrics.
- **Skill Coverage Breakdown**: Visual breakdown of matched, partial, and missing skills.
- **Milestone Timeline**: Verified timeline of completed career achievements.

## Admin Intelligence
- **Restricted Access**: Exclusive administrative access granted strictly to authorized admin credentials (`familystudio790@gmail.com`).
- **Telemetry & Metrics**: Real-time view of active users, parsed resumes, job matches, and system health status.
- **AI Gateway Health**: Live status, latency monitoring, and success rates across all AI providers.

## Security
- **Row Level Security (RLS)**: Strict database user isolation policies enforced at the PostgreSQL layer.
- **Protected Admin Authorization**: Server-side JWT and email validation on all `/api/admin/*` endpoints.
- **Secret Isolation**: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and other provider keys are isolated server-side.

## Environment Variables
The application uses clear separation between public frontend configuration and private server secrets:

### Frontend Safe Variables
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### Server-Only Secret Variables
```env
OPENAI_API_KEY=your_server_side_key_here
OPENROUTER_API_KEY=your_server_side_key_here
GROQ_API_KEY=your_server_side_key_here
SUPABASE_SERVICE_ROLE_KEY=your_server_side_service_role_key
RAG_INGEST_KEY=your_server_side_ingest_key
ADMIN_EMAIL=familystudio790@gmail.com
```

## Local Development
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` using `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Run validation checks:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```

## Production Deployment
1. **GitHub Repository**: Push verified codebase to `https://github.com/Sahilgupta9517/CareerAI_C2A.git`.
2. **Vercel Project**: Configure production build command (`npm run build`) and output directory (`dist`).
3. **SPA Rewrites**: `vercel.json` provides direct navigation rewrites for `/api/*` and client-side SPA routes.
4. **Environment Configuration**: Set production secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) in Vercel settings.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide Icons, Recharts.
- **Backend API**: Node.js, Express, Vercel Serverless Functions.
- **Database / Auth**: Supabase (PostgreSQL, Row Level Security, Auth).
- **Tooling**: Oxlint, TypeScript compiler, Vercel CLI.

## Project Structure
```
frontend/
├── api/                  # Vercel serverless entry points
│   └── [...path].ts
├── server/               # Backend API services, gateway & RAG logic
│   ├── services/         # AI, DB, RAG, Job, and Analytics services
│   └── resumeExtractPlugin.ts
├── src/                  # Frontend SPA source
│   ├── components/       # UI, layout, and common components
│   ├── lib/              # Frontend API & service clients
│   ├── pages/            # Page components (Dashboard, Analysis, Jobs, Admin, etc.)
│   └── types/            # TypeScript interface definitions
├── supabase/             # Database migrations & RAG schemas
├── vercel.json           # Vercel deployment configuration
├── vite.config.ts        # Vite build & proxy configuration
└── package.json
```
