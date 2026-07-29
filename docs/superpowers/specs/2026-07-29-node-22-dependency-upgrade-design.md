# Node 22 and Dependency Upgrade Design

## Goal

Bring the bot and Telegram Mini App development toolchain onto Node.js 22,
replace ESLint-based linting with Biome, and update maintained dependencies in
small, verifiable commits.

The migration must preserve application behavior and the user's existing
uncommitted changes under `src/tg-app`.

## Version Policy

- Target Node.js `22.21.1` and npm `10.9.4`.
- Declare Node.js in both `engines` and `volta`.
- Prefer the latest stable package release that is compatible with Node.js 22,
  the other selected packages, and the current application.
- Do not install prerelease versions merely because an npm `latest` tag points
  to one.
- Keep every committed migration state buildable and testable.
- Upgrade one package per commit where possible. Treat packages that cannot be
  upgraded independently because of peer dependencies or API migrations as one
  atomic compatibility group.

## Scope

### Included

- Root bot dependencies and development dependencies.
- TypeScript, runtime typings, and TypeScript execution tooling.
- TypeORM and the database integration code required by its current API.
- Telegraf and the bot integration code required by its current API.
- Logging, PostgreSQL, environment loading, development reload, tunneling, and
  Git hook packages.
- Root and `src/tg-app` linting and formatting toolchains.
- GitHub Actions commands affected by the toolchain migration.
- Dependency lockfiles.

### Removed

- The complete ESLint toolchain, including configuration, plugins, parsers, and
  obsolete inline ESLint directives.
- Prettier dependencies or configuration if any are discovered during
  implementation.
- `@types/pino`, because Pino provides its own types.
- `telegram-typings`, because modern Telegraf provides Telegram types.
- `production.Dockerfile`.
- `production.docker-swarm.yml`.

### Preserved

- `docker-compose.yml`, because it is used for local development.
- The Telegram Mini App frontend and its behavior.
- Existing uncommitted changes in `src/tg-app`.
- Existing database entities, stored data model, migrations, and bot behavior
  unless a compatibility change is required by an upgraded dependency.

## Toolchain Design

Use `@biomejs/biome` as the only repository linting and formatting tool.

The repository will expose these commands:

- `npm run lint`: report lint violations without modifying files.
- `npm run format`: format supported files.
- `npm run format:check`: verify formatting without modifying files.
- `npm run check`: run Biome lint and formatting checks together.

Biome configuration will exclude generated output, dependencies, and other
non-source artifacts. The root configuration will cover the bot. The nested
Telegram Mini App package will use Biome instead of its current ESLint stack so
that no ESLint toolchain remains in either maintained package.

Formatting changes caused by adopting Biome will be isolated from unrelated
dependency upgrades whenever practical.

## Migration Sequence

1. Remove unused production Docker and Docker Swarm files.
2. Pin Node.js 22 and npm through `engines` and `volta`; align runtime metadata.
3. Replace the root and Mini App ESLint stacks with Biome and update scripts,
   CI commands, inline directives, and Git hook commands.
4. Upgrade TypeScript to the highest stable version proven compatible with the
   selected execution and build tooling.
5. Upgrade `@types/node` to the current Node.js 22 typings.
6. Upgrade `ts-node`.
7. Upgrade small independent development and runtime packages such as
   `dotenv`, `nodemon`, `pg`, and `reflect-metadata`, one at a time.
8. Upgrade TypeORM as an atomic API migration. Replace or remove
   `typeorm-naming-strategies` if it does not support the selected TypeORM
   release while preserving existing snake_case database names.
9. Upgrade Telegraf as an atomic API migration and remove
   `telegram-typings`.
10. Upgrade Pino and `pino-pretty`, removing `@types/pino`.
11. Upgrade ngrok to the newest stable compatible release; do not select a beta
    release.
12. Upgrade Husky and migrate its package-level hook configuration to the
    current `.husky/pre-push` format.
13. Run final clean-install, static, test, build, and startup checks.

The exact order inside the independent package section may change when npm peer
metadata proves a stricter dependency order. Such changes do not alter the
one-green-commit-at-a-time rule.

## Verification and Commit Policy

Before the first dependency change, record baseline behavior:

- Existing unit tests pass.
- Existing TypeScript build passes.
- Existing root lint currently fails because legacy ESLint traverses
  `src/tg-app/node_modules`; this is an existing defect, not an upgrade
  regression.

After every package or compatibility-group change:

1. Install from the updated lockfile.
2. Run the relevant focused check.
3. Run root tests.
4. Run the root TypeScript build.
5. Run Biome checks after Biome is introduced.
6. Run Mini App tests and build when its package or shared tooling is affected.
7. Commit only when the expected checks pass.

Final verification:

- Clean root `npm ci`.
- Clean Mini App `npm ci`.
- Root and Mini App Biome checks.
- Root unit tests.
- Mini App unit tests.
- Root TypeScript build.
- Mini App production build.
- Application startup smoke test with external Telegram and PostgreSQL access
  isolated or explicitly reported when credentials are unavailable.
- `npm outdated` review documenting any intentionally retained package and its
  compatibility reason.

## Error Handling and Rollback

- A failing package upgrade is fixed within the same migration step or reverted
  before moving to the next dependency.
- No commit may intentionally leave peer dependency errors, failing tests, or a
  failing build.
- Database and Telegraf breaking changes remain isolated in their own commits
  for straightforward review and rollback.
- User-owned uncommitted changes are never staged into migration commits.

## Success Criteria

- Development and CI checks run on Node.js 22.
- Volta selects the declared Node.js and npm versions.
- Unused production Docker/Swarm deployment files are gone while local Docker
  Compose remains.
- No maintained package depends on ESLint or Prettier.
- Biome performs repository linting and formatting.
- All selected dependencies are at the newest stable compatible versions, with
  documented reasons for any package not at its npm `latest`.
- Tests, builds, and static checks pass at the end of every committed migration
  step.
