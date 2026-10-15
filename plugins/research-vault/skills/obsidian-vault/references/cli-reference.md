# Obsidian CLI — Complete Command Reference

Output of `obsidian help` from Obsidian 1.12.4 with Catalyst license.

## Syntax

```
obsidian [command] [parameter=value]... [flag]... [--copy]
```

- `file=<name>` — fuzzy match (like wikilinks)
- `path=<path>` — exact path from vault root
- `vault=<name>` — target specific vault
- `--copy` — copy output to clipboard
- `\n` for newline, `\t` for tab in content values

---

## File Operations

### create — Create a new file
- `name=<name>` — File name
- `path=<path>` — File path
- `content=<text>` — Initial content
- `template=<name>` — Template to use
- `overwrite` — Overwrite if file exists
- `open` — Open file after creating
- `newtab` — Open in new tab

### read — Read file contents
- `file=<name>` — File name
- `path=<path>` — File path

### append — Append content to a file
- `file=<name>` / `path=<path>` — Target file
- `content=<text>` — Content to append (required)
- `inline` — Append without newline

### prepend — Prepend content to a file
- `file=<name>` / `path=<path>` — Target file
- `content=<text>` — Content to prepend (required)
- `inline` — Prepend without newline

### delete — Delete a file
- `file=<name>` / `path=<path>` — Target file
- `permanent` — Skip trash, delete permanently

### move — Move or rename a file
- `file=<name>` / `path=<path>` — Source file
- `to=<path>` — Destination folder or path (required)

### rename — Rename a file
- `file=<name>` / `path=<path>` — Target file
- `name=<name>` — New file name (required)

### open — Open a file
- `file=<name>` / `path=<path>` — Target file
- `newtab` — Open in new tab

### file — Show file info
- `file=<name>` / `path=<path>` — Target file

### files — List files in the vault
- `folder=<path>` — Filter by folder
- `ext=<extension>` — Filter by extension
- `total` — Return file count

### folders — List folders in the vault
- `folder=<path>` — Filter by parent folder
- `total` — Return folder count

### folder — Show folder info
- `path=<path>` — Folder path (required)
- `info=files|folders|size` — Return specific info only

### unique — Create unique note
- `name=<text>` — Note name
- `content=<text>` — Initial content
- `open` — Open file after creating

---

## Search

### search — Search vault for text
- `query=<text>` — Search query (required)
- `path=<folder>` — Limit to folder
- `limit=<n>` — Max files
- `total` — Return match count
- `case` — Case sensitive
- `format=text|json` — Output format

### search:context — Search with matching line context
- `query=<text>` — Search query (required)
- `path=<folder>` — Limit to folder
- `limit=<n>` — Max files
- `case` — Case sensitive
- `format=text|json` — Output format

### search:open — Open search view in Obsidian GUI
- `query=<text>` — Initial search query

---

## Daily / Periodic Notes

### daily — Open daily note
### daily:read — Read daily note contents
### daily:path — Get daily note path
### daily:append — Append content to daily note
- `content=<text>` — Content to append (required)
- `inline` — Append without newline
- `open` — Open file after adding

### daily:prepend — Prepend content to daily note
- `content=<text>` — Content to prepend (required)
- `inline` — Prepend without newline
- `open` — Open file after adding

---

## Tasks

### tasks — List tasks in the vault
- `file=<name>` / `path=<path>` — Filter by file
- `total` — Return task count
- `done` — Show completed tasks
- `todo` — Show incomplete tasks
- `status="<char>"` — Filter by status character
- `verbose` — Group by file with line numbers
- `format=json|tsv|csv` — Output format
- `active` — Tasks for active file
- `daily` — Tasks from daily note

### task — Show or update a task
- `ref=<path:line>` — Task reference
- `file=<name>` / `path=<path>` — File
- `line=<n>` — Line number
- `toggle` — Toggle task status
- `done` — Mark as done
- `todo` — Mark as todo
- `daily` — Use daily note
- `status="<char>"` — Set status character

---

## Templates

### templates — List templates
- `total` — Return template count

### template:read — Read template content
- `name=<template>` — Template name (required)
- `resolve` — Resolve template variables
- `title=<title>` — Title for variable resolution

### template:insert — Insert template into active file
- `name=<template>` — Template name (required)

---

## Tags

### tags — List tags in the vault
- `file=<name>` / `path=<path>` — Filter by file
- `total` — Return tag count
- `counts` — Include tag counts
- `sort=count` — Sort by count
- `format=json|tsv|csv` — Output format
- `active` — Tags for active file

### tag — Get tag info
- `name=<tag>` — Tag name (required)
- `total` — Return occurrence count
- `verbose` — Include file list and count

---

## Knowledge Graph

### backlinks — List backlinks to a file
- `file=<name>` / `path=<path>` — Target file
- `counts` — Include link counts
- `total` — Return backlink count
- `format=json|tsv|csv` — Output format

### links — List outgoing links from a file
- `file=<name>` / `path=<path>` — Target file
- `total` — Return link count

