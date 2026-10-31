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
run "Command phrasings"    tests/intents.mjs "$PWD/index.html"
run "Phone: startup & sync" tests/e2e.mjs  "$PWD/index.html" "$TMP/worker.mjs" "$PWD/tests/fixtures/worker_old.mjs"
run "Phone: conversation"  tests/e2e2.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: second brain"  tests/e2e3.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: notes & offline" tests/e2e4.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: Google & calendar" tests/e2e5.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: projects"      tests/e2e6.mjs "$PWD/index.html" "$TMP/worker.mjs"
run "Phone: dashboard"     tests/e2e7.mjs "$PWD/index.html" "$TMP/worker.mjs"
echo; [ $fails -eq 0 ] && echo "ALL TESTS PASSED" || { echo "$fails test group(s) failed"; exit 1; }
