# Telegram Message Chunking

## Goal

Send potentially long `/list` and `/changelog` responses without exceeding
Telegram's 4096-character text-message limit.

## Design

Add one transport-level helper that accepts a Telegraf context and response
text. It splits text into chunks of at most 4096 JavaScript string units and
sends them sequentially with `await ctx.reply(...)`.

The splitter prefers the last newline within the current limit so rank and
changelog entries remain intact. If no newline exists within the limit, it
splits at the limit. Split delimiters are not included in either chunk, and
empty chunks are not sent.

Only `ListController` and `ChangelogController` will use the helper. Response
formatters remain responsible only for formatting, and short bounded replies
remain unchanged.

## Error Handling

Sending stops on the first rejected Telegram request and propagates the error
to Telegraf's existing error handler. This prevents later chunks from arriving
after a missing earlier chunk.

## Tests

Unit tests will cover:

- text at or below the limit;
- newline-aware splitting;
- a single line longer than the limit;
- sequential delivery in original order;
- no empty messages around boundary newlines.

The implementation will follow existing TypeScript conventions and add only
the minimum test tooling needed by this repository.
