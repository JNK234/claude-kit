---
name: github-ops
description: Full GitHub operations via gh CLI. Use when the user says "create a PR", "list issues", "check CI", "merge PR", "create repo", "search code", "view workflow runs", "create release", "manage secrets", "list PRs", "review PR", "close issue", "fork repo", "run workflow", "download artifact", "create gist", "manage labels". Triggers on any GitHub interaction request.
---

# GitHub Operations

Full PR, issue, repo, workflow, search, release, and config operations via the `gh` CLI.

**Tool:** `gh` via Bash
**Auth:** Logged in via `gh auth login` (or GITHUB_TOKEN)
**Cross-cutting flags:**
- `--json <fields> --jq '<expr>'` — structured output + filtering
- `--repo owner/repo` or `-R owner/repo` — target a specific repo (omit for current repo)
- `--web` or `-w` — open in browser instead of CLI output
- `--limit <n>` — cap list results (default varies by command)

---

## PR Operations

```bash
# Create PR (interactive prompts for title/body/base)
gh pr create

# Create with all options
gh pr create --title "Fix bug" --body "Description" --base main --head feature-branch --reviewer user1,user2 --assignee @me --label bug --draft

# List PRs
gh pr list
gh pr list --state all --author @me --label "bug" --json number,title,state --jq '.[] | "\(.number) \(.title)"'

# View PR details
gh pr view 123
gh pr view 123 --json title,body,reviews,checks,mergeable

# Checkout PR locally
gh pr checkout 123

# Merge PR
gh pr merge 123 --squash --delete-branch
gh pr merge 123 --merge
gh pr merge 123 --rebase

# Review PR
gh pr review 123 --approve
gh pr review 123 --request-changes --body "Needs fixes"
gh pr review 123 --comment --body "Looks good overall"

# Diff
gh pr diff 123

# Check CI status
gh pr checks 123
gh pr checks 123 --watch

# Close PR
gh pr close 123

# Edit PR
gh pr edit 123 --title "New title" --add-label "priority" --add-reviewer user1

# Comment on PR
gh pr comment 123 --body "Comment text"

# Mark as ready (remove draft)
gh pr ready 123

# Update branch (merge base into PR branch)
gh pr update-branch 123
```

---

## Issue Operations

```bash
# Create issue
gh issue create --title "Bug report" --body "Description" --label bug --assignee @me

# List issues
gh issue list
gh issue list --state all --assignee @me --label "bug" --json number,title,state

# View issue
gh issue view 456
gh issue view 456 --json title,body,comments,labels

# Close issue
gh issue close 456

# Reopen issue
gh issue reopen 456

# Edit issue
gh issue edit 456 --title "Updated title" --add-label "priority"

# Comment on issue
gh issue comment 456 --body "Comment text"

# Delete issue
gh issue delete 456 --yes

# Create branch from issue
gh issue develop 456 --checkout

# Pin/unpin issue
gh issue pin 456
gh issue unpin 456

# Assign
gh issue edit 456 --add-assignee user1

# Label
gh issue edit 456 --add-label "enhancement" --remove-label "bug"
```

---

## Repo Operations

```bash
# Create repo
gh repo create my-repo --public --clone
gh repo create my-repo --private --description "My project" --clone

# Clone repo
gh repo clone owner/repo
gh repo clone owner/repo -- --depth 1

# Fork repo
gh repo fork owner/repo --clone

# View repo info
gh repo view
gh repo view owner/repo --json name,description,url,defaultBranchRef

# List repos
gh repo list
gh repo list owner --json name,isPrivate,updatedAt --limit 50

# Delete repo (DANGEROUS — always confirm with user)
gh repo delete owner/repo --yes

# Rename repo
gh repo rename new-name

# Archive repo
gh repo archive owner/repo --yes

# Edit repo
gh repo edit --description "New description" --visibility public

# Sync fork with upstream
gh repo sync owner/fork-repo
```

---

## Workflow / CI Operations

```bash
# List workflows
gh workflow list

# View workflow details
gh workflow view "CI"

# Trigger workflow run
gh workflow run "CI" --ref main
gh workflow run "CI" -f param1=value1 -f param2=value2

# List workflow runs
gh run list
gh run list --workflow "CI" --status failure --json databaseId,status,conclusion

# View run details
gh run view 12345
gh run view 12345 --log
gh run view 12345 --log-failed

# Watch run in progress
gh run watch 12345

# Rerun failed run
gh run rerun 12345 --failed

# Cancel run
gh run cancel 12345

# Download artifacts
gh run download 12345
gh run download 12345 -n "artifact-name" -D ./output/
```

