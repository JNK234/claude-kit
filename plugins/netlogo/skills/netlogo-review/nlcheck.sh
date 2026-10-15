#!/usr/bin/env bash
# ABOUTME: Zero-token NetLogo .nlogox checker — compile gate + CCL CODE Tab style rules.
# ABOUTME: Layers 0-2 of netlogo-review. No LLM, no dependencies beyond java + the NetLogo app.
set -uo pipefail

NETLOGO_DIR="${NETLOGO_DIR:-$HOME/Developer/CCL/NetLogo 7.0.3}"
# Find the NetLogo jar by glob so this is not pinned to one point release.
JAR="$(ls "$NETLOGO_DIR"/app/netlogo-*.jar 2>/dev/null | grep -vE 'mac-app|headless' | head -1)"
: "${JAVA_HOME:=$(/usr/libexec/java_home -v 17 2>/dev/null)}"

NO_COMPILE=0
QUIET=0
FILES=()
for a in "$@"; do
  case "$a" in
    --no-compile) NO_COMPILE=1 ;;
    --quiet)      QUIET=1 ;;
    -h|--help)
      cat <<'USAGE'
nlcheck.sh [--no-compile] [--quiet] <file.nlogox> [more.nlogox ...]

Layer 0  style   CCL CODE Tab mechanical rules (advisory)
Layer 1  compile NetLogo compiler via headless (BLOCKING)
Layer 2  traps   known .nlogox XML traps from ccl-demo-builder/errors.md (advisory)

Exit 0 = compiles. Exit 1 = compile error or file problem.
Style findings never affect exit code.
Env: NETLOGO_DIR (default: ~/Developer/CCL/NetLogo 7.0.3)
USAGE
      exit 0 ;;
    *) FILES+=("$a") ;;
  esac
done

