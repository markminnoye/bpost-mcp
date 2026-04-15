# Main release sync — squash merge `develop` -> `main`

## Status: Complete

## Goal

Finalize the current release-track work by squash-merging `develop` into `main`, push both branches, and keep branch history aligned for next cycles.

## Completed checklist

- [x] Fetch and verify divergence between `origin/main` and `origin/develop`
- [x] Run `git merge --squash develop` on `main`
- [x] Commit single squash release commit on `main` and push to `origin/main`
- [x] Merge `main` back into `develop` to keep branches aligned
- [x] Push updated `develop`

## Notes

- Main received squash commit `850e5f0` with the full metadata-compatibility payload.
- Develop was synced afterwards to avoid repeated diffs in future merges.
