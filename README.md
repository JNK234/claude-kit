# claude-kit

Claude Code skills, commands, agents and workflows I use day to day, packaged as a plugin marketplace.

## Install

One command (installs every bundle):

```bash
curl -fsSL https://raw.githubusercontent.com/JNK234/claude-kit/main/install.sh | bash
```

Only some bundles:

```bash
curl -fsSL https://raw.githubusercontent.com/JNK234/claude-kit/main/install.sh | bash -s -- writing dev-tools
```

Or from inside Claude Code, without the workflows:

```
/plugin marketplace add JNK234/claude-kit
/plugin install writing@claude-kit
```

Update later with `claude plugin marketplace update claude-kit`, or re-run the installer.

## Bundles

| Bundle | What's in it |
|---|---|
| `writing` | `email-busy-people` (cold outreach that gets replies), `linkedin-post-writer`, `twitter-copywriting-skill`, `research-blog-post` |
| `research-vault` | `research-papers` (decode papers into Obsidian notes), `knowledge-wiki` (zettels + synthesis pages), `surface-ideas`, `obsidian-vault`, `/research-papers` command |
| `explainer-videos` | `making-explainer-videos`: narrated Manim explainers from a spec |
| `netlogo` | `netlogo-dev`, `netlogo-review` (compile gate + style checks), `ccl-demo-builder` |
| `dev-tools` | `github-ops`, `timed-takehome`, `/plan` `/implement` `/create-spec` `/brainstorm` `/commit-push` `/prime` and more, `loop-coder` / `loop-tester` agents |
| `life` | `astro` (Vedic charts), `raising-invoices` (PDF invoices) |

Workflows (`research-scope`, `research-decode`, `knowledge-wiki-ingest`, `explainer-plan`, `explainer-render`, `feature-build`, `bug-fix`) are copied into `~/.claude/workflows/` by `install.sh`.

## Config

The research-vault skills need two paths. `install.sh` writes `~/.claude/claude-kit.env`; also put them in `~/.claude/settings.json`:

```json
"env": { "VAULT": "/path/to/your/ObsidianVault", "ZK_DIR": "/path/to/zettelkasten-auto" }
```

- `VAULT`: your Obsidian vault root.
- `ZK_DIR`: a clone of [zettelkasten-auto](https://github.com/JNK234/zettelkasten-auto) (semantic search over zettels).
- `netlogo-review` reads `NETLOGO_LLM_EXT`, `ccl-demo-builder` reads `NETLOGO_APP`.

## Requirements per bundle

- `research-vault`: [obsidian-cli](https://github.com/Yakitrak/obsidian-cli), `uv`
- `explainer-videos`: `uv`, ffmpeg; `ELEVENLABS_API_KEY` optional (falls back to macOS `say`)
- `life/astro`: Node (`npm install` in the skill's `scripts/` on first use)
- `dev-tools/github-ops`: `gh`

## Also worth installing (not mine, not bundled)

- [superpowers](https://github.com/obra/superpowers): TDD, debugging, planning skills
- [anthropics/skills](https://github.com/anthropics/skills): docx / pdf / pptx / xlsx
- [paper-writing-skill](https://github.com/SNL-UCSB/paper-writing-skill), [scientific-writing-skill](https://github.com/haoyu-haoyu/scientific-writing-skill)