[ ${#FILES[@]} -eq 0 ] && { echo "nlcheck: no files given (--help for usage)" >&2; exit 1; }

# Extract the <code> element from a .nlogox.
# NetLogo writes it TWO ways: wrapped in CDATA when the code contains XML-special
# characters, and bare otherwise. Handling only the CDATA form silently returned
# nothing for ~24% of stock library models (6 of 25 sampled). Handle both, and
# unescape entities in the bare form.
extract_code() {
  if grep -q '<code><!\[CDATA\[' "$1" 2>/dev/null; then
    awk '/<code><!\[CDATA\[/{f=1; sub(/.*<code><!\[CDATA\[/,"")} f{ if(/\]\]><\/code>/){sub(/\]\]><\/code>.*/,""); print; exit} print }' "$1"
  else
    awk '/<code>/{f=1; sub(/.*<code>/,"")} f{ if(/<\/code>/){sub(/<\/code>.*/,""); print; exit} print }' "$1" \
      | sed -e 's/&lt;/</g' -e 's/&gt;/>/g' -e 's/&quot;/"/g' -e "s/&apos;/'/g" -e 's/&amp;/\&/g'
  fi
}

# Build the compile-only BehaviorSpace setup file once.
# steps=0 + a constant metric: NetLogo compiles the model but runs nothing.
SETUP_XML="$(mktemp -t nlcheck).xml"
cat > "$SETUP_XML" <<'EOF'
<?xml version="1.0" encoding="us-ascii"?>
<!DOCTYPE experiments SYSTEM "behaviorspace.dtd">
<experiments>
  <experiment name="nlcheck" repetitions="1" runMetricsEveryStep="false">
    <setup></setup>
    <go></go>
    <timeLimit steps="0"/>
    <metric>0</metric>
  </experiment>
</experiments>
EOF
trap 'rm -f "$SETUP_XML"' EXIT

# IMPORTANT: do NOT use $NETLOGO_DIR/netlogo-headless.sh — the shipped script has
# literal brackets in JVM_OPTS ([--add-exports=...]) and crashes. Invoke java directly.
#
# IMPORTANT: exit code is NOT the compile signal. A clean model still exits 1 with
# "NoSuchElementException: head of empty list" (BehaviorSpace artifact on a 0-step run).
# The reliable signal is compiler-error TEXT. Verified 29 Jul 2026: 4/4 injected
# mutations detected, 3/3 clean models produced zero matches.
COMPILER_ERR_RE='Nothing named|has not been defined|Expected command|Expected reporter|expected input|too many inputs|CompilerException|Nothing named .* has been defined'

compile_check() {
  local model="$1"
  [ -f "$JAR" ] || { echo "    ! NetLogo jar not found: $JAR"; return 2; }
  "$JAVA_HOME/bin/java" -Dfile.encoding=UTF-8 \
    -Dnetlogo.extensions.dir="$NETLOGO_DIR/extensions" \
    --add-exports=java.base/java.lang=ALL-UNNAMED \
    --add-exports=java.desktop/sun.awt=ALL-UNNAMED \
    --add-exports=java.desktop/sun.java2d=ALL-UNNAMED \
    -classpath "$JAR" org.nlogo.headless.Main --headless \
    --model "$model" --setup-file "$SETUP_XML" --experiment nlcheck --table - 2>&1 \
    | grep -iE "$COMPILER_ERR_RE" | sort -u
}

TOTAL_STYLE=0
FAILED=0

for f in "${FILES[@]}"; do
  echo "══ $f"
  if [ ! -f "$f" ]; then echo "   ✗ no such file"; FAILED=1; continue; fi

  code="$(extract_code "$f")"
  if [ -z "$code" ]; then echo "   ! no <code> CDATA block found"; fi
  dir="$(dirname "$f")"
  n=0

  say() { [ "$QUIET" -eq 1 ] || echo "   · $1"; n=$((n+1)); }

  # ---- Layer 1: COMPILE (blocking) ----
  if [ "$NO_COMPILE" -eq 0 ]; then
    cerr="$(compile_check "$f")"
    if [ -n "$cerr" ]; then
      echo "   ✗ COMPILE FAILED"
      echo "$cerr" | sed 's/^/       /'
      FAILED=1
    else
      echo "   ✓ compiles"
    fi
  fi

  # ---- Layer 0: config paths (issue #66 class) — factual, high value ----
  # NetLogo resolves a relative config path against the MODEL's directory, not the
  # shell's CWD. Do NOT add a CWD fallback: running from the repo root made
  # "demos/config" look valid while it is broken for every real user. That false
  # negative is exactly how issue #66 shipped to the Models Library.
  while IFS= read -r cfg; do
    [ -z "$cfg" ] && continue
    case "$cfg" in
      /*) [ -f "$cfg" ] || say "config not found (absolute): $cfg" ;;
      *)  [ -f "$dir/$cfg" ] || say "config not found: llm:load-config \"$cfg\" → no such file at $dir/$cfg" ;;
    esac
  done < <(printf '%s\n' "$code" | grep -oE 'llm:load-config[[:space:]]+"[^"]+"' | sed 's/.*"\(.*\)"/\1/' | sort -u)

  # ---- Layer 0: widget variables never read by code (dead UI) ----
  # Strip comments first, then require the identifier NOT be part of a longer
  # hyphenated name. NetLogo identifiers may contain '-', so \b is not enough:
  # bare "prompt" matches inside "current-prompt". Guard both sides with [^a-zA-Z0-9?_-].
  # A trailing '?' is part of the identifier, so it must be escaped in the regex and
  # must NOT be treated as a boundary character. Getting this wrong reported
  # use-llm? / thinking-mode? / show-votes? as dead when they are all used.
  code_nc="$(printf '%s\n' "$code" | sed 's/;.*$//')"
  while IFS= read -r v; do
    [ -z "$v" ] && continue
    vq="$(printf '%s' "$v" | sed 's/[?]/\\?/g')"
    # Left guard: not preceded by an identifier char.
    # Right guard: for names ending in '?', the '?' already terminates the identifier.
    case "$v" in
      *\?) re="(^|[^a-zA-Z0-9_-])${vq}" ;;
      *)   re="(^|[^a-zA-Z0-9_-])${vq}([^a-zA-Z0-9?_-]|\$)" ;;
    esac
    if ! printf '%s\n' "$code_nc" | grep -qE "$re"; then
      say "widget variable '$v' is never read by any code (dead control)"
    fi
  done < <(grep -oE 'variable="[a-zA-Z][a-zA-Z0-9?-]*"' "$f" 2>/dev/null | sed 's/variable="\(.*\)"/\1/' | sort -u)

  # ---- Layer 0: CCL CODE Tab mechanical rules ----
  # https://github.com/NetLogo/models/wiki/The-CODE-Tab
  long=$(printf '%s\n' "$code" | awk 'length>85' | wc -l | tr -d ' ')
  [ "$long" -gt 0 ] && say "$long line(s) exceed 85 chars [CODE Tab: Line Length]"

  # Debug output left in code. Test harnesses legitimately print — exempt them.
  case "$(basename "$f")" in
    tests.nlogox|reliability-tests.nlogox|*-test*.nlogox) ;;
    *)
      dbg=$(printf '%s\n' "$code" | grep -cE '^[[:space:]]*(print|show|type|write)[[:space:]]')
      [ "$dbg" -gt 0 ] && say "$dbg debug print/show/type/write statement(s) — use an output widget [CODE Tab: Debugging Code]"
      ;;
  esac

  who=$(printf '%s\n' "$code" | grep -cE '\bwho\b')
  [ "$who" -gt 0 ] && say "$who use(s) of 'who' — rarely legitimate [CODE Tab: Primitives to Avoid]"

  ac=$(printf '%s\n' "$code" | grep -cE '\bask-concurrent\b')
  [ "$ac" -gt 0 ] && say "$ac use(s) of ask-concurrent — backwards-compat only [CODE Tab]"

  ifp=$(printf '%s\n' "$code" | grep -cE '\b(if|ifelse)[[:space:]]*\(')
  [ "$ifp" -gt 0 ] && say "$ifp 'if (cond?)' — parens are noise [CODE Tab: Parentheses]"

  lead=$(printf '%s\n' "$code" | grep -cE '[^0-9a-zA-Z._]\.[0-9]')
  [ "$lead" -gt 0 ] && say "$lead fractional number(s) missing leading zero (.5 → 0.5) [CODE Tab]"

  cnt=$(printf '%s\n' "$code" | grep -cE 'count[[:space:]]+[a-z-]+[[:space:]]*(>[[:space:]]*0|>=[[:space:]]*1|=[[:space:]]*0)')
  [ "$cnt" -gt 0 ] && say "$cnt 'count X > 0' — use 'any? X' / 'not any? X' [CODE Tab: Count vs Any?]"

  beq=$(printf '%s\n' "$code" | grep -cE '=[[:space:]]*(true|false)\b')
  [ "$beq" -gt 0 ] && say "$beq '= true/false' comparison — use the boolean directly [CODE Tab]"

  # Booleans that don't end in ?
  while IFS= read -r bv; do
    [ -z "$bv" ] && continue
    say "boolean-valued '$bv' should end in '?' [CODE Tab: Boolean Naming]"
  done < <(printf '%s\n' "$code" | grep -oE 'set[[:space:]]+[a-z][a-z0-9-]*[[:space:]]+(true|false)\b' \
           | awk '{print $2}' | grep -vE '\?$' | sort -u)

  # Boilerplate info tab (ships to the Models Library looking unfinished)
  grep -q 'a general understanding of what the model is trying to show' "$f" 2>/dev/null \
    && say "info tab is still the NetLogo boilerplate template"

  # ---- Layer 2: known traps from ccl-demo-builder/errors.md ----
  grep -q '<button' "$f" 2>/dev/null && ! grep -q 'disableUntilTicks' "$f" 2>/dev/null \
    && say "TRAP: <button> missing disableUntilTicks → load error [errors.md]"
  grep -q '<monitor' "$f" 2>/dev/null && ! grep -qE '<monitor[^>]*fontSize' "$f" 2>/dev/null \
    && say "TRAP: <monitor> missing fontSize → load error [errors.md]"
  grep -qE 'wrappingAllowedIn[XY]' "$f" 2>/dev/null \
    && say "TRAP: wrappingAllowedInX/Y is wrong — use wrappingAllowedX/Y [errors.md]"
  grep -qE '<plot[^>]*(xmin|xmax|ymin|ymax)=' "$f" 2>/dev/null \
    && say "TRAP: plot bounds are camelCase (xMin/xMax/yMin/yMax) [errors.md]"
  # Only the bare primitive is a trap. A model-defined helper like lower-case-string
  # is correct and must not be flagged.
  printf '%s\n' "$code" | grep -qE '(^|[^a-zA-Z0-9_-])lower-case([^a-zA-Z0-9_-]|$)' \
    && say "TRAP: no lower-case primitive in NetLogo 7 [errors.md]"
  printf '%s\n' "$code" | grep -qE '^[[:space:]]*let[[:space:]]+(dx|dy|dt|distance|heading|color|size|label)\b' \
    && say "TRAP: local var shadows a built-in primitive [errors.md]"

  # carefully blocks that swallow errors silently (issue #34 class)
  car=$(printf '%s\n' "$code" | grep -cE '\bcarefully\b')
  [ "$car" -gt 0 ] && say "$car carefully block(s) — confirm each surfaces error-message, not silence"

  [ "$n" -eq 0 ] && echo "   ✓ no style findings"
  TOTAL_STYLE=$((TOTAL_STYLE+n))
done

echo
echo "── $TOTAL_STYLE style finding(s) across ${#FILES[@]} file(s); compile: $([ $FAILED -eq 0 ] && echo PASS || echo FAIL)"
exit $FAILED
