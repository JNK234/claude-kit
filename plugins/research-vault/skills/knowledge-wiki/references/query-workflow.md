# Query Workflow

Ask questions against your knowledge base. Get answers grounded in YOUR notes with citations.

## When To Use

- "What does my vault say about X?"
- "How do these approaches compare?"
- "Prepare me a summary on topic Y"
- "What are the arguments for and against Z?"

## Steps

### 1. Search

Find relevant notes using ChromaDB:

```bash
cd $ZK_DIR && uv run zettel search "$QUERY" --top-k 10 2>&1
```

If `zettel search` is not yet available, search by:
- Reading `50_MOC/index.md` for relevant wiki pages
- Using Grep to search zettel filenames and content in `20_ZETTLEKASTEN/`

### 2. Read

Read the returned zettel files and any relevant wiki pages. Up to 10-15 documents. Prioritize wiki topic pages first (they already synthesize), then individual zettels for detail.

### 3. Synthesize

Write an answer that:
- Directly addresses the question
- Uses [[wikilinks]] to cite specific notes
- Follows Feynman writing principles
- Flags where sources disagree
- Notes what's missing or uncertain

This is NOT a generic LLM answer. It's grounded in the user's own knowledge base. If the vault doesn't have relevant information, say so.

### 4. File Back

If the answer is a valuable synthesis that doesn't exist as a wiki page yet, offer to create one. Ask the user — don't auto-create.
