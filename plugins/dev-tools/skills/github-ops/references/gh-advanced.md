# gh CLI Advanced Patterns

## Structured Output with --json and --jq

Most `gh` list/view commands support `--json` for structured output and `--jq` for filtering.

```bash
# Get specific fields as JSON
gh pr list --json number,title,author,createdAt

# Filter with jq expressions
gh pr list --json number,title,state --jq '.[] | select(.state == "OPEN") | "\(.number): \(.title)"'

# Count items
gh issue list --json number --jq 'length'

# Get unique authors
gh pr list --json author --jq '[.[].author.login] | unique | .[]'

# Sort by date
gh pr list --json number,title,updatedAt --jq 'sort_by(.updatedAt) | reverse | .[] | "\(.number) \(.title)"'
```

### Available JSON fields by command

```bash
# Discover available fields
gh pr list --json help
gh issue list --json help
gh repo list --json help
gh run list --json help
```

---

## Go Template Formatting

Alternative to `--jq`, uses Go templates via `--template`.

```bash
# Table format
gh pr list --json number,title,author --template '{{range .}}{{.number}}{{"\t"}}{{.title}}{{"\t"}}{{.author.login}}{{"\n"}}{{end}}'

# Conditional formatting
gh pr list --json number,title,isDraft --template '{{range .}}{{if .isDraft}}DRAFT {{end}}#{{.number}} {{.title}}{{"\n"}}{{end}}'
```

---

## Batch Operations

```bash
# Close all PRs by a bot
gh pr list --author "dependabot[bot]" --json number --jq '.[].number' | xargs -I{} gh pr close {}

# Label all open issues matching a search
gh issue list --search "bug" --json number --jq '.[].number' | xargs -I{} gh issue edit {} --add-label "needs-triage"

# Rerun all failed workflow runs
gh run list --status failure --json databaseId --jq '.[].databaseId' | xargs -I{} gh run rerun {} --failed

# Bulk delete branches (merged PRs)
gh pr list --state merged --json headRefName --jq '.[].headRefName' | xargs -I{} git push origin --delete {}
```

---

## GraphQL Deep Patterns

```bash
# Get PR with review details
gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        title
        reviews(first: 10) {
          nodes {
            author { login }
            state
            body
          }
        }
        reviewRequests(first: 10) {
          nodes {
            requestedReviewer {
              ... on User { login }
              ... on Team { name }
            }
          }
        }
      }
    }
  }
' -F owner=owner -F repo=repo -F number=123

# Get repo branch protection rules
gh api graphql -f query='
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      branchProtectionRules(first: 10) {
        nodes {
          pattern
          requiresApprovingReviews
          requiredApprovingReviewCount
          requiresStatusChecks
          requiredStatusCheckContexts
        }
      }
    }
  }
' -F owner=owner -F repo=repo

# Get user contribution stats
gh api graphql -f query='
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
      }
    }
  }
' -F login=<your-github-login>
```

---

## REST API Patterns

```bash
# Create a check run
gh api repos/owner/repo/check-runs --method POST \
  -f name="custom-check" \
  -f head_sha="abc123" \
  -f status="completed" \
  -f conclusion="success"

# Get commit status
gh api repos/owner/repo/commits/HEAD/status --jq '.state'

# List repo topics
gh api repos/owner/repo/topics --jq '.names[]'

# Set repo topics
gh api repos/owner/repo/topics --method PUT -f 'names[]=python' -f 'names[]=cli'

# Get rate limit info
gh api rate_limit --jq '.resources.core | "Remaining: \(.remaining)/\(.limit)"'

# Download a file from a repo
gh api repos/owner/repo/contents/path/to/file --jq '.content' | base64 -d
```

---

## Pagination

```bash
# Auto-paginate all results
gh api repos/owner/repo/issues --paginate --jq '.[].title'

# Manual pagination with Link headers
gh api repos/owner/repo/issues?per_page=100&page=1

# Paginate GraphQL
gh api graphql --paginate -f query='
  query($endCursor: String) {
    repository(owner: "owner", name: "repo") {
      issues(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes { title number }
      }
    }
  }
'
```

---

## Environment and Config

```bash
# Check auth status
gh auth status

# Switch between accounts
gh auth switch

# Set default repo for current dir
gh repo set-default owner/repo

# Check current default
gh repo set-default --view

# Set editor
gh config set editor "code --wait"

# Set default browser
gh config set browser "open"

# Set pager
gh config set pager "less"
```
