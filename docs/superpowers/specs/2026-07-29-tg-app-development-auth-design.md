# Telegram Mini App Development Authentication Design

## Goal

Remove the dedicated `DEV_TELEGRAM_USER_ID` setting, use the existing
`USERS` list as the production Telegram access allowlist, and allow local
browser development without Telegram `initData`.

## Configuration

`TgAppConfig` keeps only the Mini App port and static directory. The existing
`AuthConfig.users`, parsed from the comma-separated `USERS` environment
variable, is passed to `TgAppService` as `allowedTelegramUserIds`.

`DEV_TELEGRAM_USER_ID` is removed from code, tests, `.env.example`, and
documentation.

## Authentication behavior

In `production`, requests must still provide valid Telegram `initData`.
Signature and age validation remain unchanged. The authenticated Telegram ID
must be present in `allowedTelegramUserIds`.

In `development`, Telegram authorization is skipped completely, including
when a browser sends no authorization header. The first ID in
`allowedTelegramUserIds` becomes the technical development actor returned by
authentication.

An empty development allowlist is a configuration error expressed as the
existing `401 "User is not allowed"` response. This avoids inventing an actor
that cannot be recorded in the changelog.

Other environments, including `test`, retain production-style authentication
unless a test explicitly constructs a service with `environment:
"development"`.

## State and assignment behavior

The three fixed recipient/display records remain unchanged. `USERS` controls
who may authenticate and act; it does not change the Mini App recipient list.

Assignment still sends the authenticated or technical development actor ID to
`TgAppDao.assignRank`, preserving changelog integrity.

## Testing

Tests will prove:

- `TgAppConfig` no longer reads `DEV_TELEGRAM_USER_ID`;
- production accepts a signed user listed in `USERS`;
- production rejects a valid signed user missing from `USERS`;
- development accepts missing or invalid Telegram authorization;
- development uses the first `USERS` ID as assignment actor;
- non-development environments do not receive the bypass;
- existing HTTP, DAO, lifecycle, frontend, and build checks remain green.