---

## Search Operations

```bash
# Search repos
gh search repos "keyword" --language python --sort stars --limit 20

# Search issues
gh search issues "bug" --repo owner/repo --state open --json number,title,url

# Search PRs
gh search prs "fix" --repo owner/repo --state merged

# Search code
gh search code "functionName" --repo owner/repo --json path,textMatches
gh search code "import pandas" --language python --limit 10

# Search commits
gh search commits "fix typo" --repo owner/repo --json sha,message
```

---

## Release Operations

```bash
# Create release
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes"
gh release create v1.0.0 --generate-notes
gh release create v1.0.0 ./dist/*.tar.gz --title "v1.0.0"

# Create draft release
gh release create v1.0.0 --draft --title "v1.0.0"

# List releases
gh release list

# View release
gh release view v1.0.0

# Delete release (confirm with user first)
gh release delete v1.0.0 --yes

# Edit release
gh release edit v1.0.0 --title "Updated title" --notes "Updated notes"

# Upload assets to existing release
gh release upload v1.0.0 ./dist/*.tar.gz

# Download release assets
gh release download v1.0.0 -D ./downloads/
gh release download v1.0.0 -p "*.tar.gz"
```

---

## Config Operations

### Secrets

```bash
# Set repo secret
gh secret set SECRET_NAME --body "secret-value"
gh secret set SECRET_NAME < secret-file.txt

# List secrets
gh secret list

# Delete secret
gh secret delete SECRET_NAME

# Environment secrets
gh secret set SECRET_NAME --env production --body "value"
gh secret list --env production
```

### Variables

```bash
# Set variable
gh variable set VAR_NAME --body "value"

# List variables
gh variable list

# Delete variable
gh variable delete VAR_NAME
```

### Labels

```bash
# Create label
gh label create "priority:high" --color FF0000 --description "High priority"

# List labels
gh label list

# Edit label
gh label edit "bug" --color 00FF00

# Delete label
gh label delete "obsolete" --yes
```

### Gists

```bash
# Create gist
gh gist create file.py --desc "Description" --public
gh gist create file1.py file2.py --desc "Multi-file gist"

# List gists
gh gist list

# View gist
gh gist view GIST_ID

# Edit gist
gh gist edit GIST_ID

# Delete gist
gh gist delete GIST_ID
```

---

## Raw API Access

For operations not covered by built-in commands, use `gh api` directly.

```bash
# REST GET
gh api repos/owner/repo

# REST POST
gh api repos/owner/repo/issues --method POST -f title="Bug" -f body="Details"

# REST with JSON output + jq
gh api repos/owner/repo/pulls --jq '.[].title'

# Paginated results
gh api repos/owner/repo/issues --paginate --jq '.[].title'

# GraphQL
gh api graphql -f query='
  query {
    repository(owner: "owner", name: "repo") {
      issues(first: 10, states: OPEN) {
        nodes { title number }
      }
    }
  }
'
```

For advanced API patterns, see `references/gh-advanced.md`.

---

## Safety Rules

1. **Confirm before destructive ops.** Before `repo delete`, `release delete`, `issue delete`, `pr close`, `run cancel` — state the action and ask the user to confirm.
2. **Never force-push.** If a PR merge requires force-push, warn the user and get explicit approval.
3. **Check CI before merge.** Always run `gh pr checks` before `gh pr merge` unless user explicitly says to skip.
4. **Draft PRs for WIP.** When creating PRs for work in progress, use `--draft`.
5. **Prefer squash merge.** Default to `--squash` for merge unless user specifies otherwise.
6. **Respect repo context.** Use `-R owner/repo` when operating on repos other than the current directory's repo.

---

## Quick Reference

| Action | Command |
|--------|---------|
| Create PR | `gh pr create --title "..." --body "..."` |
| List PRs | `gh pr list` |
| View PR | `gh pr view 123` |
| Merge PR | `gh pr merge 123 --squash --delete-branch` |
| Check CI | `gh pr checks 123` |
| Create issue | `gh issue create --title "..." --body "..."` |
| List issues | `gh issue list` |
| Close issue | `gh issue close 456` |
| Clone repo | `gh repo clone owner/repo` |
| Create repo | `gh repo create name --public --clone` |
| List workflows | `gh workflow list` |
| View run logs | `gh run view ID --log-failed` |
| Search code | `gh search code "query" --repo owner/repo` |
| Create release | `gh release create v1.0 --generate-notes` |
| Set secret | `gh secret set NAME --body "value"` |
| Create gist | `gh gist create file.py --public` |
| Raw API call | `gh api repos/owner/repo --jq '.field'` |
