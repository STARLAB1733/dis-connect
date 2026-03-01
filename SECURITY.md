# Security Policy

## Scope

DISConnect is a multiplayer game application. The following are in scope for security reports:

- Authentication bypass (Firebase Anonymous Auth)
- Firestore rules bypass allowing unauthorised reads or writes to lobby/logs/scores data
- Client-side logic that allows a player to manipulate another player's score or game state
- Exposure of environment variables or Firebase credentials in client-side bundles

The following are **out of scope**:

- Denial-of-service against Vercel or Firebase (covered by their respective platforms)
- Social engineering or phishing
- Issues in third-party dependencies not directly exploitable in this application

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Report findings directly to the maintainers via GitHub private message or email. Include:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

We aim to respond within 5 business days and will credit reporters in the fix commit if desired.
