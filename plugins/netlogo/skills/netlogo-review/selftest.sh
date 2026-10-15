#!/usr/bin/env bash
# ABOUTME: Regression test for nlcheck.sh — asserts it catches real bugs and stays quiet otherwise.
# ABOUTME: Run after any edit to nlcheck.sh. Builds fixtures by mutating a real demo.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
NLCHECK="$HERE/nlcheck.sh"
REPO="${REPO:-$NETLOGO_LLM_EXT}"
FIX="$HERE/.selftest"
BASE="$REPO/demos/color-sharing/color-sharing.nlogox"

PASS=0; FAIL=0
ok(){ printf "  ✓ %s\n" "$1"; PASS=$((PASS+1)); }
no(){ printf "  ✗ %s\n" "$1"; FAIL=$((FAIL+1)); }

[ -f "$BASE" ] || { echo "selftest: base model not found: $BASE" >&2; exit 1; }
rm -rf "$FIX"; mkdir -p "$FIX/m"
cp "$BASE" "$FIX/m/model.nlogox"
cp "$REPO/demos/color-sharing/config.txt" "$FIX/m/config.txt" 2>/dev/null

# Helper: does output contain a pattern?
has(){ printf '%s' "$1" | grep -qiE "$2"; }

echo "── Layer 1: compile gate (blocking)"

# 1. clean model compiles, exit 0
out="$($NLCHECK "$FIX/m/model.nlogox" 2>&1)"; rc=$?
[ $rc -eq 0 ] && ok "clean model exits 0" || no "clean model should exit 0, got $rc"
has "$out" 'compiles' && ok "reports 'compiles'" || no "missing 'compiles'"

# 2-5. four mutation classes must each be caught, and must exit 1
i=0
for mut in \
  's/^to setup/to setup\n  frobnicate 5/|fake NetLogo primitive' \
  's/^to setup/to setup\n  llm:not-a-thing "x"/|fake llm primitive' \
  's/^  clear-all/  clear-all 1 2 3/|wrong arity' \
  's/^to setup/to setup\n  never-defined-proc/|undefined procedure' ; do
  i=$((i+1))
  expr="${mut%%|*}"; label="${mut##*|}"
  mkdir -p "$FIX/b$i"; cp "$FIX/m/model.nlogox" "$FIX/b$i/model.nlogox"
  cp "$FIX/m/config.txt" "$FIX/b$i/" 2>/dev/null
  sed -i '' "$expr" "$FIX/b$i/model.nlogox"
  out="$($NLCHECK "$FIX/b$i/model.nlogox" 2>&1)"; rc=$?
  if [ $rc -eq 1 ] && has "$out" 'COMPILE FAILED'; then ok "catches $label"
  else no "missed $label (rc=$rc)"; fi
done

echo "── Layer 0: config path resolution (the issue #66 class)"

# 6. broken relative config path IS flagged
mkdir -p "$FIX/cfgbad"; cp "$FIX/m/model.nlogox" "$FIX/cfgbad/model.nlogox"
sed -i '' 's|llm:load-config "config.txt"|llm:load-config "demos/config"|' "$FIX/cfgbad/model.nlogox"
out="$($NLCHECK --no-compile "$FIX/cfgbad/model.nlogox" 2>&1)"
has "$out" 'config not found' && ok "flags unresolvable config path" || no "MISSED unresolvable config path"

# 7. and it must do so even when run FROM a dir where the path would resolve
mkdir -p "$FIX/cfgbad/demos"; : > "$FIX/cfgbad/demos/config"
out="$(cd "$FIX/cfgbad" && $NLCHECK --no-compile "$FIX/cfgbad/model.nlogox" 2>&1)"
has "$out" 'config not found' && no "CWD leak: resolved against shell cwd, not model dir" || ok "resolves against model dir, not CWD"
rm -rf "$FIX/cfgbad/demos"

# 8. valid config path NOT flagged
out="$($NLCHECK --no-compile "$FIX/m/model.nlogox" 2>&1)"
has "$out" 'config not found' && no "false positive on valid config path" || ok "quiet on valid config path"

