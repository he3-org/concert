## Prompt Caching Rules

Prompt caching reduces Time-to-First-Token (TTFT) by up to 80% and lowers input costs by 50-98%. These rules ensure cache-friendly prompt structures.

### Caching Thresholds

- Caching only triggers for prompts exceeding **1024 tokens**.
- Optimization hits occur in **128-token increments**.
- A 900-token prompt will never cache. Lengthen stable prefixes to cross the 1024-token threshold.

### Prefix Stability

Place durable, unchanging content at the **top** of the prompt:
- System instructions
- Tool definitions
- JSON schemas
- Skill rules and checklists

Move volatile content to the **bottom** or into metadata:
- Timestamps
- User inputs
- Session-specific variables

Any change to the prefix invalidates the KV cache for everything after it.

### Tool Ordering

Tools and schemas must remain identical across requests. Mandate a fixed alphabetical or schema-based sort order for tool definitions. Even minor ordering shifts invalidate the KV cache.

### Cache Key Routing

Use `prompt_cache_key` to increase routing stickiness. Set key granularity to keep traffic below **15 Requests Per Minute (RPM)** per machine. Higher traffic per key causes load-balancer-induced cache misses.

### Context Compaction

For long-running sessions, use a **Retention Ratio** (e.g., 0.7). When context exceeds the budget:
- Drop the oldest 30% of context in a single block.
- Do not use "just-in-time" pruning, which shifts the prefix every turn and breaks the cache.
- Single-block drops preserve the stable prefix and maintain cache hits.
