### Rules of Git commit message

- Always make in following format [module] 15-20 words verbose less commit message.
- Modules could be: ui, api, deploy, bug, hotfix

### API Design Rules

- Use UUID in API path params for resource lookup (`/{resource_uuid}`), never numeric database IDs.