echo "── Layer 0: dead widget detection (no ? / hyphen false positives)"

# 9. genuinely dead widget var IS flagged
has "$out" "widget variable 'prompt'" && ok "flags dead widget var 'prompt'" || no "missed dead widget 'prompt'"

# 10. used vars ending in ? are NOT flagged
tt="$REPO/demos/topology-tournament/topology-tournament.nlogox"
if [ -f "$tt" ]; then
  o2="$($NLCHECK --no-compile "$tt" 2>&1)"
  has "$o2" "widget variable 'use-llm\?'" && no "false positive: use-llm? is used" || ok "no false positive on use-llm?"
fi

# 11. hyphenated substring must not count as a use
mkdir -p "$FIX/hyp"; cp "$FIX/m/model.nlogox" "$FIX/hyp/model.nlogox"
cp "$FIX/m/config.txt" "$FIX/hyp/" 2>/dev/null
o3="$($NLCHECK --no-compile "$FIX/hyp/model.nlogox" 2>&1)"
has "$o3" "widget variable 'prompt'" && ok "'prompt' not satisfied by 'current-prompt'" || no "hyphen substring leak"

echo "── Layer 2: traps must not fire on model-defined helpers"

# 12. lower-case-string helper is legitimate
ps="$REPO/demos/provider-sensitivity/provider-sensitivity.nlogox"
if [ -f "$ps" ]; then
  o4="$($NLCHECK --no-compile "$ps" 2>&1)"
  has "$o4" 'no lower-case primitive' && no "false positive: lower-case-string is a valid helper" || ok "no false positive on lower-case-string"
fi

echo "── extractor: bare <code> (no CDATA wrapper)"

# NetLogo emits <code> WITHOUT a CDATA wrapper when the code has no XML-special
# chars. Handling only the CDATA form silently checked 24% of stock models as empty.
mkdir -p "$FIX/bare"
cat > "$FIX/bare/model.nlogox" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<model version="NetLogo 7.0.3" snapToGrid="true">
  <code>to setup
  clear-all
  print .5
  reset-ticks
end</code>
  <widgets>
    <view x="0" y="0" width="200" height="200" patchSize="10.0" frameRate="30.0"
      minPxcor="-9" maxPxcor="9" minPycor="-9" maxPycor="9" fontSize="10"
      wrappingAllowedX="true" wrappingAllowedY="true" showTickCounter="true"
      tickCounterLabel="ticks" updateMode="1"></view>
  </widgets>
</model>
XML
out="$($NLCHECK --no-compile "$FIX/bare/model.nlogox" 2>&1)"
has "$out" 'no <code> CDATA' && no "bare <code> not extracted (silent empty check)" || ok "extracts bare <code>"
has "$out" 'leading zero' && ok "finds rules inside bare <code>" || no "rules not applied to bare <code>"

echo "── nlsnip: bare snippet checking"
SNIP="$HERE/nlsnip.sh"
if [ -x "$SNIP" ]; then
  $SNIP 'ask turtles [ fd 1 ]' >/dev/null 2>&1 && ok "valid command snippet compiles" || no "valid command snippet rejected"
  $SNIP 'ask turtles [ frobnicate ]' >/dev/null 2>&1 && no "fake primitive in snippet not caught" || ok "catches fake primitive in snippet"
  $SNIP 'let x llm:chat "hi"' >/dev/null 2>&1 && ok "llm: primitive resolves (extension declared)" || no "false positive on real llm: primitive"
  $SNIP -r 'count turtles with [ color = red ]' >/dev/null 2>&1 && ok "valid reporter snippet compiles" || no "valid reporter snippet rejected"
  # Documented rule: ask requires an agentset, never a list.
  $SNIP 'ask sort turtles [ fd 1 ]' >/dev/null 2>&1 && no "'ask' on a list not caught" || ok "catches 'ask' on a list [Programming Guide]"
else
  no "nlsnip.sh missing or not executable"
fi

echo
echo "── selftest: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] || exit 1
