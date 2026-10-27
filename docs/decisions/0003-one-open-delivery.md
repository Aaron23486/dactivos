# ADR 0003: One open delivery per asset and per employee and category

**Status:** Accepted · 2026-10-09 (recorded 2026-10-27)

## Context

Two operators can hand out the same handheld at the same moment, or give a second handheld to someone who already has one. A check in code ("is the asset available?") followed by an insert leaves a window in which both requests pass.

## Decision

- Two **partial unique indexes** on `asset_assignments`: one open delivery per asset (`WHERE returned_at IS NULL`), and one open delivery per employee and category.
- The delivery function locks the asset row (`SELECT … FOR UPDATE`) and requires `status = 'AVAILABLE'`; a trigger locks the employee (`FOR SHARE`) and requires it to be active.
- The asset status is changed by a trigger after the delivery is inserted, and a **deferred constraint trigger** checks at commit that the status matches the open delivery.
- Each delivery stores the asset's category at that moment, so the per-category rule does not depend on later edits.

## Alternatives considered

- **Application-level locking:** would not protect against a second app instance or a direct RPC call.
- **Serializable transactions everywhere:** more retries and errors for the operator, while the indexes already express the rule exactly.

## Consequences

- A losing concurrent request gets a constraint or availability error, which the app shows as "the operation conflicts with availability; refresh the screen", never as SQL.
- The concurrency integration test sends four simultaneous deliveries of one asset and checks that exactly one succeeds.
