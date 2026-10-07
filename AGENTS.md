# Orchestrator and builder workflow

## Roles

- The human user and primary Codex agent are co-orchestrators. The user controls the primary agent's model and reasoning settings and performs final pull-request review and merge.
- Use exactly one implementation sub-agent named `builder`, configured in `.codex/agents/builder.toml` for `gpt-6-luna` with medium reasoning effort.
- The builder implements one bounded assignment at a time. The primary agent owns requirements, coordination, diff review, and user-facing reporting.

## Delegation contract

- Do not spawn a builder for questions, status inspection, or planning discussion.
- For concrete implementation work, give the builder the user's scope, constraints, acceptance criteria, and requested verification without broadening them.
- Do not add more agents or recursively delegate unless the user explicitly changes this workflow.
- Ask the user before choices that materially alter scope, dependencies, public APIs, release behavior, or external state.

## Repository safeguards

- Preserve unrelated worktree changes. Do not publish, tag, push, create releases, open pull requests, or merge unless explicitly authorized.
- At the start of implementation, verify the expected branch with `git status --short --branch`. If it differs from the assignment, stop before editing and report it.
- Treat the assignment's allowed files as an allowlist. Review `git diff --name-only` before handoff and revert only task-created out-of-scope changes.
- Send a concise checkpoint before a command or investigation can leave the user without an update for 60 seconds. Bound unsupported browser, Docker, and external-tool attempts; report evidence and limitations instead of retrying indefinitely.
- Automated tests are TypeScript `*.test.ts` files run with Vitest. Reserve `.mjs` for genuine direct-execution operational or release tooling; document exceptions.
- Registered node and credential modules must expose exactly one constructible named export whose key matches the registered filename prefix, including case. Keep helper exports nonconstructible and reject redundant constructor aliases as template hygiene. n8n's directory loader selects that filename-derived export key; the extra-constructor rule is template policy rather than an n8n-wide loader claim.
- Remove property modules that contribute only exported empty `INodeProperties[]` placeholders plus import/type scaffolding. Before removing one, inspect the assembled node description and prove shared parameters and index routing preserve operation visibility, required controls, request construction, and output handling.
- Keep `n8n-workflow` host-provided and avoid runtime dependencies. Use package scripts for validation, including lint, strict typecheck, tests, build, and package checks.
- Follow `RELEASING.md`; the user authorizes releases and performs final review/merge.
- Before release, require builder verification, orchestrator diff review, a disposable packed-package load smoke, representative real-n8n/user smoke, official source-scanner preflight, and explicit user authorization. Report observed limitations without converting metadata inference into runtime claims.
- Launch disposable local n8n through `npm run dev`, which explicitly uses port 5690. Open `http://localhost:5690` manually because the CLI browser shortcut targets 5678. Never attach to, stop, or restart an existing service on 5678. If 5690 is occupied, report it and launch an explicit alternative such as `N8N_PORT=5692 npm exec -- n8n-node dev --custom-user-folder "$PWD/.codex-scratch/n8n-node-run"`; do not fall back silently.
- Use the API, testing, branding, and batch-handoff templates under `docs/`. Generated repositories must adopt later template migrations explicitly and update `.blackswamp/template.json` only after reviewing and validating the migration.

## Node implementation style

- Start with declarative routing for ordinary REST APIs. Before considering a programmatic node, evaluate declarative routing, expressions, pagination, `preSend`, and `postReceive` hooks against the required API behavior.
- Use programmatic style only for a documented concrete requirement, such as a trigger, GraphQL or another non-REST protocol, an external runtime dependency, incoming-data transformation, full node versioning, or behavior that declarative routing cannot safely express.
- Record the implementation style and supporting evidence in the API matrix and builder handoff. Generic complexity or "weird JSON" is not sufficient justification for programmatic style.
- For multipart operations, distinguish declarative `preSend` hooks from programmatic request-helper execution and native `FormData` from library implementations. [Official programmatic helper documentation](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/http-request-helpers/) supports `FormData`; do not impose a blanket ban or copy a product-specific encoder into generated packages without evidence.
