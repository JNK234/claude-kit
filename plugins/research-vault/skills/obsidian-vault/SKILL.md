---
name: obsidian-vault
description: Read and write the user's Obsidian vault (Brain) via obsidian-cli. This vault is the single home for all notes and the first place to look for what the user already knows. Load it before saving ANY note, research output, summary, or reference, and before answering from the user's own knowledge. Triggers on "save this", "save to obsidian", "write a note", "source note", "my notes", "my vault", "what do I have on X", "search my vault", "daily note", "add to inbox", plus any move/delete/rename/frontmatter request.
---

# Obsidian Vault Management

CRUD operations, search, frontmatter management, and daily notes for the Obsidian vault via the official Obsidian CLI.

**Vault:** Brain (default, no `-v` flag needed)
**Vault path:** `$VAULT/`
**Tool:** `obsidian-cli` v0.2.2 via Bash
**Binary:** `/opt/homebrew/bin/obsidian-cli` (NOT `obsidian` — that's the Electron app)
**Suppress warnings:** Always append `2>/dev/null` to commands

**RELATED SKILLS:**
- For deep-decoding research papers → `research-papers`
- For processing sources into atomic zettels → `zettelkasten`
- For in-session thinking work → `deep-work`
- For idea capture and queue → `idea-queue`

---

## CLI Syntax

All commands use **positional arguments** for note names/paths, and **flags** for options:

```
obsidian-cli <command> "<note name or path>" [flags] 2>/dev/null
```

- Note names are fuzzy-matched (like wikilinks — no path or `.md` extension needed)
- For notes in subfolders, use the relative path from vault root: `"10_SOURCES/My Note"`
- Quote names with spaces: `"Job Applications Log"`
- The vault is already set to Brain — omit `-v` flag

---

## Available Commands (v0.2.2)

There are exactly **12 commands**. Do NOT use any other command names.

| Command | Alias | Purpose |
|---------|-------|---------|
| `print` | `p` | Print note contents to stdout |
| `create` | `c` | Create a new note (or append to existing) |
| `open` | `o` | Open note in Obsidian app |
| `search` | `s` | Fuzzy search and open note in Obsidian |
| `search-content` | `sc` | Search note content for a term (requires Obsidian running) |
| `move` | `m` | Move or rename note (updates links) |
| `delete` | `d` | Delete note from vault |
| `daily` | `d` | Create or open daily note |
| `frontmatter` | `fm` | View or modify YAML frontmatter |
| `print-default` | | Print default vault name and path |
| `set-default` | `sd` | Set default vault |
| `completion` | | Generate shell autocompletion |

---

## Core Operations

### Read / Print a Note

```bash
# Print note contents (fuzzy name match)
obsidian-cli print "Job Applications Log" 2>/dev/null

# Print note with linked mentions included
obsidian-cli print "PPO" -m 2>/dev/null

# Print note from a specific folder path
obsidian-cli print "10_SOURCES/Job Applications Log" 2>/dev/null
```

### Create a Note

```bash
# Create a new note with content
obsidian-cli create "00_INBOX/Quick Thought" -c "# Quick Thought\n\nContent here" 2>/dev/null

# Create in a specific folder
obsidian-cli create "10_SOURCES/New Paper" -c "# New Paper\n\nNotes..." 2>/dev/null

# Create and open in Obsidian
obsidian-cli create "30_PROJECTS/New Project" -c "# Project" --open 2>/dev/null

# Overwrite an existing note
obsidian-cli create "00_INBOX/Existing Note" -c "Replaced content" -o 2>/dev/null
```

### Append to a Note

```bash
# Append content to an existing note (uses create with -a flag)
obsidian-cli create "Research Notes" -c "\n## New Section\nContent here" -a 2>/dev/null

# Append a task to the daily note — first get daily note, then append
# (No direct daily-append command exists)
```

### Search

```bash
# Fuzzy search by name and open in Obsidian
obsidian-cli search "transformer" 2>/dev/null

# Search note CONTENT for a term (requires Obsidian app running)
obsidian-cli search-content "attention mechanism" 2>/dev/null

# Open in editor instead of Obsidian
obsidian-cli search-content "RLHF" -e 2>/dev/null
```

**Note:** `search-content` requires Obsidian app to be running. If it fails, fall back to using the Read tool directly on vault files, or use `ast-grep`/grep on the vault path.

### Move / Rename

```bash
# Move a note (takes 2 positional args: source, destination)
obsidian-cli move "Quick Thought" "10_SOURCES/Quick Thought" 2>/dev/null

# Rename a note (move to same folder with new name)
obsidian-cli move "Old Name" "New Name" 2>/dev/null

# Move and open in Obsidian
obsidian-cli move "Draft" "10_SOURCES/Final" -o 2>/dev/null
```

### Delete

```bash
# Delete a note (moves to .trash/)
obsidian-cli delete "Outdated Note" 2>/dev/null

# Delete note in a subfolder
obsidian-cli delete "00_INBOX/Temp Note" 2>/dev/null
```

### Open in Obsidian

```bash
# Open note in Obsidian app
obsidian-cli open "Job Applications Log" 2>/dev/null
```

---

## Frontmatter (Properties)

```bash
# Print all frontmatter for a note
obsidian-cli frontmatter "PPO Paper" --print 2>/dev/null

# Edit a frontmatter key
obsidian-cli frontmatter "PPO Paper" --edit --key "status" --value "done" 2>/dev/null

# Delete a frontmatter key
obsidian-cli frontmatter "PPO Paper" --delete --key "draft" 2>/dev/null
```

---

## Daily Notes

```bash
# Create or open today's daily note in Obsidian
obsidian-cli daily 2>/dev/null
```

**Note:** The CLI only has one `daily` command — it creates/opens the daily note. There is no `daily:read`, `daily:append`, or `daily:path` command. To read/append to the daily note, find its path first (it follows the vault's daily note template pattern in `80_JOURNALS/`) and use `print` or `create -a` with the full path.

---

## Vault Info

```bash
# Print default vault name and path
obsidian-cli print-default 2>/dev/null

# Set default vault
obsidian-cli set-default "Brain" 2>/dev/null
```

---

## Vault Structure

| Folder | Purpose |
|--------|---------|
| `00_INBOX` | Quick captures, unsorted notes |
| `10_SOURCES` | Literature notes, references |
| `20_ZETTLEKASTEN` | Atomic permanent notes |
| `30_PROJECTS` | Active project notes |
| `40_TAGS` | Tag index notes |
| `50_MOC` | Maps of Content |
| `60_TEMPLATES` | Note templates |
| `70_ASSETS` | Images, attachments |
| `80_JOURNALS` | Daily/Weekly/Monthly/Quarterly/Yearly |
| `90_BOARDS` | Kanban/board views |
| `100_IDEAS` | Idea notes |
| `110_BUNDLES` | Assembled bundles for export |

---

## Limitations (v0.2.2)

The CLI is lightweight. These features are **NOT available**:
- No `backlinks`, `links`, `orphans`, `deadends`, `unresolved` commands
- No `tags`, `tasks` commands
- No `templates`, `template:read`, `template:insert` commands
- No `history`, `diff`, `history:restore` commands
- No `files`, `folders`, `wordcount`, `recents` commands
- No `daily:read`, `daily:append`, `daily:prepend` commands
- No `--copy` flag
- No `key=value` parameter syntax — use positional args and flags only

**Workarounds:**
- To read daily note: find the file in `80_JOURNALS/` and use `print`
- To append to daily: find the file and use `create "<path>" -c "content" -a`
- To list files/folders: use Bash `ls` on the vault path
- To search content when Obsidian is closed: use the Read tool directly on vault files
- For backlinks, tags, tasks: use the Obsidian app directly or search vault files with grep/Read

---

## Safety Rules

1. **Confirm before destructive ops.** Before delete, move, or overwrite (`-o`) — state the action and ask the user to confirm.
2. **Read before edit.** Always `print` a note before modifying it with append to understand current state.
3. **No binary files.** Only operate on `.md` files through the CLI.
4. **Check existence before create.** Use `print` to check if a note exists before creating (it will error if not found).
5. **Respect skill boundaries.** Route to research-papers, zettelkasten, deep-work, or idea-queue when appropriate.

---

## Fallback: Direct File Access

When `obsidian-cli` commands fail (Obsidian not running, CLI limitations), fall back to direct file operations on the vault path:

```
$VAULT/
```

- Use the **Read** tool to read vault files directly
- Use the **Edit** tool for targeted edits to vault files (better for long content than CLI append)
- Use **Bash `ls`** to list vault folders and files

The CLI is preferred for fuzzy name matching and link-aware moves, but direct file access is a reliable fallback.

---

## Quick Reference

| Action | Command |
|--------|---------|
| Read note | `obsidian-cli print "Note Name" 2>/dev/null` |
| Create note | `obsidian-cli create "folder/Note" -c "content" 2>/dev/null` |
| Append to note | `obsidian-cli create "Note" -c "content" -a 2>/dev/null` |
| Open in Obsidian | `obsidian-cli open "Note" 2>/dev/null` |
| Fuzzy search + open | `obsidian-cli search "query" 2>/dev/null` |
| Search content | `obsidian-cli search-content "term" 2>/dev/null` |
| Move / rename | `obsidian-cli move "Source" "Destination" 2>/dev/null` |
| Delete | `obsidian-cli delete "Note" 2>/dev/null` |
| View frontmatter | `obsidian-cli frontmatter "Note" --print 2>/dev/null` |
| Edit frontmatter | `obsidian-cli frontmatter "Note" --edit --key "k" --value "v" 2>/dev/null` |
| Daily note | `obsidian-cli daily 2>/dev/null` |
| Vault info | `obsidian-cli print-default 2>/dev/null` |

---

## Integration with Other Skills

| User Intent | Route To | Why |
|-------------|----------|-----|
| "Research papers about X" | `research-papers` | Deep-decode with literature template |
| "Process my source notes into zettels" | `zettelkasten` | Runs the zettel processing pipeline |
| "Think through / analyze / plan X" | `deep-work` | In-session thinking with full note output |
| "Add idea to queue" | `idea-queue` | Structured idea capture |
| Everything else vault-related | This skill | CRUD, search, frontmatter, daily |
