# Brainstorm Command

Comprehensive brainstorming session with deep thinking, multi-model consensus, and advanced web research.

IMPORTANT: You have to BRAINSTORM and RESEARCH - NO CODING or IMPLEMENTING.

## Task

Conduct an interactive brainstorming session on the topic provided in $ARGUMENTS, using deep thinking tools, multi-model consensus, and web research to generate comprehensive, actionable ideas.

## Process

### Phase 1: Understanding Requirements

1. **Parse the topic**

   - Extract the brainstorming topic from $ARGUMENTS
   - Identify key concepts and areas to explore
2. **Interactive Q&A Session**

   - Ask clarifying questions ONE BY ONE to understand:
     - Specific goals and objectives
     - Target audience or use case
     - Constraints or limitations
     - Desired outcomes
     - Any existing context or background
   - Wait for user responses between each question
   - Continue until you have a complete picture

### Phase 2: Deep Research & Thinking

3. **Web Research**

   - Use `WebSearch` for initial broad searches on the topic
   - Use `mcp__firecrawl__firecrawl_search` for deep web research with structured extraction
   - Use `mcp__firecrawl__firecrawl_deep_research` for comprehensive analysis of complex topics
   - Gather latest trends, best practices, and expert opinions
   - Extract relevant case studies and examples
4. **Sequential Thinking**

   - Use `mcp__sequential__sequentialthinking` to:
     - Break down the topic into logical components
     - Explore each component systematically
     - Generate hypotheses and validate them
     - Build upon each thought iteratively
   - Set total_thoughts based on complexity (10-20 for complex topics)
5. **Deep Analysis**

   - Use `mcp__zen__thinkdeep` with model="gemini-2.5-pro" for comprehensive investigation
   - Set thinking_mode="high" for complex topics
   - Focus areas should include:
     - Innovation opportunities
     - Potential challenges
     - Implementation strategies
     - Risk factors
     - Success metrics

### Phase 3: Multi-Model Consensus

6. **Red Team Discussion**

   - Use `mcp__zen__consensus` to get diverse perspectives
   - Configure models array with different stances:
     ```
     models: [
       {"model": "gemini-2.5-pro", "stance": "for"},
       {"model": "grok-3", "stance": "against"},
       {"model": "o3", "stance": "neutral"}
     ]
     ```
   - Synthesize agreements and disagreements
   - Identify strongest ideas with multi-model support
7. **Alternative Perspectives**

   - Use `mcp__zen__chat` with different models to explore:
     - Creative/unconventional approaches (use "gemini-2.5-flash")
     - Practical implementation details (use "o3")
     - Critical analysis and edge cases (use "grok-3")

### Phase 4: Synthesis & Documentation

8. **Compile Ideas**

   - Organize brainstormed ideas by:
     - Priority/Impact
     - Feasibility
     - Timeline
     - Resources required
   - Include supporting evidence from research
   - Note consensus points and areas of debate
9. **User Approval**

   - Present organized ideas to user
   - Ask for feedback and approval
   - Make any requested adjustments
   - Confirm final list of brainstormed ideas
10. **Save Documentation**

    - Create comprehensive documentation using `Write` tool
    - Save to: `Logs/Research/brainstorm-{topic}-{DD-MM}.md`
    - Format should include:
      ```markdown
      # Brainstorm: [Topic]
      Date: [DD-MM-YYYY]

      ## Executive Summary
      [Brief overview of key findings]

      ## Understanding & Context
      [User requirements and clarifications]

      ## Research Findings
      [Key insights from web research]

      ## Deep Analysis Results
      [Sequential thinking and deep analysis outcomes]

      ## Multi-Model Perspectives
      [Consensus and divergent views]

      ## Final Ideas & Recommendations
      ### High Priority
      [Detailed actionable items]

      ### Medium Priority
      [Secondary ideas]

      ### Future Considerations
      [Long-term possibilities]

      ## Implementation Roadmap
      [Step-by-step plan for execution]

      ## Resources & References
      [Links and sources]
      ```

## Arguments

- $ARGUMENTS: The brainstorming topic or detailed requirements (e.g., "AI-powered education platform", "sustainable packaging solutions")

## Expected Output

1. Interactive Q&A session to clarify requirements
2. Comprehensive web research with latest insights
3. Deep thinking analysis with multiple perspectives
4. Multi-model consensus on key ideas
5. Organized, detailed brainstorming document saved to Logs/Research/
6. Actionable recommendations ready for task generation

## Notes

- The output is specifically formatted to be used for generating tasks
- Includes maximum detail for implementation planning
- Combines human creativity with AI analysis
- Leverages multiple AI models for comprehensive coverage
- Uses advanced web scraping for current, relevant information
