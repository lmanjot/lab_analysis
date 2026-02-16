# Lab Analysis

AI-powered blood work analysis using Google Gemini. Upload HL7 lab data or PDF reports and receive structured clinical analysis with print-ready reports.

## Features

- **HL7 v2.x Parsing** — Paste raw HL7 messages (ORU^R01) for instant parsing and analysis
- **PDF Upload** — Upload lab report PDFs for Gemini to extract and analyze
- **AI-Powered Analysis** — Uses Google Gemini to identify patterns, flag abnormalities, and suggest follow-ups
- **Print-Ready Reports** — Clean A4-formatted reports with clinical panels, interpretation, and recommendations
- **Bilingual** — Full English and German (DE) support
- **Mara Status** — Compares values against ideal reference ranges (not just lab ranges)
- **No Backend Required** — Runs entirely in the browser; Gemini API called via user's OAuth token

## Prerequisites

1. **Google Cloud Project** with the [Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) enabled
2. **OAuth 2.0 Client ID** (Web application type) from [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
   - Add `http://localhost:5173` to Authorized JavaScript Origins (for development)
   - Add your production URL when deploying

## Setup

```bash
# Install dependencies
npm install

# Copy environment file and add your Google OAuth Client ID
cp .env.example .env
# Edit .env and set VITE_GOOGLE_CLIENT_ID

# Start development server
npm run dev
```

## How It Works

1. **Sign in** with your Google account (grants access to Gemini API)
2. **Input data** via one of two methods:
   - **HL7 tab**: Paste raw HL7 v2.x messages — the app parses MSH, PID, OBR, OBX, NTE segments instantly
   - **PDF tab**: Upload a lab report PDF
3. **Optional**: Add patient context (age, sex, weight, height, conditions)
4. **Analyze** — Gemini processes the data and returns a structured clinical report
5. **Print** — Click "Print Report" for a clean A4 layout

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- Google Identity Services (OAuth 2.0)
- Gemini API (generativelanguage.googleapis.com)
- react-i18next (EN/DE)

## HL7 Parser

The HL7 parser is ported from [analytica_parsing](../analytica_parsing/) and supports:

- MSH (Message Header)
- PID (Patient Identification)
- ORC (Common Order)
- OBR (Observation Request)
- OBX (Observation/Result) with mara_status
- NTE (Notes and Comments)
- Windows-1252/ANSI encoding for German characters
- Cortisol time-based reference range interpolation
- Ideal range comparison via reference table

## Scripts

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
```
