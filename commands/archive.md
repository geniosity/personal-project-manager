---
description: Archive the current conversation as a history/memory file under docs/conversations/ (no next-agent handoff prompt)
argument-hint:
  [optional: short note describing this session, e.g. "Phase 7 AI refinement design discussion"]
---

You are archiving the current conversation as a standalone history file. Unlike `/handoff`, this is **not** intended to brief a next agent — it is a memory/history artifact the user will keep so they (and future agents, if they choose to read it) can look back at what was discussed before moving on to a new feature.

The user's optional note for this archive: $ARGUMENTS

---

## Step 1 — Get a timestamp

Run this in PowerShell and capture the output:

```powershell
Get-Date -Format "yyyyMMddHHmmss"
```

Use the captured value (e.g. `20260517163205`) as `{TS}` in the filename below. If the `docs/conversations/` directory doesn't exist, create it.

---

## Step 2 — Write the conversation archive

**Path:** `docs/conversations/conversation-archive-{TS}.md`

This is archive material. Anyone reading it later — the user, or a future agent the user chooses to point at it — should be able to reconstruct what happened in this session **without reading the original transcript**. Bias toward completeness, not brevity. Use this structure:

```markdown
# Conversation Archive — {TS-readable, e.g. 2026-05-17 16:32:05}

**Session note:** $ARGUMENTS (omit this line if no argument was passed)
**Model:** <model name from environment>
**Branch:** <output of `git rev-parse --abbrev-ref HEAD`>
**Latest commit at start of session:** <output of `git log -1 --oneline`>
**Latest commit at end of session:** <output of `git log -1 --oneline` now — same as above if no commits were made>

## TL;DR

One short paragraph (3–5 sentences) capturing the gist of the session: what was being worked on, what was decided or built, and how the session ended. This is the first thing anyone reads — make it the elevator pitch.

## What the user asked for

- Numbered, paraphrased list of every distinct user request in the session, in order. Include quoted phrases where the exact wording matters.

## What was discussed / explored

- Topics that came up, even if no code was written. Design tradeoffs weighed, options compared, things ruled out and why.
- Files read (with paths) and what was learned from each.
- Library/version lookups via context7 or WebFetch — the question and the answer.
- Surprises or corrections that came up during the session.

## Decisions made

- Each non-trivial decision, with reasoning.
- Cross-reference any ADR created or updated by path.
- Distinguish "decided autonomously" from "decided after user input".
- Include decisions that were considered and rejected, with the reason — these matter for future retrospection.

## Files created

- Full path → one-sentence description for each. Omit this section if no files were created.

## Files modified

- Full path → what changed and why. Omit this section if no files were modified.

## Commands run

- Notable commands executed (especially anything that touched the filesystem, git, package manager, or external services) with their outcome. Skip trivial reads.

## Loose ends / open questions

- Things the user hasn't answered yet — link to `docs/decisions/0006-deferred-questions.md` if relevant.
- Tasks paused mid-flight.
- Anything worth flagging for retrospection that isn't already captured in the codebase or an ADR.

## User preferences observed this session

- Anything the user said about how they like to work (terseness, document formats, autonomy level, etc.) that's worth remembering. Skip if nothing notable came up.

## Quotable moments

- 1–3 direct quotes from the user that capture intent, preferences, or framing worth preserving verbatim. Skip the section if nothing stands out.
```

---

## Step 3 — Report back to the user

Once the file is written, output (and only output):

1. The file path as a markdown link: `[conversation-archive-{TS}.md](docs/conversations/conversation-archive-{TS}.md)`
2. A single sentence describing what was captured (the TL;DR in a sentence).

Keep the final report to 2 lines. The artifact is the deliverable; the chat reply is just a pointer.
