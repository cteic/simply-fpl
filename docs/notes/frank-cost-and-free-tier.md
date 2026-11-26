# Frank: what it costs, and how a free tier could work

Written 2026-11-26. Numbers are estimates with the assumptions stated; treat
them as an order of magnitude, not a quote.

## There are no included API credits

Serving Frank bills the Anthropic API account per token. A Claude subscription
does not provide a credit pool that can be spent on end users. So "free until
the credits run out" has no natural stopping point: it runs until someone
notices the bill. Any free tier needs a hard cap that is enforced in code.

## The model was the expensive part

Frank ran on Claude Haiku 4.5. Claude Haiku 5.5 is the current model of the
same class and is an order of magnitude cheaper.

| Model                         | Input $/MTok | Output $/MTok | Context |
| ----------------------------- | ------------ | ------------- | ------- |
| Haiku 4.5                     | $1.00        | $5.00         | 200K    |
| Haiku 5.5 (prompt under 100K) | $0.10        | $0.50         | 1M      |
| Haiku 5.5 (prompt over 100K)  | $0.50        | $2.50         | 1M      |

Frank's prompts are a few thousand tokens, so the cheap rate card applies.

Caching matters as much as the rate. Cache reads cost 0.1x the input rate,
5-minute cache writes 1.25x, 1-hour writes 2x. Frank already marks its context
block `cache_control: ephemeral`, so repeat questions in a session read the
context at a tenth of the input price.

## Estimated cost per question

Assuming roughly 4,000 tokens of cached context, a 30-token question and a
250-token answer:

|                      | Haiku 4.5    | Haiku 5.5     |
| -------------------- | ------------ | ------------- |
| Cached context read  | $0.00040     | $0.00004      |
| Question             | $0.00003     | $0.000003     |
| Answer               | $0.00125     | $0.00013      |
| Thinking (see below) | n/a          | ~$0.00010     |
| **Per question**     | **~$0.0017** | **~$0.00027** |
| **Questions per $1** | **~590**     | **~3,700**    |

The list price is 10x lower. Haiku 5.5 also thinks by default, and those
thinking tokens are billed as output, so the realistic saving is nearer 6x
than 10x. Lowering `output_config.effort` would recover most of the rest, but
the project pins `@anthropic-ai/sdk@^0.55.0`, which predates that parameter.
Upgrading the SDK is the single next cost lever.

## What a free tier needs

Frank already has more of the scaffolding than the open issues suggest:

- A per-user monthly quota (`FRANK_QUOTA_SOFT` 50, `FRANK_QUOTA_HARD` 80),
  counted from the `frank_queries` table.
- A global daily token cap, `FRANK_DAILY_SPEND_CAP_TOKENS`, summing
  `tokens_in + tokens_out` across all users for the day.
- A KV ask-cache keyed on question plus squad, so identical questions are free.
- Prompt caching on the context block.

Two gaps stand between that and a safe free tier.

**The per-user quota is nearly atomic, not atomic.** The route inserts a
reservation row, re-counts, and deletes the row if the count went over. That
closes most of the window, but concurrent requests can still interleave. This
is issue #415.

**The global daily cap is not atomic at all.** It reads every row for the day,
sums the tokens, and then acts, with no reservation. Two requests arriving
together both see the pre-spend total. It also scans unboundedly as the table
grows. This is the part that actually protects the bill, and it is the weakest
link. This is issue #412.

There is already a better pattern in the codebase to copy:
`apps/worker/src/news/team-summary.ts` calls `checkAndIncrementDailySpend`,
a KV counter that increments and checks in one step.

## Suggested shape

1. Move the global budget to a single atomic counter, incremented before the
   call and reconciled with real usage after, rather than a table scan.
2. Keep a per-user cap so one account cannot drain the global budget.
3. Gate the free tier behind an env flag, default off, so turning it on is a
   deliberate act rather than a deploy side effect.
4. Set the global cap in tokens from a figure in pounds. At the Haiku 5.5 rate
   above, £20 is roughly 70,000 questions, which is almost certainly more
   headroom than a trial needs.

## Mobile

Frank on mobile is a paywall stub: it renders a card reading "Available on Pro
and above. Subscribe at simplyfpl.com" and nothing else. Opening Frank to a
free tier therefore needs the mobile ask UI built, not just the access rule
changed. Web has the full view already.
