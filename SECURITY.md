# Security model

QA Copilot is designed for sensitive customer-support material.

- AI provider keys are server-side only.
- Browser code may contain only the Supabase publishable key.
- Evaluation and knowledge rows use per-user RLS.
- Raw screenshots/audio should be ephemeral by default; do not persist them unless an explicit retention policy is implemented.
- The app must not be used to bypass company access controls or to process customer data contrary to organisational policy.
- Production deployment should add CSP, rate limiting, audit logging, retention controls, dependency scanning, and security-advisor review.
