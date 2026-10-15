#!/usr/bin/env bash
# ABOUTME: RUN NetLogo code headless against real extensions and print what it reports.
# ABOUTME: Unlike nlsnip.sh (compile only), this executes — for live end-to-end testing.
set -uo pipefail

NETLOGO_DIR="${NETLOGO_DIR:-$HOME/Developer/CCL/NetLogo 7.0.3}"
JAR="$(ls "$NETLOGO_DIR"/app/netlogo-*.jar 2>/dev/null | grep -vE 'mac-app|headless' | head -1)"
: "${JAVA_HOME:=$(/usr/libexec/java_home -v 17 2>/dev/null)}"

EXTS="${NLRUN_EXTENSIONS:-llm}"
WORKDIR=""      # cd here first, so relative config paths resolve like a real model
SNIP=""

while [ $# -gt 0 ]; do
  case "$1" in
    -d|--dir) shift; WORKDIR="${1:-}" ;;
    -e|--extensions) shift; EXTS="${1:-}" ;;
    -h|--help)
      cat <<'USAGE'
nlrun.sh [-d workdir] [-e "ext1 ext2"] 'netlogo commands'
echo 'commands' | nlrun.sh [flags]

Executes NetLogo COMMANDS headless with extensions loaded, and prints whatever
the code reports via the `emit` helper.

  -d DIR   run as if the model lived in DIR (relative config paths resolve there)
  -e "..." extensions to declare (default: llm)

Inside your snippet, call:  emit "some text"
Each emit line is printed to stdout prefixed with `>> `.

WHY THIS EXISTS
  BehaviorSpace swallows `print` output and aborts before flushing its CSV on a
  0-step run, so neither is usable for capturing results. This writes emitted
  lines straight to a file the wrapper then prints.

Exit 0 = ran to completion. Exit 1 = runtime or compile error (message printed).
USAGE
      exit 0 ;;
    *) SNIP="$1" ;;
  esac
  shift
done

[ -z "$SNIP" ] && [ ! -t 0 ] && SNIP="$(cat)"
[ -z "$SNIP" ] && { echo "nlrun: no code given (--help)" >&2; exit 2; }
[ -n "$JAR" ] || { echo "nlrun: NetLogo jar not found under $NETLOGO_DIR/app/" >&2; exit 2; }

W="$(mktemp -d -t nlrun)"
OUT="$W/emitted.txt"
trap 'rm -rf "$W"' EXIT

esc(){ printf '%s' "$1" | sed 's/\]\]>/]]]]><![CDATA[>/g'; }

EXTLINE=""
[ -n "$EXTS" ] && EXTLINE="extensions [$EXTS]"

# The model writes each emitted line to a file. `file-print` is line-buffered by
# NetLogo and flushed on file-close, which survives the BehaviorSpace abort that
# discards stdout and the metrics CSV.
cat > "$W/m.nlogox" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<model version="NetLogo 7.0.3" snapToGrid="true">
  <code><![CDATA[$EXTLINE

globals [__out]

to emit [__line]
  file-open __out
  file-print __line
  file-close
end

to __noop
end

to __run
  set __out "$OUT"
  carefully [ file-delete __out ] [ ]
  carefully
    [ __body ]
    [ emit (word "RUNTIME-ERROR: " error-message) ]
end

to __body
$(esc "$SNIP")
end
]]></code>
  <widgets>
    <view x="0" y="0" width="100" height="100"
          minPxcor="-2" maxPxcor="2" minPycor="-2" maxPycor="2"
          patchSize="20.0" frameRate="30.0" fontSize="10"
          wrappingAllowedX="true" wrappingAllowedY="true"
          showTickCounter="true" tickCounterLabel="ticks" updateMode="1"/>
  </widgets>
  <info><![CDATA[nlrun harness]]></info>
  <turtleShapes>
    <shape name="default" rotatable="true" editableColorIndex="0">
      <polygon color="-1920102913" filled="true" marked="true">
        <point x="150" y="5"/><point x="40" y="250"/>
        <point x="150" y="205"/><point x="260" y="250"/>
      </polygon>
    </shape>
  </turtleShapes>
  <linkShapes>
    <shape name="default" curviness="0.0">
      <lines>
        <line x="-0.2" visible="false"><dash value="0.0"/><dash value="1.0"/></line>
        <line x="0.0" visible="true"><dash value="1.0"/><dash value="0.0"/></line>
        <line x="0.2" visible="false"><dash value="0.0"/><dash value="1.0"/></line>
      </lines>
      <indicator>
        <shape name="link direction" rotatable="true" editableColorIndex="0">
          <line startX="150" startY="150" endX="90" endY="180" marked="true" color="-1920102913"/>
          <line startX="150" startY="150" endX="210" endY="180" marked="true" color="-1920102913"/>
        </shape>
      </indicator>
    </shape>
  </linkShapes>
  <experiments>
    <experiment name="run" repetitions="1" sequentialRunOrder="true" runMetricsEveryStep="true" timeLimit="1">
      <setup>__run</setup>
      <go>__noop</go>
      <metrics>
        <metric>0</metric>
      </metrics>
    </experiment>
  </experiments>
</model>
EOF

# Relative config paths in the snippet resolve against the model's directory, so
# copy the harness next to the caller's files rather than leaving it in $W.
MODEL="$W/m.nlogox"
if [ -n "$WORKDIR" ]; then
  cp "$W/m.nlogox" "$WORKDIR/.nlrun-harness.nlogox"
  MODEL="$WORKDIR/.nlrun-harness.nlogox"
  trap 'rm -rf "$W"; rm -f "$MODEL"' EXIT
fi

ERRLOG="$W/stderr.txt"
"$JAVA_HOME/bin/java" -Dfile.encoding=UTF-8 \
  -Dnetlogo.extensions.dir="$NETLOGO_DIR/extensions" \
  --add-exports=java.base/java.lang=ALL-UNNAMED \
  --add-exports=java.desktop/sun.awt=ALL-UNNAMED \
  --add-exports=java.desktop/sun.java2d=ALL-UNNAMED \
  -classpath "$JAR" org.nlogo.headless.Main \
  --headless --model "$MODEL" \
  --experiment run --table /dev/null >/dev/null 2>"$ERRLOG"

# Exit code is NOT the signal: a clean 0-step run still exits 1 with
# "head of empty list". Real failures name a compiler or extension error.
if [ -s "$OUT" ]; then
  sed 's/^/>> /' "$OUT"
fi

if grep -qE "Nothing named|Expected |is not a|Extension exception|COMPILE" "$ERRLOG" 2>/dev/null; then
  echo "--- error ---"
  grep -vE "^\s+at |NoSuchElementException: head of empty list" "$ERRLOG" | head -10
  exit 1
fi

[ -s "$OUT" ] || { echo "nlrun: no output emitted (did you call emit?)" >&2
                   grep -vE "^\s+at " "$ERRLOG" | head -5 >&2; exit 1; }
exit 0
