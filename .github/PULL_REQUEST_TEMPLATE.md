<!--
Thanks for sending a PR! Please fill in the sections below.
A bot will check that CI passes; reviewers will check the rest.
-->

## Summary

<!-- 1-3 bullets describing what changed and why. Focus on the "why". -->

## Changes

<!--
List the user-visible or behaviour-visible changes. Skip purely
internal refactors unless they affect performance, security, or
reliability.
-->

## Test plan

- [ ] Unit tests added/updated for the changed code
- [ ] Manually verified the happy path
- [ ] Verified relevant edge cases
- [ ] No regressions in adjacent features

<!--
If this PR touches:
- auth or RLS policies: confirm session/permission behaviour is correct
- ShipStation or WooCommerce integration: confirm against a test account
- video upload or viewer flow: confirm signed-URL + token flow end-to-end
- database migration: confirm migration is idempotent and reversible
-->

## Risk & rollout

<!--
- Is this safe to roll out behind a flag, or all-at-once?
- Any data migration involved? If yes, has it been tested on a copy of prod?
- Anything reviewers should pay extra attention to?
-->

## Screenshots / recordings

<!-- For UI changes, include a before/after screenshot or short recording. -->

---

### Checklist

- [ ] `pnpm lint` passes (0 errors)
- [ ] `pnpm type-check` passes
- [ ] `pnpm test` passes
- [ ] `pnpm format` reports no issues
- [ ] No secrets, API keys, or `.env.local` committed
- [ ] Documentation updated if behaviour changed
