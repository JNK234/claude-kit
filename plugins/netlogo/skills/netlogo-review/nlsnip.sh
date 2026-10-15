#!/usr/bin/env bash
# ABOUTME: Compile-check a bare NetLogo snippet (no .nlogox needed) via a minimal host model.
# ABOUTME: For validating LLM-generated code, Command Center one-liners, or a single line.
set -uo pipefail

NETLOGO_DIR="${NETLOGO_DIR:-$HOME/Developer/CCL/NetLogo 7.0.3}"
JAR="$(ls "$NETLOGO_DIR"/app/netlogo-*.jar 2>/dev/null | grep -vE 'mac-app|headless' | head -1)"
: "${JAVA_HOME:=$(/usr/libexec/java_home -v 17 2>/dev/null)}"

EXTS="${NLSNIP_EXTENSIONS:-llm}"   # extensions to declare; override or set empty
MODE=command                        # command | reporter | raw
SNIP=""

while [ $# -gt 0 ]; do
  case "$1" in
    -r|--reporter) MODE=reporter ;;
    --raw)         MODE=raw ;;
    -e|--extensions) shift; EXTS="${1:-}" ;;
    -h|--help)
      cat <<'USAGE'
nlsnip.sh [-r] [--raw] [-e "ext1 ext2"] 'netlogo code'
echo 'code' | nlsnip.sh [flags]

  (default)   treat snippet as COMMANDS   → wrapped in `to __snip ... end`
  -r          treat snippet as a REPORTER → wrapped in `to-report __snip report ... end`
  --raw       snippet is already full top-level code (procedures, globals, breeds)
  -e "..."    extensions to declare (default: llm; use -e "" for none)

Exit 0 = compiles. Exit 1 = compile error (message printed).
USAGE
      exit 0 ;;
    *) SNIP="$1" ;;
  esac
  shift
done

# Read from stdin when no argument given
[ -z "$SNIP" ] && [ ! -t 0 ] && SNIP="$(cat)"
[ -z "$SNIP" ] && { echo "nlsnip: no code given (--help)" >&2; exit 2; }
[ -n "$JAR" ] || { echo "nlsnip: NetLogo jar not found under $NETLOGO_DIR/app/" >&2; exit 2; }

W="$(mktemp -d -t nlsnip)"
trap 'rm -rf "$W"' EXIT

# Escape ]]> so a snippet can never break out of the CDATA block.
esc(){ printf '%s' "$1" | sed 's/\]\]>/]]]]><![CDATA[>/g'; }

case "$MODE" in
  command)  BODY="to __snip"$'\n'"$(esc "$SNIP")"$'\n'"end" ;;
  reporter) BODY="to-report __snip"$'\n'"  report $(esc "$SNIP")"$'\n'"end" ;;
  raw)      BODY="$(esc "$SNIP")" ;;
esac

EXTLINE=""
[ -n "$EXTS" ] && EXTLINE="extensions [$EXTS]"

cat > "$W/m.nlogox" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<model version="NetLogo 7.0.3" snapToGrid="true">
  <code><![CDATA[$EXTLINE
$BODY]]></code>
  <widgets>
    <view x="0" y="0" width="200" height="200" patchSize="10.0" frameRate="30.0"
      minPxcor="-9" maxPxcor="9" minPycor="-9" maxPycor="9" fontSize="10"
      wrappingAllowedX="true" wrappingAllowedY="true" showTickCounter="true"
      tickCounterLabel="ticks" updateMode="1"></view>
  </widgets>
  <info></info>
  <turtleShapes><shape name="default" rotatable="true" editableColorIndex="0"><polygon color="-1920102913" filled="true" marked="true"><point x="150" y="5"></point><point x="40" y="250"></point><point x="150" y="205"></point><point x="260" y="250"></point></polygon></shape></turtleShapes>
  <linkShapes><shape name="default" curviness="0.0"><lines><line x="0.0" visible="true"><dash value="1.0"></dash><dash value="0.0"></dash></line></lines><indicator><shape name="link direction" rotatable="true" editableColorIndex="0"><line endX="90" startY="150" marked="true" color="-1920102913" endY="180" startX="150"></line></shape></indicator></shape></linkShapes>
</model>
EOF

cat > "$W/x.xml" <<'EOF'
<?xml version="1.0" encoding="us-ascii"?>
<!DOCTYPE experiments SYSTEM "behaviorspace.dtd">
<experiments><experiment name="c" repetitions="1" runMetricsEveryStep="false">
<setup></setup><go></go><timeLimit steps="0"/><metric>0</metric></experiment></experiments>
EOF

# See netlogo-review/SKILL.md: exit code is not the signal; compiler-error TEXT is.
ERR="$("$JAVA_HOME/bin/java" -Dfile.encoding=UTF-8 \
  -Dnetlogo.extensions.dir="$NETLOGO_DIR/extensions" \
  --add-exports=java.base/java.lang=ALL-UNNAMED \
  --add-exports=java.desktop/sun.awt=ALL-UNNAMED \
  --add-exports=java.desktop/sun.java2d=ALL-UNNAMED \
  -classpath "$JAR" org.nlogo.headless.Main --headless \
  --model "$W/m.nlogox" --setup-file "$W/x.xml" --experiment c --table - 2>&1 \
  | grep -iE 'Nothing named|has not been defined|Expected|expected input|too many inputs|CompilerException|is not a| reserved' \
  | sed 's/ at position \([0-9]*\) in.*/ (offset \1)/' | sort -u)"

if [ -n "$ERR" ]; then
  echo "✗ COMPILE ERROR"
  printf '%s\n' "$ERR" | sed 's/^/   /'
  exit 1
fi
echo "✓ compiles"
exit 0
