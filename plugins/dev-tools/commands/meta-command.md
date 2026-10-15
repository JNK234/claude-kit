# Meta Command Creator

Read the requirements file at: $ARGUMENTS

Then follow these steps:

## 1. Parse Requirements
- Read and understand the requirements from the specified file
- Identify the main task/purpose
- Determine if it's project-specific or user-specific (ask if unclear)

## 2. Analyze Tools Needed
Based on the requirements, select the most appropriate tools from these categories:

### File Operations
- `Read`, `Write`, `Edit`, `MultiEdit` - For file manipulation
- `Glob`, `Grep`, `LS` - For file searching and listing

### Code Analysis & AI Tools
- `mcp__zen__codereview` - Code review and quality analysis
- `mcp__zen__debug` - Debugging and root cause analysis
- `mcp__zen__refactor` - Code refactoring suggestions
- `mcp__zen__testgen` - Test generation
- `mcp__zen__analyze` - General code analysis
- `mcp__zen__secaudit` - Security auditing
- `mcp__zen__docgen` - Documentation generation

### Development Tools
- `Bash` - Command execution
- `mcp__github__*` - GitHub operations
- `mcp__playwright__*` - Browser automation
- `TodoWrite` - Task management

### Research & Information
- `WebSearch`, `WebFetch` - Web information gathering
- `mcp__firecrawl__*` - Advanced web scraping
- `mcp__context7__*` - Library documentation

### AI Communication
- `mcp__zen__chat` - AI model interaction
- `mcp__zen__consensus` - Multi-model consensus
- `mcp__zen__planner` - Task planning

## 3. Generate Command

Create a custom slash command with:
- **Name**: Short, descriptive (e.g., `review-security`, `fix-tests`, `analyze-performance`)
- **Location**: Ask user - `.claude/commands/` (project) or `~/.claude/commands/` (personal)
- **Content**: Clear instructions using selected tools

## 4. Command Template

Generate the command following this structure:

```markdown
# [Command Purpose]

[Brief description of what this command does]

## Task
[Main objective from requirements]

## Process

1. [First step with tool usage]
   - Use `[ToolName]` to [action]
   
2. [Second step]
   - Use `[ToolName]` to [action]

3. [Continue with steps...]

## Arguments (if needed)
- $ARGUMENTS can be used for: [explain usage]

## Expected Output
[What the user should expect]
```

## 5. Save Command

1. Ask user for command location preference:
   - Project-specific: `.claude/commands/[name].md`
   - Personal/global: `~/.claude/commands/[name].md`

2. Create the command file with appropriate name

3. Inform user how to use: `/[command-name] [arguments if any]`

## Example

If requirements file contains:
"I need to review all TypeScript files for security issues and generate a report"

Generate command like:
- Name: `security-scan`
- Tools: `Glob` (find TS files), `mcp__zen__secaudit` (security audit), `Write` (report)
- Location: Ask user preference

Remember: Keep it simple, focused on the task, and use only necessary tools!