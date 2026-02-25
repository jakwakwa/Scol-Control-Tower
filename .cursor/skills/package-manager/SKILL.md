---
name: package-manager
description: when running build, dev or install commands: `bun` is the only valid package manager you may use
---


ALLOWED: 

```bash
bun i
```
```bash
bun run dev
```

```bash
bun run lint
```

```bash
bun run build
```

NOT ALLOWED:

pnpm, yarn or npm
