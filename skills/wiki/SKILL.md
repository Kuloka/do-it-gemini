---
name: wiki
description: Maintain a small searchable Markdown project knowledge base with evidence and provenance.
---

# Wiki

Use for explicit add, query, read, list, update, lint, or delete operations on project knowledge.
Storage is `data/wiki/`; this adaptation requires no OMX wiki command or vector database.

## Page format

Each page is a Markdown file with a lowercase slug and YAML fields:
`title`, `tags`, `category`, `updated`, and `sources`.
Use categories such as architecture, decision, pattern, debugging, and reference.
Separate verified facts, decisions, assumptions, and historical observations.
Reference actual files or direct URLs so a future reader can recheck claims.
Do not store credentials, raw tokens, private transcripts, or temporary speculation as fact.

## Add or update

1. Read `data/wiki/index.md` and search existing pages for related topics.
2. Read matching pages to avoid duplicates or contradictory records.
3. Verify claims against current source or the supplied evidence.
4. Create or update only the relevant page using available file tools.
5. Update the index with title, category, tags, and a relative link.
6. Note superseded decisions rather than silently rewriting their history.

Use short pages organized around one durable topic.
Link between pages with standard relative Markdown links.
Do not auto-capture every session; save knowledge when requested or required by the task.

## Query and read

Use Gemini search tools or `rg` over titles, tags, and text.
Rank exact title/tag matches above incidental mentions.
Return a concise answer with page links and relevant evidence.
No semantic search is implied by keyword matching.

## Lint

Check duplicate slugs, missing metadata, broken relative links, and stale source paths.
Identify contradictory or outdated claims without rewriting unrelated pages.
Fix a typo or broken link within the requested operation when evidence is clear.

## Delete and completion

Delete only a requested, exact page after checking inbound links and index entries.
Preserve unrelated knowledge; do not clear the whole wiki as routine cleanup.
Report pages changed, sources checked, and unresolved staleness.
The wiki is project memory, not execution authority or proof that code still behaves as recorded.
