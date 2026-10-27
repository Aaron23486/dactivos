# ADR 0004: Damaged returns go to maintenance; release needs a resolved case and a physical check

**Status:** Accepted · 2026-10-10 (recorded 2026-10-27)

## Context

A device that comes back damaged must not be handed out again by mistake, and a repair noted in a case does not prove the device is actually back on the shelf and working.

## Decision

- Every return records a physical inspection (`GOOD` or `DAMAGED`). A damaged return requires notes and, through a trigger, opens a maintenance case linked to that inspection and moves the asset to `MAINTENANCE`.
- Resolving the case (with notes) does **not** change the asset status.
- Releasing the asset requires a resolved case and a separate physical check confirmed by an operator with notes. The check is stored in `asset_release_validations` and consumed once in `asset_release_consumptions`, so one check cannot release the asset twice.
- Status transitions are limited by a trigger to those listed in rule R5.

## Alternatives considered

- **Release on resolution:** simpler, but it skips the moment someone confirms the device is physically there and working.
- **A free status selector:** the most flexible and the easiest way to lose track of a device.

## Consequences

- The dashboard shows "pending release" assets: resolved cases whose asset has not been checked yet.
- The business-rule integration test walks the whole path and checks that releasing before resolving is refused.
