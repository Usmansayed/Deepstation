# FounderProof Backend (Demo Architecture)

This module implements a runnable backend surface for the `robust_problem_statement.md` feature set:

- Structured startup profiles
- EVS computation engine (weighted scoring)
- 14-day heartbeat + Ghost Detection logic
- Stakeholder-only view guard
- AI agents:
  - Due diligence copilot
  - Comparison engine
  - Momentum detector
  - Thesis matching
- Automated founder digest + transparency alerts

## API Endpoints

- `GET /api/health`
- `GET /api/startups`
- `GET /api/startups/:slug`
- `POST /api/startups/:slug/follow`
- `POST /api/startups/:slug/upvote`
- `GET /api/startups/:slug/comments`
- `POST /api/startups/:slug/comments`
- `POST /api/startups/:slug/heartbeat`
- `GET /api/startups/:slug/evs-breakdown`
- `GET /api/startups/:slug/ghost-status`
- `GET /api/startups/:slug/stakeholder-view` (`x-role: investor` required)
- `POST /api/agents/due-diligence`
- `POST /api/agents/comparison`
- `GET /api/agents/momentum`
- `POST /api/agents/thesis-match`
- `POST /api/matching/investor-recommendations`
- `GET /api/notifications/founder-digest/:slug`
- `GET /api/notifications/transparency-alerts`
- `POST /api/notifications/portfolio-digest`
- `GET /api/research/sector-report?sector=FinTech`
- `POST /api/integrations/metrics-sync`
- `POST /api/compliance/kyc`
- `GET /api/compliance/kyc/:userId`
- `POST /api/funding/intents`
- `GET /api/funding/intents/:id`
- `POST /api/funding/intents/:id/sign-safe`
- `POST /api/funding/intents/:id/record`

## Notes

- Data is in-memory (`src/backend/store.ts`) and seeded from frontend mock data.
- This is demo-ready architecture; production should add:
  - PostgreSQL persistence
  - OAuth integration services (Stripe/GitHub/GA/etc.)
  - background jobs/schedulers for weekly digests
  - auth + RBAC + audit logs
