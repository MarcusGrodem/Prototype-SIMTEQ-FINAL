# isae-dashboard-mvp

A lightweight frontend prototype that demonstrates the core idea of an ISAE 3402 compliance dashboard.

## Purpose

This project is a minimal executive-facing demo inspired by the existing prototype in this repository. It keeps only the essential concepts needed to explain the workflow between:

- Risks
- Controls
- Evidence

The prototype is intentionally simplified so it can be used in demos, discovery sessions, or early product conversations.

## Features

- **Dashboard** with key compliance metrics and a short action list
- **Risks** page with severity, likelihood, and responsible owner
- **Controls** page with status tracking and a mock "mark as completed" action
- **Evidence** page with linked documents, upload mock, and missing/uploaded status
- Mock data only — no backend or persistence
- Clean SaaS-style layout with simple status colors:
  - Green = done
  - Yellow = pending
  - Red = missing / overdue

## Project structure

```text
isae-dashboard-mvp/
├── README.md
├── package.json
├── index.html
├── vite.config.js
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    ├── components/
    ├── pages/
    └── data/
```

## Getting started

```bash
npm install
npm run dev
```

## Limitations

This MVP does **not** include:

- Approval workflows
- Audit logs
- Complex permissions
- Reporting engine
- Calendar or scheduler features
- Integrations
- Advanced filtering
- Real file uploads
- Real backend storage

All data is mocked in the frontend and resets on refresh.
