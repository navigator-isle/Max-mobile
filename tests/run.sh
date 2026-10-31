#!/usr/bin/env bash
# Runs every Max test. Used by GitHub before Max's backend is deployed.
#   bash tests/run.sh
set -u
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"; export SHOT_DIR="$TMP"
cp worker.js "$TMP/worker.mjs"
fails=0
run(){ local name="$1"; shift; local out; out=$(node --no-warnings "$@" 2>&1); local code=$?
  echo "$out" | grep -E "^(PASS|FAIL)" ; local summary; summary=$(echo "$out" | grep -E "passed, [0-9]+ failed" | tail -1)
  if [ $code -ne 0 ] || [ -z "$summary" ]; then fails=$((fails+1)); echo "::error::$name failed: ${summary:-crashed}"; echo "$out" | grep -E "FAIL|Error" | head -5 | sed 's/^/::error::/'; else echo "::notice::$name — $summary"; fi; }
run "Worker basics"        tests/test-worker.mjs  "$TMP/worker.mjs"
run "Memory & conversations" tests/test-worker2.mjs "$TMP/worker.mjs"
run "Research & commands"  tests/test-worker3.mjs "$TMP/worker.mjs"
run "Notes & long answers" tests/test-worker4.mjs "$TMP/worker.mjs"
run "Brain choice"         tests/test-worker5.mjs "$TMP/worker.mjs"
run "Google sign-in & calendar" tests/test-worker6.mjs "$TMP/worker.mjs"
run "Projects & GitHub"    tests/test-worker7.mjs "$TMP/worker.mjs"
run "Visitors & sales"     tests/test-worker8.mjs "$TMP/worker.mjs"
run "Reading files"        tests/test-worker9.mjs "$TMP/worker.mjs"
run "Videos & links"       tests/test-worker10.mjs "$TMP/worker.mjs"
run "Gmail"                tests/test-worker11.mjs "$TMP/worker.mjs"
run "Calendar edits & email organizing" tests/test-worker12.mjs "$TMP/worker.mjs"
run "Markets"              tests/test-worker13.mjs "$TMP/worker.mjs"
run "Free backup brains"   tests/test-worker14.mjs "$TMP/worker.mjs"
run "Google Play"          tests/test-worker15.mjs "$TMP/worker.mjs"
run "Command phrasings"    tests/intents.mjs "$PWD/index.html"
run "Phone: startup & sync" tests/e2e.mjs  "$PWD/index.html" "$TMP/worker.mjs" "$PWD/tests/fixtures/worker_old.mjs"
run "Phone: conversation"  tests/e2e2.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: second brain"  tests/e2e3.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: notes & offline" tests/e2e4.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: Google & calendar" tests/e2e5.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: projects"      tests/e2e6.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: dashboard"     tests/e2e7.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: display & overview" tests/e2e8.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: attachments"  tests/e2e9.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: Office, video & links" tests/e2e10.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: crew & skills"  tests/e2e11.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: Gmail"         tests/e2e12.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: change & organize" tests/e2e13.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: markets"       tests/e2e14.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: routines, coaches, passage" tests/e2e15.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: Google Play"   tests/e2e16.mjs "$PWD/index.html" "$TMP/worker.mjs"
echo; [ $fails -eq 0 ] && echo "ALL TESTS PASSED" || { echo "$fails test group(s) failed"; exit 1; }
