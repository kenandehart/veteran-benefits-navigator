# server

The Veteran Benefits Navigator backend (Node.js + Express + PostgreSQL).

## Database migrations

Schema changes are managed by [node-pg-migrate](https://salsita.github.io/node-pg-migrate/).
Migrations live in `server/migrations/` as plain `.sql` files with `-- Up Migration`
and `-- Down Migration` sections. The migration tracking table is `pgmigrations` and
is created automatically on first run.

All commands read `DATABASE_URL` from `server/.env`.

> **Platform note:** the `migrate` script invokes `./node_modules/.bin/node-pg-migrate`
> with `node -r dotenv/config`, which works on Linux and macOS only. On Windows the
> `.bin` entry is a `.cmd` wrapper rather than a JS file, so the binary path needs
> to be swapped (e.g. to `./node_modules/node-pg-migrate/bin/node-pg-migrate`) or
> the `dotenv` loading replaced with `dotenv-cli`.

### Create a new migration

```sh
npm run migrate:create -- name-of-change
```

This writes a timestamped `.sql` file into `server/migrations/`. Fill in both the
`-- Up Migration` and `-- Down Migration` sections before committing.

### Apply pending migrations

```sh
npm run migrate:up
```

### Revert the most recent migration

```sh
npm run migrate:down
```

### Convention

Every schema change goes through a migration. Do not run DDL by hand against any
shared database — the next person to apply migrations will end up with state that
diverges from the migration history, and reverting becomes guesswork.
