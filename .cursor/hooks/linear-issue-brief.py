#!/usr/bin/env python3
"""Gate Linear save_issue: require a self-contained, understandable issue brief.

See .cursor/rules/linear-issue-descriptions.mdc
"""
from __future__ import annotations

import json
import re
import sys

REQUIRED = [
    (r"(?im)^#+\s*Probleem\b", "Probleem"),
    (r"(?im)^#+\s*Doel\b", "Doel"),
    (r"(?im)^#+\s*(Acceptance criteria|Acceptatie)\b", "Acceptance criteria"),
    (r"(?im)^#+\s*(Non-goals|Non.?goals|Buiten scope)\b", "Non-goals"),
]

MIN_CHARS = 800


def dig(obj: object, *paths: tuple[str, ...]) -> object | None:
    for path in paths:
        cur: object = obj
        ok = True
        for key in path:
            if not isinstance(cur, dict) or key not in cur:
                ok = False
                break
            cur = cur[key]
        if ok:
            return cur
    return None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        # Fail open on unreadable input
        print(json.dumps({"permission": "allow"}))
        return 0

    tool = dig(
        payload,
        ("toolName",),
        ("tool_name",),
        ("mcpToolName",),
        ("mcp_tool_name",),
        ("tool",),
        ("tool_info", "name"),
    )
    tool_s = str(tool or "")
    if tool_s and "save_issue" not in tool_s and "create_issue" not in tool_s:
        print(json.dumps({"permission": "allow"}))
        return 0

    description = dig(
        payload,
        ("toolInput", "description"),
        ("tool_input", "description"),
        ("arguments", "description"),
        ("input", "description"),
        ("params", "description"),
    )

    # Field-only updates (no description body) → allow
    if not isinstance(description, str) or not description.strip():
        print(json.dumps({"permission": "allow"}))
        return 0

    missing: list[str] = []
    for pattern, label in REQUIRED:
        if not re.search(pattern, description):
            missing.append(label)

    if len(description) < MIN_CHARS:
        missing.append(f"voldoende detail (min. ~{MIN_CHARS} tekens; nu {len(description)})")

    if not missing:
        print(json.dumps({"permission": "allow"}))
        return 0

    msg = (
        "Linear-issuebeschrijving is te summier of mist verplichte secties: "
        + ", ".join(missing)
        + ". Schrijf een self-contained brief (zie .cursor/rules/linear-issue-descriptions.mdc): "
        "Probleem, Doel, constraints, bouwstenen, aanpak/fases, Non-goals, "
        "Acceptance criteria, referenties."
    )
    print(
        json.dumps(
            {
                "permission": "deny",
                "agent_message": msg,
                "user_message": (
                    "Linear-issue geblokkeerd: beschrijving moet begrijpelijk en "
                    "volledig zijn (niet alleen een architectuurstub)."
                ),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
