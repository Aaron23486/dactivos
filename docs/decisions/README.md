# Architecture decision records

Each significant decision has a short record with its context, the decision, the alternatives I considered and its consequences. Records 0001–0006 document decisions made while building the app and were written down afterwards; their status line shows both dates.

| ADR                                                    | Decision                                                                                     | Status   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------- |
| [0001](0001-technology-stack.md)                       | Next.js with Supabase                                                                        | Accepted |
| [0002](0002-authorization-in-the-database.md)          | Tables closed to app users; everything through role-checking functions                       | Accepted |
| [0003](0003-one-open-delivery.md)                      | One open delivery per asset and per employee and category                                    | Accepted |
| [0004](0004-maintenance-and-physical-release.md)       | Damaged returns go to maintenance; release needs a resolved case and a physical check        | Accepted |
| [0005](0005-audit-written-by-the-database.md)          | Audit rows written by the database in the same transaction                                   | Accepted |
| [0006](0006-invitations-through-an-edge-function.md)   | Invitations through an Edge Function; invited profiles start inactive                       | Accepted |
| [0007](0007-local-database-and-terminal-accounts.md)   | Local Supabase for development and CI; accounts from the terminal                           | Accepted |
| [0008](0008-demo-access.md)                            | Demo access with generated passwords and fictitious data                                     | Accepted |
| [0009](0009-content-security-policy.md)                | Content Security Policy without nonces                                                       | Accepted |
| [0010](0010-sign-in-throttling.md)                     | Sign-in throttling per client IP and per email                                               | Accepted |
| [0011](0011-supply-chain-in-ci.md)                     | Dependency audit, secret scanning and reviewed Dependabot updates                            | Accepted |
| [0012](0012-session-hardening.md)                     | Session hardening: `httpOnly` cookie, live-session role check, password creation only after an invitation | Accepted |
