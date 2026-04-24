### Rules of Git commit message

- Always make in following format [module] 15-20 words verbose less commit message.
- Modules could be: ui, api, deploy, bug, hotfix

### API Design Rules

- Use UUID in API path params for resource lookup (`/{resource_uuid}`), never numeric database IDs.

### Database migrations

- Do not generate Alembic migration files. The maintainer writes and applies migrations manually.

### Coding format

- Do not use 1) or 1. in code comments, code comment should be direct to the point and verbose-less.
- Variable names should do the comment work.
