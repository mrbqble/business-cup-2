#!/usr/bin/env bash
# Smoke-checks a deployment: / and /api/health respond, and /api/health reports the expected commit.
#
#   scripts/smoke.sh <base-url> [expected-sha]
#
# Each check gets 3 attempts, 5 s apart. Redirects are not followed, so a deployment hidden
# behind a login page fails instead of passing. Set VERCEL_PROTECTION_BYPASS to smoke a
# protected preview deployment.
set -uo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: $0 <base-url> [expected-sha]" >&2
  exit 2
fi

BASE_URL="${1%/}"
EXPECTED_SHA="${2:-}"
ATTEMPTS=3
DELAY_SECONDS=5
failures=0

curl_args=(--silent --show-error --max-time 15)
if [[ -n "${VERCEL_PROTECTION_BYPASS:-}" ]]; then
  curl_args+=(--header "x-vercel-protection-bypass: ${VERCEL_PROTECTION_BYPASS}")
fi

# Sets STATUS and BODY for a GET of the given path.
get() {
  local response
  response=$(curl "${curl_args[@]}" --write-out '\n%{http_code}' "${BASE_URL}$1" 2>&1)
  STATUS="${response##*$'\n'}"
  BODY="${response%$'\n'*}"
}

json_field() {
  node -e 'try { const v = JSON.parse(process.argv[1])[process.argv[2]]; console.log(v === undefined ? "" : String(v)); } catch { console.log(""); }' "$BODY" "$1"
}

check_home() {
  get "/"
  [[ "$STATUS" == "200" ]] && echo "200" && return 0
  echo "status $STATUS"
  return 1
}

check_health() {
  get "/api/health"
  local ok
  ok=$(json_field ok)
  [[ "$STATUS" == "200" && "$ok" == "true" ]] && echo "200, ok=true" && return 0
  echo "status $STATUS, ok=${ok:-?}"
  return 1
}

check_commit() {
  get "/api/health"
  local commit
  commit=$(json_field commit)
  [[ "$commit" == "$EXPECTED_SHA" ]] && echo "commit $commit" && return 0
  echo "commit ${commit:-?}, expected $EXPECTED_SHA"
  return 1
}

# run <label> <check-function>
run() {
  local label="$1" check="$2" detail="" attempt
  for ((attempt = 1; attempt <= ATTEMPTS; attempt++)); do
    if detail=$("$check"); then
      echo "PASS  $label: $detail"
      return
    fi
    ((attempt < ATTEMPTS)) && sleep "$DELAY_SECONDS"
  done
  echo "FAIL  $label: $detail (after $ATTEMPTS attempts)"
  failures=$((failures + 1))
}

run "GET /" check_home
run "GET /api/health" check_health
if [[ -n "$EXPECTED_SHA" ]]; then
  run "deployed commit" check_commit
fi

if ((failures > 0)); then
  echo "smoke: $failures check(s) failed against $BASE_URL"
  exit 1
fi
echo "smoke: all checks passed against $BASE_URL"
