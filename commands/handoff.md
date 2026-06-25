---
description: Save a detailed conversation summary and create a handoff prompt for the next agent session
argument-hint: [optional: short note about this session, e.g. "merged website + font bundling"]
---

You are wrapping up this session on **Genie's Wishlists** (offline-first Flutter wishlist & gift-planning app). Produce two artifacts so the next agent — a fresh session with no memory of this conversation — can pick up cleanly.

The user's optional note for this handoff: $ARGUMENTS

The two sibling commands `/archive` (history-only) and `/handoff` (history + next-agent prompt) share the same conversation-history format; this command adds the handoff prompt. Don't duplicate work if `/archive` already ran this session — reuse its history file and just add the handoff prompt.

---

## Step 1 — Get a timestamp

Run this in PowerShell and capture the output:

```powershell
Get-Date -Format "yyyyMMddHHmmss"
```

Use the captured value (e.g. `20260622143205`) as `{TS}` in both filenames below. Also capture, for the headers:

```powershell
git rev-parse --abbrev-ref HEAD; git log -1 --oneline; git status --short
```

(`docs/conversations/` already exists; create it only if somehow missing.)

---

## Step 2 — Write the conversation history

**Path:** `docs/conversations/conversation-history-{TS}.md`

Archive material. A future agent should be able to reconstruct this session **without the original transcript**. Bias toward completeness, not brevity. Use this structure:

```markdown
# Conversation History — {TS-readable, e.g. 2026-06-22 14:32:05}

**Session note:** $ARGUMENTS (omit this line if no argument was passed)
**Model:** <model name from environment>
**Branch:** <git rev-parse --abbrev-ref HEAD>
**Latest commit at start of session:** <the HEAD commit when the session began>
**Latest commit at end of session:** <git log -1 --oneline now>
**Baseline:** `flutter analyze` <clean? / N issues> · `flutter test` <X/Y passing> (state both at start and end if they changed)

## What the user asked for

- Numbered, paraphrased list of every distinct user request, in order. Quote phrasing where the exact wording matters.

## What was investigated / learned

- Files read (with paths) and what each told you.
- Library/version lookups via `ctx7` or WebFetch — the question and the answer.
- Project state discovered (existing patterns, current schema version, what a provider/service actually does).
- Surprises or corrections — especially anything that contradicted CLAUDE.md, a memory file, or a prior handoff (these are the highest-value notes).

## Decisions made

- Each non-trivial decision, with reasoning. Distinguish "decided autonomously" from "decided after user input". Include options considered and rejected, with why.

## Files created

- Full path → one-sentence description. Omit the section if none.

## Files modified

- Full path → what changed and why. Omit the section if none.

## Commands run

- Notable commands that touched the filesystem, git, package manager, or build_runner, with outcome (especially the commit SHAs you created). Skip trivial reads.

## Loose ends / open questions

- Tasks paused mid-flight; things the user hasn't answered; anything the next agent needs that isn't yet captured in code, `docs/memory/`, or a plan/spec.
- Minor findings deliberately left unfixed (and where they're logged).

## User preferences observed this session

- Anything the user said (or revealed) about how they like to work that should carry forward.
```

---

## Step 3 — Write the handoff prompt for the next agent

**Path:** `docs/conversations/handoff-prompt-{TS}.md`

This file **is** the prompt the user pastes into a fresh session. Write it in second person to that future agent; assume zero context. Use the template below. **Keep the "Standing context", "Hard constraints", and "How to work" sections close to verbatim** — they change rarely and exist so the next agent doesn't re-derive them. Fill every `[bracket]` with this session's specifics; delete a line only if you're certain it no longer holds.

