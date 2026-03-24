#!/bin/bash
# ════════════════════════════════════════════════════════════════
# iConnect Developer Aliases
# ════════════════════════════════════════════════════════════════
# Add to your ~/.zshrc:
#   source ~/Desktop/WORK/iconnect_office_original/scripts/iconnect_aliases.sh
#
# Or copy-paste the aliases directly into ~/.zshrc
# ════════════════════════════════════════════════════════════════

ICONNECT_ROOT="$HOME/Desktop/WORK/iconnect_office_original"

# ── START: Read context before opening Claude Code ──────────────
alias iconnect-start='
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  iConnect — Session Start"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📋 LAST HANDOFF:"
  echo "────────────────"
  cat "$ICONNECT_ROOT/.agent/handoff.md" | head -40
  echo ""
  echo "🔄 MIGRATION STATUS:"
  echo "────────────────────"
  cd "$ICONNECT_ROOT" && supabase migration list 2>&1 | tail -10
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Ready. Open Claude Code now."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
'

# ── SLEEP: Prompt to update handoff before closing ──────────────
alias iconnect-sleep='
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  iConnect — Session End"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📝 FILES CHANGED THIS SESSION:"
  cd "$ICONNECT_ROOT" && git diff --stat HEAD 2>/dev/null || git status --short
  echo ""
  echo "⚠️  ACTION REQUIRED:"
  echo "Update .agent/handoff.md before closing."
  echo "Open it now: code $ICONNECT_ROOT/.agent/handoff.md"
  echo ""
  echo "Migration status:"
  supabase migration list 2>&1 | grep -v "^Using\|^Initial\|^Connect\|^A new\|^We rec" | tail -8
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
'

# ── SYNC: Generate types after schema changes ───────────────────
alias iconnect-types='
  cd "$ICONNECT_ROOT" &&
  echo "Generating TypeScript types from local schema..." &&
  supabase gen types typescript --local > frontend/src/lib/database.types.ts &&
  echo "✅ Types written to frontend/src/lib/database.types.ts"
'

# ── MIGRATE: Create a new migration ─────────────────────────────
alias iconnect-migration='
  echo "Enter migration description (snake_case, no spaces):"
  read migration_name
  cd "$ICONNECT_ROOT" &&
  supabase migration new "$migration_name" &&
  echo "✅ Migration created. Edit it, then run: iconnect-push"
'

# ── PUSH: Push pending migrations ───────────────────────────────
alias iconnect-push='
  cd "$ICONNECT_ROOT" &&
  echo "Pending migrations:" &&
  supabase migration list 2>&1 | grep "| $" | head -10 &&
  supabase db push
'

# ── STATUS: Quick project health check ──────────────────────────
alias iconnect-status='
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  iConnect — Project Status"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cd "$ICONNECT_ROOT"
  echo ""
  echo "📦 GIT STATUS:"
  git status --short
  echo ""
  echo "🗄️  MIGRATIONS:"
  supabase migration list 2>&1 | grep -v "^Using\|^Initial\|^Connect\|^A new\|^We rec"
  echo ""
  echo "📋 HANDOFF SUMMARY (last 10 lines):"
  tail -10 "$ICONNECT_ROOT/.agent/handoff.md"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
'

# ── JOURNAL: Open today's journal entry ─────────────────────────
alias iconnect-journal='
  JOURNAL_DIR="$ICONNECT_ROOT/.agent/journal"
  TODAY=$(date +%Y-%m-%d)
  JOURNAL_FILE="$JOURNAL_DIR/$TODAY.md"
  mkdir -p "$JOURNAL_DIR"
  if [ ! -f "$JOURNAL_FILE" ]; then
    echo "# iConnect Dev Journal — $TODAY\n\n## What I worked on\n\n## Decisions made\n\n## Problems encountered\n\n## Tomorrow\n" > "$JOURNAL_FILE"
  fi
  code "$JOURNAL_FILE"
'

echo "✅ iConnect aliases loaded."
echo "   iconnect-start  → Read context before coding"
echo "   iconnect-sleep  → Update handoff before closing"
echo "   iconnect-status → Quick project health check"
echo "   iconnect-types  → Generate TypeScript types"
echo "   iconnect-migration → Create new migration"
echo "   iconnect-push   → Push pending migrations"
echo "   iconnect-journal → Open today's dev journal"
