# Lint Workflow

Health check the wiki. Find broken links, orphaned pages, contradictions, and gaps.

## When To Use

- "Check my wiki health"
- "Find orphaned notes"
- "What's broken in my knowledge base?"

## Steps

### 1. Inventory

Read `50_MOC/index.md` to get the list of all wiki pages. List all files in `50_MOC/topics/`, `50_MOC/comparisons/`, `50_MOC/ideas/`.

### 2. Check Each Wiki Page

For each wiki page:
- Read it
- Extract all `[[wikilinks]]`
- For each link, check if the target file exists (grep filename in `20_ZETTLEKASTEN/` or `50_MOC/`)
- Flag broken links

### 3. Find Orphans

For each wiki page, grep the vault for `[[page-name]]`. If zero other files link to it, it's orphaned. Report it.

### 4. Find Missing Pages

Grep all zettels for `[[wikilinks]]`. Count occurrences of each link target. If a target appears 3+ times but has no corresponding file, flag it as a missing page worth creating.

### 5. Check Freshness

For each topic page, compare its `Updated:` date against the `Created:` dates of zettels it links to. If zettels are newer than the topic page, the topic may be stale.

### 6. Report

Present findings to the user grouped by severity:
- **Broken links** — links pointing to nonexistent files
- **Orphans** — wiki pages nobody links to
- **Missing pages** — frequently referenced concepts with no page
- **Stale pages** — topic pages older than their linked zettels

Ask the user which issues to fix. Fix the ones they approve.
