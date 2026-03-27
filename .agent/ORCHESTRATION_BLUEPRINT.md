# ╔════════════════════════════════════════════════════════════════════════════╗
# ║     iConnect — ORCHESTRATION & TOKEN OPTIMIZATION BLUEPRINT              ║
# ║                                                                          ║
# ║   The Operating System for Multi-Model Development                       ║
# ║                                                                          ║
# ║   Author: Claude Opus (Principal Architect)                              ║
# ║   Date: 2026-03-24                                                       ║
# ║   Status: Phase 2 — deploy AFTER Phase 1 execution prompt completes     ║
# ╚════════════════════════════════════════════════════════════════════════════╝


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1: THE MODEL ORG CHART
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Roles & Token Cost Reality

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOU (Product Manager)                         │
│  Owns the vision. Tests the app. Decides what ships.            │
│  Token cost: $0 (you're the human)                              │
└──────────────┬──────────────────────┬───────────────────────────┘
               │                      │
    ┌──────────▼──────────┐  ┌───────▼────────────────┐
    │   CLAUDE OPUS        │  │   GEMINI (Tech Lead)    │
    │   Principal Architect│  │   Sparring Partner      │
    │                      │  │                         │
    │   WHEN TO USE:       │  │   WHEN TO USE:          │
    │   • Architecture     │  │   • Brainstorming       │
    │     decisions        │  │   • Validating Opus     │
    │   • Writing          │  │     plans               │
    │     execution        │  │   • Poking holes in     │
    │     prompts          │  │     logic               │
    │   • Reviewing        │  │   • Formatting briefs   │
    │     Sonnet output    │  │   • Quick research      │
    │   • Weekly planning  │  │                         │
    │                      │  │   TOKEN COST: Separate   │
    │   TOKEN COST: HIGH   │  │   billing (Google)      │
    │   Use sparingly.     │  │   Use freely for        │
    │   1-2x per week.     │  │   brainstorming.        │
    └──────────┬───────────┘  └─────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────────┐
    │   CLAUDE SONNET (Senior Developer)                   │
    │                                                      │
    │   WHEN TO USE:                                       │
    │   • ALL code execution                               │
    │   • File creation, editing, debugging                │
    │   • Running migrations, builds, deploys              │
    │   • Following pre-written execution prompts          │
    │                                                      │
    │   TOKEN COST: MEDIUM                                 │
    │   This is your workhorse. 80% of tokens go here.     │
    │   Maximize by giving it TIGHT, PRE-WRITTEN prompts.  │
    └─────────────────────────────────────────────────────┘
```

## The Core Principle: Tokens Are Developer-Hours

Every token spent on a model scanning irrelevant files, re-reading context it
already had, or asking "should I proceed?" is a wasted developer-hour. The
entire system below is designed to eliminate waste.

The #1 token killer: **CONTEXT LOADING.**
Every time Sonnet opens a new session, it has to re-read CLAUDE.md,
architecture.md, handoff.md, and understand the codebase. That's 3,000-5,000
tokens burned before it writes a single line of code.

The fix: **pre-digested, scoped prompts** that tell Sonnet exactly which 3
files to read, what to do with them, and when to stop.


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2: THE FILE SYSTEM
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## .agent/ Directory Structure (Final)

```
.agent/
├── architecture.md              ← Living codebase map (Opus updates weekly)
├── handoff.md                   ← Session state (Sonnet updates every session)
├── next-actions.md              ← Prioritized task backlog (Opus writes, Sonnet reads)
├── MASTER_EXECUTION_PROMPT.md   ← Phase 1 execution (completed)
├── MASTER_BLUEPRINT_COMPLETE.md ← Full audit reference (read-only)
├── MASTER_AUDIT_AND_BLUEPRINT.md← First audit reference (read-only)
├── ORCHESTRATION_BLUEPRINT.md   ← This file
├── journal/
│   └── YYYY-MM-DD.md            ← Daily dev journal entries
└── session-logs/
    └── YYYY-MM-DD-summary.md    ← Auto-generated session summaries
```

## next-actions.md — The Backlog File

This is the MOST important file for token savings. It replaces the need for
Sonnet to "figure out what to do." Every task is pre-scoped.

### Format:

```markdown
# iConnect — Next Actions
# Updated: YYYY-MM-DD by [Opus/User]
# Sonnet: Pick the top READY task. Do it. Mark DONE. Update handoff.md.

## READY (pick one, execute it)

### [NA-001] Split supabase.js into modules
- Priority: HIGH
- Estimated tokens: ~15,000 (medium session)
- Files to read: frontend/src/lib/supabase.js
- Files to create: frontend/src/lib/supabase/client.js, auth.js, artifacts.js,
  contentState.js, notes.js, exam.js, activity.js, index.js
- Instructions: Split the 525-line supabase.js into domain modules. The index.js
  must re-export everything so existing imports don't break. Each module file
  should be 40-80 lines. Move functions by section (AUTH, ARTIFACTS, etc.).
- Verification: `npm run build` passes. All existing imports still work.
- Done criteria: All functions accessible via both old and new import paths.

### [NA-002] Add rate limiting to gemini-proxy
- Priority: HIGH
- Estimated tokens: ~8,000 (small session)
- Files to read: supabase/functions/gemini-proxy/index.ts
- Instructions: Add per-user rate limit. Track requests in a rate_limits table
  (create migration). Allow 50 requests/hour, 200/day per user. Return 429
  with Retry-After header when exceeded.
- Verification: Deploy function. Test with rapid requests. 51st request returns 429.

### [NA-003] Wire explainQuestion() into exam review
- Priority: MEDIUM
- Estimated tokens: ~6,000 (small session)
- Files to read: frontend/src/lib/aiService.js (explainQuestion function),
  frontend/src/components/ExamPage.jsx (results display section)
- Instructions: After exam results are shown, add "Explain This" button next
  to each wrong answer. On click, call explainQuestion(questionText, correctAnswer).
  Display AI explanation in expandable panel below the question.
- Verification: Take exam → get wrong answer → click Explain → AI explanation appears.

## BLOCKED (needs decision or dependency)

### [NA-010] Unify quiz systems (KahootPage vs arena)
- Blocked by: Product decision — do we keep both or merge?
- Decision needed from: User (PM)

## DONE (completed, keep for reference)

### [NA-000] Phase 1 execution — all 6 phases
- Completed: YYYY-MM-DD
- Summary: Created 6 tables, scoring system, route guards, performance fixes
```

### Rules for next-actions.md:
1. **Opus writes it.** Sonnet reads it. User approves priority order.
2. Each task has an estimated token count so you can budget your day.
3. Each task lists EXACTLY which files to read — Sonnet doesn't scan the project.
4. "READY" means all dependencies are met. Sonnet can start immediately.
5. "BLOCKED" means a decision or dependency is missing. Don't touch.
6. "DONE" items stay for 7 days as reference, then get archived.


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3: TOKEN BUDGET SYSTEM
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Understanding Your Limits

Claude Pro plan (as of March 2026):
- Opus: ~45 messages/5 hours (rate-limited, not daily capped)
- Sonnet: ~100 messages/5 hours (more generous)
- Both reset on rolling 5-hour windows

The goal: use every message wisely. Never waste an Opus message on something
Sonnet can do. Never waste a Sonnet message on context-loading that a better
prompt would have avoided.

## Token Cost Per Activity

| Activity | Model | Est. Tokens | Frequency |
|----------|-------|-------------|-----------|
| Weekly architecture review | Opus | 30,000 | 1x/week |
| Write next-actions.md | Opus | 15,000 | 1x/week |
| Review Sonnet's git diff | Opus | 10,000 | 2-3x/week |
| Execute 1 task from next-actions | Sonnet | 8,000-25,000 | 3-5x/day |
| Update handoff.md | Sonnet | 2,000 | End of each session |
| Quick fix / small bug | Sonnet | 3,000-5,000 | As needed |
| Brainstorm new feature | Gemini | Free (Google) | As needed |

## Daily Schedule Template

```
MORNING (fresh rate limit window):
┌─────────────────────────────────────────────────┐
│ 1. Run iconnect-start in terminal               │
│ 2. If Monday: Open Opus in Cowork               │
│    → Paste architecture.md + handoff.md          │
│    → Ask: "Review and update next-actions.md"    │
│    → Opus produces prioritized weekly backlog    │
│    (This uses ~2-3 Opus messages for the week)   │
│                                                  │
│ 3. Open Claude Code (Sonnet)                     │
│    → "Read .agent/next-actions.md. Execute the   │
│       top READY task. Follow all rules in        │
│       CLAUDE.md. Report when done."              │
│    (Sonnet works autonomously on 1 task)         │
└─────────────────────────────────────────────────┘

MIDDAY (continue execution):
┌─────────────────────────────────────────────────┐
│ 4. If Sonnet finished task 1:                    │
│    → "Mark NA-001 as DONE in next-actions.md.    │
│       Update handoff.md. Start NA-002."          │
│    (Chain tasks without re-reading context)       │
│                                                  │
│ 5. If Sonnet hit a problem:                      │
│    → Copy error + relevant code to Gemini        │
│    → Brainstorm fix (free tokens)                │
│    → Paste solution back to Sonnet               │
└─────────────────────────────────────────────────┘

EVENING (wrap up):
┌─────────────────────────────────────────────────┐
│ 6. Run iconnect-sleep in terminal               │
│ 7. If Sonnet changed significant code:           │
│    → Copy git diff to Opus (Cowork)              │
│    → "Review this diff against CLAUDE.md rules.  │
│       Flag any violations."                      │
│    (Uses 1 Opus message for quality gate)        │
│                                                  │
│ 8. Sonnet: "Update handoff.md with today's       │
│    changes and current state."                   │
└─────────────────────────────────────────────────┘
```

## Weekly Token Allocation

Assuming Claude Pro limits (adjust if on Team/Enterprise):

```
MONDAY:
  Opus: Architecture review + next-actions.md (3 messages)
  Sonnet: Execute 2-3 tasks from backlog

TUESDAY-THURSDAY:
  Opus: 0-1 messages (only if reviewing critical diff)
  Sonnet: Execute 2-4 tasks per day from backlog
  Gemini: Brainstorm as needed (unlimited)

FRIDAY:
  Opus: Review week's diffs + update architecture.md (2 messages)
  Sonnet: Execute remaining tasks + deploy
  Sonnet: Write journal entry

WEEKLY TOTALS:
  Opus: 5-8 messages total (architecture + reviews)
  Sonnet: 15-25 messages total (all execution)
  Gemini: Unlimited (brainstorming, validation)
```

## The Anti-Waste Rules

1. **NEVER open Opus to ask "what should I work on?"**
   That's what next-actions.md is for. Read the file. Pick the top task.

2. **NEVER let Sonnet scan the full project.**
   Every task in next-actions.md lists exact files to read. If Sonnet reads
   more than what's listed, the prompt is wrong — fix the prompt.

3. **NEVER re-explain the project to any model.**
   CLAUDE.md + architecture.md + handoff.md exist so you never have to.
   If a model asks "what is iConnect?", the session start protocol is broken.

4. **NEVER use Opus for code execution.**
   Opus writes plans. Sonnet writes code. Using Opus to write code is like
   paying a surgeon to stock shelves — technically possible, wildly inefficient.

5. **NEVER use Sonnet for architecture decisions.**
   Sonnet will happily make architecture decisions, but they'll be local
   optimizations that miss the big picture. Architecture is Opus's job.

6. **CHAIN tasks in a single Sonnet session.**
   Instead of: Session 1 → Task A → close → Session 2 → Task B
   Do: Session 1 → Task A → "now do Task B" → Task B → close
   Saves the context-loading cost of a new session (~3,000 tokens per session).

7. **Use Gemini for ALL brainstorming.**
   It's on a separate billing system. Exhaust Gemini's context for free before
   spending Claude tokens. Only bring findings to Opus/Sonnet when actionable.


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4: THE COWORK SKILLS (build later)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Skill 1: plan-session

```
Name: plan-session
Trigger: "plan session", "plan my day", "what should I work on"
Description: Reads handoff.md + next-actions.md + architecture.md, then
  produces a scoped execution prompt for Sonnet.

Input: None (reads files automatically)
Output: A copy-pasteable prompt block for Claude Code

Logic:
1. Read .agent/handoff.md → extract "Current State" and "Next Session Should Start With"
2. Read .agent/next-actions.md → find top 1-3 READY tasks
3. Read .agent/architecture.md → extract relevant module info for those tasks
4. Generate a scoped Sonnet prompt:
   - "Read these 3 files: [exact paths]"
   - "Execute this task: [exact instructions from next-actions]"
   - "Verification: [exact checklist]"
   - "When done: update handoff.md and mark task DONE in next-actions.md"
5. Save prompt to clipboard or display it

Token savings: ~5,000 tokens saved per Sonnet session by eliminating
  context-scanning and "figuring out what to do" phase.
```

## Skill 2: review-session

```
Name: review-session
Trigger: "review session", "review changes", "check my code"
Description: Takes the git diff from a completed Sonnet session, reads
  CLAUDE.md rules, and flags any violations.

Input: git diff (auto-captured or manual)
Output: Violation report with exact file:line references

Logic:
1. Run `git diff HEAD~1..HEAD` (or specified range)
2. Read CLAUDE.md (root) → extract all HARD RULES
3. Read frontend/CLAUDE.md → extract component rules
4. Read supabase/CLAUDE.md → extract migration rules
5. For each changed file, check:
   - [ ] No raw supabase.from() in components
   - [ ] No console.log with user data
   - [ ] No empty catch blocks
   - [ ] No arbitrary Tailwind values
   - [ ] No missing loading/error states on async ops
   - [ ] Migration has IF NOT EXISTS guards
   - [ ] Design tokens used (not inline colors)
6. Output: "PASS — no violations" or list of violations with fixes

Token savings: Catches Sonnet mistakes BEFORE they compound. One Opus
  review message now prevents 5 Sonnet debug messages later.
```

## Skill 3: generate-handoff

```
Name: generate-handoff
Trigger: "update handoff", "end session", "save progress"
Description: Auto-generates handoff.md from git status + recent changes.

Logic:
1. Run `git diff --stat HEAD` → list files changed
2. Run `git log --oneline -5` → recent commits
3. Read current handoff.md → preserve "Do NOT Touch" section
4. Generate new handoff.md:
   - What was worked on (from git diff)
   - Current state (from build status + test results)
   - Next step (from next-actions.md — next READY task)
   - Decisions made (from commit messages)
5. Write to .agent/handoff.md

Token savings: ~2,000 tokens saved by automating the end-of-session ritual.
  Ensures handoff is ALWAYS updated (Sonnet sometimes forgets).
```


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5: THE PROMPT TEMPLATES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Template 1: Monday Morning — Opus Weekly Review

Paste this to Opus (Cowork) every Monday:

```
ROLE: Principal Architect for iConnect.

Read these 3 files:
1. .agent/architecture.md
2. .agent/handoff.md
3. .agent/next-actions.md

Tasks:
1. Review architecture.md — does it reflect the current codebase? Update if not.
2. Review handoff.md — is the "Current State" accurate?
3. Review next-actions.md — reprioritize based on what was completed last week.
4. Add 3-5 new tasks to the READY section based on known technical debt
   and the roadmap in MASTER_BLUEPRINT_COMPLETE.md.
5. Each new task must have: priority, estimated tokens, files to read,
   exact instructions, verification criteria.
6. Remove any DONE tasks older than 7 days.
7. Write the updated next-actions.md.

Output: Updated next-actions.md file.
```

## Template 2: Daily — Sonnet Task Execution

Paste this to Claude Code (Sonnet) each morning:

```
Read .agent/CLAUDE.md (root rules), then .agent/next-actions.md.

Execute the top READY task. You have full permission for all technical
actions (create files, edit files, run commands, create migrations).

Rules:
- Read ONLY the files listed in the task
- Follow ALL constraints in CLAUDE.md
- No empty catch blocks, no swallowed errors, no missing loading states
- When done: mark task as DONE in next-actions.md, update handoff.md

Begin.
```

## Template 3: Evening — Opus Diff Review

Paste this to Opus (Cowork) when reviewing Sonnet's work:

```
ROLE: Principal Architect reviewing code changes.

The following git diff represents today's Sonnet session.
Review it against the iConnect CLAUDE.md rules:
- No raw supabase.from() in components
- No PII in console logs
- No empty catch blocks
- No arbitrary Tailwind values
- All async operations have loading + error states
- Migrations use IF NOT EXISTS guards
- Design tokens from tokens.js used

[PASTE GIT DIFF HERE]

Output: List of violations (if any) with exact file:line and fix.
If no violations: "PASS — clean session."
```

## Template 4: Gemini Brainstorm Session

Paste this to Gemini when designing a new feature:

```
CONTEXT: I'm building iConnect, a medical education SaaS for Indian doctors.
Stack: React 19 + Supabase + Tailwind + Zustand.

I want to design [FEATURE NAME].

Current architecture relevant to this:
[PASTE relevant section of architecture.md]

Requirements:
[YOUR REQUIREMENTS]

I need you to:
1. Identify edge cases I haven't considered
2. Suggest the optimal data model (tables, columns, relationships)
3. Flag any conflicts with existing architecture
4. Draft the data flow: UI → function → table → back to UI

Be critical. Poke holes. I'll take your output and hand it to my architect
(Opus) to write the execution plan for my developer (Sonnet).
```


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6: THE WEEKLY LOOP (VISUALIZED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
MONDAY
  ┌─────────────────────────────────────────────────────┐
  │ AM: Opus reviews architecture + writes next-actions │──→ 3 Opus msgs
  │ PM: Sonnet executes top 2-3 tasks                   │──→ 5 Sonnet msgs
  │ PM: You test results on live app                    │
  └─────────────────────────────────────────────────────┘

TUESDAY
  ┌─────────────────────────────────────────────────────┐
  │ AM: Sonnet picks next READY task, executes          │──→ 4 Sonnet msgs
  │ PM: Sonnet chains to next task                      │──→ 3 Sonnet msgs
  │ PM: You test. If issues → Gemini brainstorm (free)  │
  └─────────────────────────────────────────────────────┘

WEDNESDAY
  ┌─────────────────────────────────────────────────────┐
  │ AM: Sonnet continues execution                      │──→ 4 Sonnet msgs
  │ PM: If critical diff → Opus review (1 msg)          │──→ 0-1 Opus msg
  │ PM: You test + decide priorities for rest of week   │
  └─────────────────────────────────────────────────────┘

THURSDAY
  ┌─────────────────────────────────────────────────────┐
  │ AM: Sonnet executes                                 │──→ 4 Sonnet msgs
  │ PM: Sonnet executes                                 │──→ 3 Sonnet msgs
  │ PM: You test. Plan Friday deployment.               │
  └─────────────────────────────────────────────────────┘

FRIDAY
  ┌─────────────────────────────────────────────────────┐
  │ AM: Sonnet: final tasks + full build                │──→ 3 Sonnet msgs
  │ PM: Opus: review week's diffs + update arch.md      │──→ 2 Opus msgs
  │ PM: Sonnet: deploy to Vercel                        │──→ 1 Sonnet msg
  │ PM: Sonnet: write journal + update handoff           │──→ 1 Sonnet msg
  └─────────────────────────────────────────────────────┘

WEEKLY TOTALS:
  Opus:   5-7 messages  (Monday planning + Wednesday/Friday reviews)
  Sonnet: 25-30 messages (all execution across the week)
  Gemini: Unlimited      (brainstorming as needed)

  Tokens saved vs. unstructured approach: ~40-60%
  (No project scanning, no re-explaining, no "what should I do?")
```


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 7: SCALING RULES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## When Codebase Reaches 2x Current Size

- Split architecture.md into domain files:
  `.agent/architecture-frontend.md`, `.agent/architecture-db.md`,
  `.agent/architecture-ai.md`
- Each next-actions.md task must specify WHICH architecture file to read
- Sonnet reads only the relevant domain file, not the full architecture

## When Codebase Reaches 5x Current Size

- Split CLAUDE.md into more granular scopes:
  `frontend/components/CLAUDE.md`, `frontend/lib/CLAUDE.md`
- next-actions.md tasks should specify the scoped CLAUDE.md file
- Consider adding a `module-owners.md` mapping features to file paths
  so Sonnet can navigate without scanning

## When Codebase Reaches 10x Current Size

- next-actions.md becomes too large for one file. Split into:
  `next-actions-frontend.md`, `next-actions-backend.md`, `next-actions-infra.md`
- architecture.md becomes an index file pointing to domain architecture files
- Consider a `dependency-graph.md` showing which modules depend on which
- Each Sonnet session should touch at most 1 domain

## When Team Grows Beyond Solo Developer

- handoff.md becomes per-branch: `.agent/handoff-feature-exam-v2.md`
- next-actions.md gets assignee field: `Assigned: branch/feature-exam-v2`
- Add `.agent/decisions.md` — append-only log of architectural decisions
  so parallel workers don't contradict each other
- Opus reviews all PRs before merge (diff review template)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8: QUICK REFERENCE — THE PROMPTS CHEAT SHEET
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Copy-Paste Ready Prompts

### Start a Sonnet session (daily):
```
Read .agent/CLAUDE.md then .agent/next-actions.md.
Execute the top READY task. Full permissions granted.
When done: mark DONE, update handoff.md, start next task.
```

### Chain to next task (mid-session):
```
Good. Mark that DONE in next-actions.md. Now execute the next READY task.
Same rules apply.
```

### End a Sonnet session:
```
Update .agent/handoff.md with everything you changed today.
Run: cd frontend && npm run build — report if clean.
```

### Monday Opus review:
```
Read .agent/architecture.md, .agent/handoff.md, .agent/next-actions.md.
Update next-actions.md: reprioritize, add 3-5 new tasks with full specs
(files to read, instructions, verification, token estimate). Remove DONE
tasks older than 7 days.
```

### Opus diff review:
```
Review this diff against iConnect CLAUDE.md rules. Flag violations with
exact file:line and fix. If clean, say PASS.
[paste diff]
```

### Gemini brainstorm:
```
Context: iConnect, medical SaaS, React+Supabase.
I'm designing [feature]. Here's the relevant architecture:
[paste section]. Find edge cases, suggest data model, flag conflicts.
```


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# END OF ORCHESTRATION BLUEPRINT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
