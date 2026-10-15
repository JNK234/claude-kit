---
allowed-tools: Bash, Read, Agent, Glob, Grep
description: Load context for a new agent session by analyzing codebase structure, README, and recent git history. Optional argument: path to specifications and documentation directory.
---

# Prime

This command loads essential context for a new agent session by examining the codebase structure, reading the project README, understanding recent changes, worktree status, and GitHub state (issues, PRs, comments). You must only Read and Understand the code base and nothing else.

If an argument is provided ($1), it should be a path to specifications and documentation directory for the project/feature being developed.

IMPORTANT: NO WRITING CODE

## Subagent Usage

This skill can and should be delegated to an Explore subagent for parallel context loading. When invoked via subagent, the agent should gather all context below and return a comprehensive summary. Example:
```
Agent({
  subagent_type: "Explore",
  description: "Prime codebase context",
  prompt: "Run prime context loading for <project>. Gather: codebase structure, git history, worktree status, GitHub issues/PRs, README, and current branch state. Report comprehensive summary."
})
```

## Worktree Awareness

This skill works from any worktree, not just the main repo checkout. Always resolve the true git root and repo identity:
- Use `git rev-parse --show-toplevel` to find the current worktree root
- Use `git worktree list` to see all worktrees and their branches
- Use `git remote get-url origin` to identify the GitHub repo for `gh` commands
- If in a worktree, note which branch/worktree you are in and its relationship to main

## Instructions

### 1. Codebase Structure
- Run `git ls-files` to understand file organization
- Read README.md and CLAUDE.md for project purpose and guidelines

### 2. Recent Git History
- Analyze recent commits to understand what's been changing
- Check for uncommitted changes and untracked files

### 3. Worktree Status
- List all active worktrees with their branches and commit hashes
- Identify which worktrees correspond to open PRs
- Note any worktrees that may be stale (merged branches still checked out)

### 4. GitHub State (Issues, PRs, Comments)
- List open issues with labels (bugs vs enhancements vs other)
- List open PRs with branch names and status
- List recently merged PRs (last 10) for recent project velocity
- If currently on a branch with an open PR, fetch that PR's review comments
- IMPORTANT: If `gh` fails due to TLS/sandbox errors, retry with `dangerouslyDisableSandbox: true` — the sandbox network layer can interfere with `gh` TLS verification

### 5. Current Branch PR Context
- Detect if the current branch has an associated open PR
- If yes, fetch PR description, review comments, and CI status
- This helps understand the immediate work context

### 6. Summary
- Provide a concise overview covering: project purpose, architecture, current state, open work items, and immediate context

## Context
- Git root: !`git rev-parse --show-toplevel 2>/dev/null || echo "Not in a git repo"`
- Current branch: !`git branch --show-current 2>/dev/null || echo "Unknown"`
- Codebase structure: !`if git rev-parse --git-dir > /dev/null 2>&1; then git ls-files; else echo "Not a git repository"; fi`
- Recent commits (last 10): !`if git rev-parse --git-dir > /dev/null 2>&1; then git log --oneline -n 10; else echo "Not a git repository"; fi`
- Files changed recently: !`if git rev-parse --git-dir > /dev/null 2>&1; then git diff --name-status HEAD~5..HEAD 2>/dev/null || git diff --name-status $(git rev-list --max-parents=0 HEAD)..HEAD; else echo "Not a git repository"; fi`
- Summary of recent changes: !`if git rev-parse --git-dir > /dev/null 2>&1; then git diff --stat HEAD~5..HEAD 2>/dev/null || git diff --stat $(git rev-list --max-parents=0 HEAD)..HEAD; else echo "Not a git repository"; fi`
- Worktree status: !`git worktree list 2>/dev/null || echo "No worktrees or not a git repo"`
- Uncommitted changes: !`git status --short 2>/dev/null || echo "Not a git repo"`
- Remote URL: !`git remote get-url origin 2>/dev/null || echo "No origin remote"`
- Project README: @README.md
- Current Status: @CLAUDE.md
- Specification files: !`if [ -n "$1" ] && [ -d "$1" ]; then find "$1" -type f \( -name "*.md" -o -name "*.txt" -o -name "*.rst" \) | head -5; else echo "No spec path provided"; fi`