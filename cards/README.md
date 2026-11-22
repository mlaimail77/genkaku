# Agent Routes cards

One file per specialist. `index.json` is generated — never edit it by hand.

## Adding a card

1. Copy an existing file and rename it to your card's `id` (the file name must
   match the `id`, and the `id` must be lower-case ascii).
2. Fill in the prose in the language named by `lang`.
3. Add a one-line `summary` (the list shows it; the card itself ignores it).
4. Run the validator:

   ```bash
   pnpm --filter @genkaku/protocol run build   # once, so the validator can import it
   node scripts/build-cards.mjs
   ```

   It refuses a file that the plugin itself would reject, and it rewrites
   `index.json` with the size and sha256 of every card.
5. Open a pull request with both the card and the regenerated `index.json`.

A maintainer publishes with `bash scripts/publish-cards.sh`, which uploads to
`/srv/genkaku-cards/v1` on the seed host and verifies every card over HTTPS.

## What a card may contain

Only specialist fields: `name`, `whenToUse`, `whenNotToUse`, `examples`,
`systemPrompt`, `maxTokens`, and a `routeHint`.

- **No model id.** A card is shared between machines; a worker id from your
  board means nothing on someone else's. Use a hint: `{"kind":"local"}`,
  `{"kind":"local","tier":"agent"}`, `{"kind":"local","prefer":"fastest"}`, or
  `{"kind":"cloud","provider":"deepseek"}`.
- **No `enabled`, `main` or limits.** Those are the reader's decisions.
- **No executable content, no URL fetched at runtime.**

## What a card should say

The role instructions are instructions for an agent that can read files. Write
them as you would brief a careful colleague:

- what to output, and what *not* to output (no preface, no summary of the task);
- where the evidence must come from (file path and line, article number, URL);
- what to do when it cannot find the answer — say so, never guess;
- one anti-pattern you have actually seen go wrong.

The `whenNotToUse` field matters more than it looks: it is what stops the main
model from delegating everything. Name the nearest task that looks similar but
belongs elsewhere.
