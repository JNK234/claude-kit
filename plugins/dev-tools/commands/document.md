# Document Command

Generate comprehensive, human-readable documentation that explains functionality and intent in plain English, not just code structure.

## Task
Create clear, educational documentation that helps users understand what the code does, why it exists, and how to use it - focusing on intent and functionality rather than implementation details.

## Process

### Phase 1: Scope Identification
1. **Parse Input**
   - Extract target from $ARGUMENTS (file path, directory, or codebase section)
   - Determine documentation scope:
     - Single file/function
     - Module/component
     - Entire codebase
   - Identify documentation type needed:
     - API documentation
     - User guide
     - Architecture overview
     - Tool usage guide

### Phase 2: Code Analysis & Understanding
2. **Deep Code Exploration**
   - Use `mcp__serena__list_dir` to:
     - Map project structure
     - Identify key directories
     - Understand organization
   
   - Use `mcp__serena__get_symbols_overview` to:
     - Map all functions, classes, interfaces
     - Understand code architecture
     - Identify entry points and main components
   
   - Use `mcp__serena__find_symbol` and `mcp__serena__find_referencing_symbols` to:
     - Trace function relationships
     - Understand data flow
     - Map dependencies
   
   - Use `Read` to examine:
     - README files for context
     - Configuration files for setup
     - Test files to understand expected behavior

3. **Intent & Purpose Analysis**
   - Use `mcp__zen__analyze` with analysis_type="general" to:
     - Understand the "why" behind the code
     - Identify business logic
     - Determine user problems being solved
     - Extract core functionality
   
   - Analyze patterns to determine:
     - Design patterns used
     - Architectural decisions
     - Trade-offs made
     - Performance considerations

4. **Behavior Extraction**
   - Use `mcp__serena__search_for_pattern` to find:
     - Error handling patterns
     - Input validation
     - Output formats
     - Edge cases handled
   
   - From test files, extract:
     - Expected inputs and outputs
     - Success scenarios
     - Failure scenarios
     - Performance expectations

### Phase 3: Documentation Generation
5. **Structure Creation**
   - Use `mcp__zen__docgen` to:
     - Generate initial documentation structure
     - Extract function signatures
     - Identify public APIs
   
   - Organize content into sections:
     - **Overview**: What this does and why it exists
     - **Core Concepts**: Key ideas users need to understand
     - **Architecture**: How components work together
     - **Usage**: How to use it effectively
     - **Examples**: Real-world usage scenarios

6. **Human-Readable Content Generation**
   - Transform technical details into plain English:
     - Replace jargon with simple explanations
     - Use analogies for complex concepts
     - Focus on "what" and "why", not "how"
   - Create narrative flow:
     - Start with the big picture
     - Gradually introduce details
     - Connect concepts logically
   
   - For each function/component, explain:
     - **Purpose**: Why does this exist?
     - **When to use**: In what scenarios?
     - **Inputs**: What information does it need?
     - **Outputs**: What does it produce?
     - **Side effects**: What else happens?
     - **Limitations**: What can't it do?

7. **Usage Examples Creation**
   - For tools and libraries, provide:
     ```
     ## Quick Start
     [Simple example to get started]
     
     ## Common Use Cases
     ### Scenario 1: [Description]
     ```[language]
     // Minimal code example
     ```
     
     ### Scenario 2: [Description]
     ```[language]
     // Another practical example
     ```
     
     ## Advanced Usage
     [More complex scenarios]
     ```
   
   - Examples should be:
     - Minimal but complete
     - Copy-paste ready
     - Well-commented
     - Show best practices

### Phase 4: Documentation Refinement
8. **Content Enhancement**
   - Use `WebSearch` to:
     - Find best practices for similar tools
     - Gather common user questions
     - Identify typical pain points
   
   - Use `mcp__context7__get-library-docs` for:
     - Framework-specific conventions
     - Standard documentation patterns
     - Industry terminology

9. **Clarity Optimization**
   - Review generated documentation for:
     - Technical accuracy
     - Readability (aim for 8th-grade level)
     - Completeness
     - Logical flow
   
   - Ensure documentation answers:
     - What does this do?
     - Why would I use it?
     - When should I use it?
     - How do I use it?
     - What should I watch out for?

### Phase 5: Output Generation
10. **Format & Save Documentation**
    - Use `Write` to create documentation file:
      - Save to: `docs/[component]-documentation.md`
      - Or append to existing docs
    
    - Standard format:
      ```markdown
      # [Component Name]
      
      ## What It Does
      [Plain English explanation of functionality]
      
      ## Why It Exists
      [Business problem or user need it solves]
      
      ## Core Concepts
      [Key ideas explained simply]
      
      ## How It Works
      [High-level flow, no code details]
      
      ## Usage Guide
      ### Getting Started
      [Step-by-step instructions]
      
      ### Examples
      [Code examples ONLY where needed]
      
      ### Common Patterns
      [Typical usage scenarios]
      
      ## API Reference
      [If applicable - function list with descriptions]
      
      ## Troubleshooting
      [Common issues and solutions]
      
      ## Related Components
      [Links to related documentation]
      ```

11. **Documentation Types**
    - Based on input, generate appropriate type:
      - **README**: Project overview and quick start
      - **API Docs**: Function references with examples
      - **User Guide**: Task-oriented instructions
      - **Architecture Doc**: System design explanation
      - **Migration Guide**: Upgrade instructions
      - **Tutorial**: Step-by-step learning path

## Arguments
- $ARGUMENTS: Target to document
  - File path: `src/auth/login.js`
  - Directory: `src/components/`
  - Section: `authentication-module`
  - Scope: `entire-codebase`

## Expected Output
1. Human-readable documentation in plain English
2. Focus on functionality and intent, not implementation
3. Clear usage examples where appropriate
4. Educational content that builds understanding
5. Saved to appropriate documentation location

## Quality Criteria
- **Clarity**: Can a non-developer understand what this does?
- **Completeness**: Are all important aspects covered?
- **Accuracy**: Is the explanation correct?
- **Usefulness**: Does it help users accomplish tasks?
- **Maintainability**: Is it easy to update?

## Notes
- Prioritize understanding over technical details
- Use simple language and avoid jargon
- Include code examples ONLY for usage demonstration
- Focus on the "what" and "why", minimize the "how"
- Make documentation educational, not just descriptive
- Consider the reader's perspective and knowledge level