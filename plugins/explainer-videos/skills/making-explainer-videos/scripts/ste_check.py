# ABOUTME: Reports narration sentences that break the core ASD-STE100 description rules.
# ABOUTME: It only reports; the author decides each fix, because the narration is the author's content.
import re
import sys

from spec import load

MAX_WORDS = 25
CONTRACTION = re.compile(r"\b\w+'(s|t|re|ve|ll|d|m)\b", re.I)
PASSIVE = re.compile(r"\b(is|are|was|were|be|been|being)\s+\w+ed\b", re.I)


def check(spec):
    findings = []
    for scene in spec["scenes"]:
        for n, sentence in enumerate(scene["sentences"], 1):
            where = f"{scene['id']} #{n}"
            words = len(sentence.split())
            if words > MAX_WORDS:
                findings.append((where, f"{words} words (max {MAX_WORDS})", sentence))
            if ";" in sentence:
                findings.append((where, "semicolon", sentence))
            if CONTRACTION.search(sentence.replace("’", "'")) and not re.search(r"\w+'s\s", sentence):
                findings.append((where, "contraction", sentence))
            if re.search(r"\bmay\b", sentence, re.I):
                findings.append((where, "'may' (use 'can' or 'must')", sentence))
            if PASSIVE.search(sentence):
                findings.append((where, "possible passive voice", sentence))
    return findings


if __name__ == "__main__":
    spec = load(sys.argv[1])
    findings = check(spec)
    if not findings:
        print("STE check: no findings.")
    for where, problem, sentence in findings:
        print(f"[{where}] {problem}: {sentence}")
