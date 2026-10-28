# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.1.x   | Yes       |
| 1.0.x   | No        |

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately through GitHub: on this repository, go to **Security → Report a vulnerability**. Include what you found, how to reproduce it and the impact you expect.

I will acknowledge the report within a few days, keep you informed while I investigate, and credit you in the fix if you wish. Please give me reasonable time to release a fix before disclosing the issue.

## Scope

DACTIVOS is an internal application; the repository contains no production data or credentials. The security measures, known limitations and deployment recommendations are documented in [docs/security.md](docs/security.md). Demo accounts created by `npm run demo:setup` exist only on a local Supabase; the command refuses any other target.