```markdown
# Handoff — {TS-readable}

You are continuing work on **Genie's Wishlists**, an offline-first Flutter wishlist & gift-planning app (no cloud, no accounts, all data on-device; Riverpod + Drift + GoRouter; "Glassmorphic-Light" theme over a global pastel-bokeh background). The previous session ended at {TS-readable}. Before doing anything, read the files in **Required reading**.

## Project context (one paragraph)

Genie's Wishlists lets one person plan thoughtful gifts entirely on-device: wish lists & items, the people they gift for, important dates with optional local reminders, clothing sizes, instant search, share-as-text, and export/import — no account, no servers, no analytics. It is being prepared for a Google Play launch (Android first; iOS later; Windows/web/desktop were dropped). [One sentence on the current major thrust, e.g. "the current focus is the remaining Play go-live checklist."]

## Where the project is right now

- **Current focus / phase:** [what's being worked on] — see `docs/PHASES.md` and `docs/memory/`.
- **Last completed work:** [task/feature + where its plan/spec lives, if any].
- **In flight:** [description, or "nothing in flight"].
- **Repo state:** on `[branch]` at `[commit]`, [clean / uncommitted changes: …]. [Any retained feature branches.] **Local-only repo — nothing has been pushed.**
- **Baseline:** `flutter analyze` [clean], `flutter test` [X/Y passing].

## Required reading (read in this order, do not skip)

1. `CLAUDE.md` — project conventions, architecture rules, hard constraints.
2. `docs/PRD.md` — product spec: scope, screens, schema, the source of truth for what the app does.
3. `docs/memory/README.md` then every `docs/memory/phase-*.md` — decisions, patterns, gotchas, known issues from each phase.
4. [The current feature's spec/plan, if one is in flight — e.g. `docs/superpowers/specs/…` and `docs/superpowers/plans/…`.]
5. `docs/conversations/conversation-history-{TS}.md` — full detail of what just happened.

## Hard constraints (do NOT re-litigate — each cost a prior session real time)

- **Riverpod codegen can't return Drift types.** Providers exposing Drift rows (`WishList`, `Person`, …) MUST be hand-written/manual; use `@riverpod` codegen ONLY for non-Drift return types (`database_provider`, `theme_mode_notifier`). `riverpod_generator` won't-fix (#4323/#4370). A V2 domain-model layer would lift this.
- **Don't bump `drift`/`drift_dev` past `^2.31.0`.** `drift_dev ≥2.32` needs analyzer 10, which breaks `riverpod_generator`/`riverpod_lint` (analyzer 9), and Flutter's `meta` caps analyzer `<10.0.2`. No combo solves this on the current SDK. `sqlite3_flutter_libs` stays (EOL but functional). M1/M5 are deferred until the ecosystem moves — see the long note in `pubspec.yaml`.
- **Never `ref.watch` inside `routerProvider`** — it rebuilds GoRouter and resets nav state. Drive redirects via `refreshListenable` (bridge the provider to a `ValueNotifier` with `ref.listen`, read with `ref.read` in `redirect`).
- **The app is LIGHT-MODE LOCKED on the Glassmorphic-Light theme.** Accent is **vivid blue `#007AFF`** read through `kPrimary` (never hard-code teal/blue at call sites). Glass radius is **28** for cards/sheets/nav (supersedes the old crisp 4/3/4). Design tokens live in `lib/core/theme/glass_tokens.dart`; the bokeh wash is `GlassAppBackground`. `darkTheme` is kept compiling but intentionally unreachable — don't "fix" it on. Every glass surface must honour `ReduceTransparency.of(context)`.
- **The Outfit font is BUNDLED** (`assets/google_fonts/*.ttf`, declared under `flutter: assets:` NOT `fonts:`, with `GoogleFonts.config.allowRuntimeFetching = false` in `main.dart`). Never reintroduce a runtime CDN fetch — it would break the "nothing leaves your device" guarantee.
- **Privacy framing is V1-scoped.** V1 is on-device only (nothing collected/shared/stored off-device); a future opt-in **V2 Pro** will add cloud sync + sharing. Don't write absolute "never leaves your device" claims or POPIA-specific legal copy — scope to "this version" and generalize to plain PII.
- **For Google Play:** no `USE_EXACT_ALARM` / `SCHEDULE_EXACT_ALARM` (restricted; reminders use `AndroidScheduleMode.inexactAllowWhileIdle`). Data Safety = "no data collected / no data shared". Target API 36 before **31 Aug 2026**.

## What was done in the previous session

[Bullet list — the highlights from the conversation history. Be specific about files touched, commits made, and decisions. Don't make the next agent re-read the history just to get the gist.]

## Suggested next steps

[The next 1–3 things to do, in order. Reference `docs/PHASES.md` / `docs/memory/` / an in-flight plan where relevant. Surface any decision that's now blocking.]

## How to work in this project

- **Autonomy:** the user is action-oriented and prefers momentum — make the call and document it (in the commit message / conversation history) rather than pausing for small confirmations.
- **When to pause:** only for outward-facing or scope decisions — anything that breaks the offline / no-data-leaves-device guarantee, adds a dependency, changes scope beyond an approved plan, or **pushes/merges**. The user confirms merges; the repo is **local-only — never push** unless explicitly told to.
- **Verify before claiming done:** `flutter analyze` must be clean and `flutter test` green before you say something works; show the numbers. Run `dart run build_runner build` after changing annotated files (Drift tables/DAOs, `@riverpod`). Don't silently re-baseline a failing test — surface it.
- **Commits:** only when the user asks; focused, one logical unit each; end the message with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Merges to `main` are local fast-forwards; feature branches are retained, not deleted. Use the **PowerShell tool** for multi-line commit messages (Git Bash leaks here-string delimiters into the message).
- **Visual / comparison work:** deliver options the user can eyeball as a standalone `.html` file (Markdown stays for source-of-truth docs). The user QAs on the **Android emulator/device** — offer to build a test version for real-hardware checks. HTML/CSS/glass work → the `modern-web-guidance` skill is mandatory first.
- **Library versions:** re-verify via `ctx7` (`npx ctx7@latest`) before scaffolding/upgrading — run it through **PowerShell** on Windows (Git Bash mangles the `/org/project` library ID).
- **Decisions are recorded** in `docs/memory/phase-*.md`, in this `docs/conversations/` history, and inline where it matters (e.g. the `pubspec.yaml` drift note). There is **no `docs/decisions/` ADR folder** — don't look for one.
- **At the end of your session:** run `/handoff` with a short note describing what you accomplished.

## Open questions to be aware of

[Items the user hasn't resolved that are likely to surface next session, or "none specific to the next session". Include any standing deferrals — e.g. Play go-live items, hosting, a pending human visual review.]
```

---

## Step 4 — Report back to the user

Once both files are written, output (and only output):

1. The two paths as markdown links: `[conversation-history-{TS}.md](docs/conversations/conversation-history-{TS}.md)` and `[handoff-prompt-{TS}.md](docs/conversations/handoff-prompt-{TS}.md)`
2. One sentence describing what was captured.
3. The one-line instruction for the next session: _"Open a fresh Claude session in this repo and start with: `Read docs/conversations/handoff-prompt-{TS}.md and follow its instructions.`"_

Keep the final report under 5 lines. The artifacts are the deliverable; the chat reply is just a pointer.
