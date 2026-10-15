# Implement Command

Execute implementation plans using Test-Driven Development with automated testing, commits, and progress tracking.

## Task
Transform a plan file into working code using TDD methodology, with automatic GitHub repository setup, test generation, implementation, validation, and progress tracking.

## Process

### Phase 1: Setup & Initialization
1. **Parse Plan File**
   - Read plan file from $ARGUMENTS
   - Use `Read` to load the plan document
   - Extract task list and tech stack decisions
   - Identify dependencies and task order
   - Create implementation roadmap

2. **Repository Setup**
   - Use `Bash` to check if git repository exists
   - If not, use `mcp__github__create_repository` to:
     - Create new GitHub repository
     - Set up initial structure
     - Add README with project overview
   - Use `Bash` to:
     - Initialize git if needed
     - Set remote origin
     - Create initial commit

3. **Task Management Setup**
   - Use `TodoWrite` to create task list from plan
   - Mark all tasks as "pending"
   - Set first task as "in_progress"
   - Track: Task name, Test status, Implementation status, Commit status

### Phase 2: TDD Implementation Loop (Per Task)

4. **Task Analysis**
   - Read current task from plan
   - Use `mcp__zen__analyze` to:
     - Understand requirements deeply
     - Identify edge cases
     - Define success criteria
   - Determine:
     - Input/output specifications
     - Error handling requirements
     - Performance constraints

5. **Test Generation (RED Phase)**
   - Use `mcp__zen__testgen` with:
     - Task requirements as input
     - Tech stack from plan
     - Existing test patterns from codebase
   - Generate comprehensive test cases:
     - Happy path tests
     - Edge case tests
     - Error handling tests
     - Integration tests if needed
   - Use `Write` or `MultiEdit` to create test files
   - Use `Bash` to run tests and confirm they FAIL
   - If tests don't fail, revise until they do

6. **Implementation (GREEN Phase)**
   - Use `mcp__context7__get-library-docs` for:
     - Framework documentation
     - Best practices
     - Code examples
   - Use `Write`, `Edit`, or `MultiEdit` to:
     - Implement minimum code to pass tests
     - Follow tech stack decisions from plan
     - Match existing code patterns
   - Use `Bash` to run tests repeatedly:
     - Fix compilation errors
     - Address test failures
     - Continue until ALL tests pass

7. **Refactoring (REFACTOR Phase)**
   - Once tests pass, use `mcp__zen__refactor` to:
     - Identify code smells
     - Suggest improvements
     - Optimize performance
   - Apply refactoring suggestions while ensuring:
     - Tests still pass after each change
     - Code follows project patterns
     - No over-engineering

8. **Validation & Quality Checks**
   - Use `Bash` to run:
     - Linting: `npm run lint` or equivalent
     - Type checking: `npm run typecheck` or equivalent
     - Test coverage: `npm run coverage`
   - Use `mcp__zen__codereview` for:
     - Code quality assessment
     - Security check
     - Best practices validation
   - Fix any issues found

9. **Commit & Documentation**
   - Use `Bash` for git operations:
     - Stage test files: `git add tests/`
     - Commit tests: `git commit -m "test: add tests for [feature]"`
     - Stage implementation: `git add src/`
     - Commit implementation: `git commit -m "feat: implement [feature]"`
   - Push to GitHub: `git push origin main`

10. **Progress Update**
    - Use `Edit` to update plan file:
      - Mark current task as "✅ Completed"
      - Add completion timestamp
      - Note any deviations from plan
    - Use `TodoWrite` to:
      - Mark current task as "completed"
      - Set next task as "in_progress"
    - Use `Write` to update progress log:
      - Save to: `Logs/Implementation/progress-{feature}-{DD-MM}.md`
      - Include: Tests written, code implemented, issues encountered

### Phase 3: Task Transition

11. **Context Management**
    - After each task completion:
      - Save current context to `Logs/Implementation/context-task-{N}.md`
      - Include: Decisions made, patterns used, issues resolved
    - Use `/clear` command to:
      - Clear conversation context
      - Maintain fresh perspective for next task
    - Load next task from updated plan

12. **Next Task Setup**
    - Read updated plan file
    - Identify next pending task
    - Load relevant context from previous tasks
    - Return to Phase 2, Step 4

### Phase 4: Completion

13. **Final Validation**
    - When all tasks complete:
      - Use `Bash` to run full test suite
      - Run integration tests
      - Check code coverage
      - Verify all plan objectives met

14. **Project Documentation**
    - Use `mcp__zen__docgen` to:
      - Generate API documentation
      - Create usage examples
    - Update README with:
      - Setup instructions
      - Usage guide
      - Test commands

15. **Final Report**
    - Create completion report using `Write`:
      - Save to: `Logs/Implementation/completion-{feature}-{DD-MM}.md`
      - Include:
        - All tasks completed
        - Test coverage achieved
        - Performance metrics
        - Known issues/TODOs
        - Deviation from original plan

## Arguments
- $ARGUMENTS: Path to plan file (e.g., "Logs/Plans/plan-auth-08-10.md")

## Expected Output
1. GitHub repository created/updated
2. Test files for each task (failing first)
3. Implementation passing all tests
4. Clean git history with TDD commits
5. Updated plan file with progress
6. Progress logs and context files
7. Full test coverage report
8. Completion documentation

## Error Handling
- If tests won't pass after multiple attempts:
  - Use `mcp__zen__debug` to identify root cause
  - Document blocker in plan file
  - Ask user for guidance
- If context gets too large:
  - Save critical information before `/clear`
  - Reload only essential context for next task

## Notes
- Strict TDD: Tests MUST fail before implementation
- Each task gets two commits: tests, then implementation
- Context cleared between tasks for performance
- Plan file serves as single source of truth
- All progress tracked and documented
- Quality checks mandatory before task completion