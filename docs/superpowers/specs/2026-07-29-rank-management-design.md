# Rank Management Design

## Goal

Extend the existing Telegram Mini App so trusted users can manage ranks and
assignments without opening the database, while preserving the bot's existing
chat feedback.

## Decisions

- Keep the current single-process HTTP server, service, DAO, and React app.
- Return assignment `comment` and `assignedAt`; sort every user's assignments
  newest first by `assignedAt`.
- Add authenticated API operations to create and delete ranks, assign with an
  optional comment, and remove an assignment.
- Reject deletion of an assigned rank with HTTP 409. The assignment must be
  removed first, which avoids accidental history loss.
- Trim rank titles and comments. Rank titles must contain 1–120 characters;
  comments may contain up to 500 characters.
- Use a confirmation dialog after choosing a recipient. The dialog names the
  rank and recipient and contains the optional comment field.
- Add a compact rank-management screen reachable from the main dock. It
  contains rank creation and deletion controls.
- Put assignment removal beside each assigned-rank card with an explicit
  confirmation step.
- Publish successful create, delete, assign, and unassign actions to the same
  Telegram group used by the bot. Chat publication is best-effort after the
  database commit; publication failure is logged and does not falsify the UI.
- Replace release startup output with a structured log containing the actual
  HTTP listening port. The production Telegram startup message also reports
  the port rather than the release.

## Data Flow

The controller parses HTTP routes and bodies. The service authenticates,
validates input, calls the transactional DAO, posts the resulting message
through a Telegram notification port, and reloads state. The DAO owns database
transactions and changelog writes. React replaces local state only with a
successful API response.

## Error Handling

Known input and state conflicts return 400, 404, or 409. Database failures
remain 500. Telegram publication failures are logged after a committed
operation. UI actions disable while pending, show haptic success/error
feedback, and retain a recoverable screen on failure.

## Testing

Unit tests cover service validation, mapping, sorting, notifications, and all
mutations. HTTP tests cover every route and payload. DAO integration tests
cover comments, timestamps, rank lifecycle, assignment removal, changelogs,
and conflicts. React tests cover comments, confirmation, creation, deletion,
and unassignment. Final verification runs tests, typechecks, lint/checks,
builds, browser smoke testing, and Cursor review.