### orphans — List files with no incoming links
- `total` — Return orphan count
- `all` — Include non-markdown files

### deadends — List files with no outgoing links
- `total` — Return dead-end count
- `all` — Include non-markdown files

### unresolved — List unresolved links in vault
- `total` — Return unresolved link count
- `counts` — Include link counts
- `verbose` — Include source files
- `format=json|tsv|csv` — Output format

---

## Properties (Frontmatter)

### properties — List properties in the vault
- `file=<name>` / `path=<path>` — Filter by file
- `name=<name>` — Get specific property count
- `total` — Return property count
- `sort=count` — Sort by count
- `counts` — Include occurrence counts
- `format=yaml|json|tsv` — Output format

### property:read — Read a property value
- `name=<name>` — Property name (required)
- `file=<name>` / `path=<path>` — Target file

### property:set — Set a property on a file
- `name=<name>` — Property name (required)
- `value=<value>` — Property value (required)
- `type=text|list|number|checkbox|date|datetime` — Property type
- `file=<name>` / `path=<path>` — Target file

### property:remove — Remove a property from a file
- `name=<name>` — Property name (required)
- `file=<name>` / `path=<path>` — Target file

---

## Version History

### history — List file history versions
- `file=<name>` / `path=<path>` — Target file

### history:list — List files with history
### history:read — Read a file history version
- `file=<name>` / `path=<path>` — Target file
- `version=<n>` — Version number (default: 1)

### history:restore — Restore a file history version
- `file=<name>` / `path=<path>` — Target file
- `version=<n>` — Version number (required)

### history:open — Open file recovery
- `file=<name>` / `path=<path>` — Target file

### diff — List or diff versions
- `file=<name>` / `path=<path>` — Target file
- `from=<n>` — Version number to diff from
- `to=<n>` — Version number to diff to
- `filter=local|sync` — Filter by version source

---

## Bookmarks

### bookmark — Add a bookmark
- `file=<path>` — File to bookmark
- `subpath=<subpath>` — Subpath within file
- `folder=<path>` — Folder to bookmark
- `search=<query>` — Search query to bookmark
- `url=<url>` — URL to bookmark
- `title=<title>` — Bookmark title

### bookmarks — List bookmarks
- `total` — Return bookmark count
- `verbose` — Include bookmark types
- `format=json|tsv|csv` — Output format

---

## Bases (Databases)

### bases — List all base files in vault
### base:create — Create a new item in a base
- `file=<name>` / `path=<path>` — Base file
- `view=<name>` — View name
- `name=<name>` — New file name
- `content=<text>` — Initial content

### base:query — Query a base and return results
- `file=<name>` / `path=<path>` — Base file
- `view=<name>` — View name
- `format=json|csv|tsv|md|paths` — Output format

### base:views — List views in the current base file

---

## Aliases

### aliases — List aliases in the vault
- `file=<name>` / `path=<path>` — Filter by file
- `total` — Return alias count
- `verbose` — Include file paths
- `active` — Aliases for active file

---

## Navigation

### recents — List recently opened files
- `total` — Return recent file count

### random — Open a random note
- `folder=<path>` — Limit to folder
- `newtab` — Open in new tab

### random:read — Read a random note
- `folder=<path>` — Limit to folder

### tabs — List open tabs
- `ids` — Include tab IDs

### tab:open — Open a new tab

---

## Plugins

### plugins — List installed plugins
- `filter=core|community` — Filter by type
- `versions` — Include version numbers
- `format=json|tsv|csv` — Output format

### plugins:enabled — List enabled plugins
### plugin — Get plugin info (`id=<plugin-id>`)
### plugin:enable / plugin:disable — Toggle plugin
### plugin:install / plugin:uninstall — Manage community plugins
### plugin:reload — Reload a plugin (dev)
### plugins:restrict — Toggle restricted mode

---

## Themes & Snippets

### themes — List installed themes
### theme — Show active theme
### theme:set — Set active theme (`name=<name>`)
### theme:install / theme:uninstall — Manage themes
### snippets / snippets:enabled — List CSS snippets
### snippet:enable / snippet:disable — Toggle snippet

---

## Vault Management

### vault — Show vault info
- `info=name|path|files|folders|size` — Return specific info

### vaults — List known vaults
### reload — Reload the vault
### restart — Restart the app
### version — Show Obsidian version
### wordcount — Count words and characters
### workspace — Show workspace tree
### commands — List available command IDs
### command — Execute an Obsidian command (`id=<command-id>`)
### hotkeys / hotkey — List/get hotkeys
### outline — Show headings for a file

---

## Developer Commands

### eval — Execute JavaScript (`code=<javascript>`)
### devtools — Toggle Electron dev tools
### dev:screenshot — Take screenshot (`path=<filename>`)
### dev:dom — Query DOM elements (`selector=<css>`)
### dev:css — Inspect CSS with source locations
### dev:cdp — Run Chrome DevTools Protocol command
### dev:console — Show captured console messages
### dev:errors — Show captured errors
### dev:debug — Attach/detach debugger
### dev:mobile — Toggle mobile emulation
