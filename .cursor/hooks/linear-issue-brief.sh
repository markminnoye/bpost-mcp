#!/usr/bin/env bash
# Wrapper so hooks.json can call a stable path; logic lives in the .py sibling.
exec "$(dirname "$0")/linear-issue-brief.py" "$@"
