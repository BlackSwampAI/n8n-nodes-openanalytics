# Builder batch handoff

Use this checklist for each bounded implementation batch. Replace bracketed prompts before assigning work.

## Scope

- Goal: `[one independently reviewable outcome]`
- Allowed files: `[explicit allowlist]`
- Non-goals: `[operations, dependencies, architecture, and external actions excluded]`
- Escalate before: dependencies, public API changes, architecture changes, release actions, or scope expansion.
- Implementation style: `[declarative by default, or programmatic exception]`
- Style evidence: `[routing/expressions/pagination/preSend/postReceive used, or the concrete requirement they cannot safely express]`

## Evidence and tests

- Compare generated API contracts, current human documentation, and pinned live behavior when an external API is involved.
- Test real n8n parameter shapes, including expression values and resource-locator list objects.
- Ensure required controls are visible and marked required for every advertised operation.
- Confirm each registered filename has one case-exact matching constructible export and no redundant
  constructor alias. Run the source review and remove empty property-only placeholders only after
  checking the assembled node keeps operation visibility and required shared controls.
- For ordinary REST APIs, prove declarative request construction, pagination, hooks, response normalization, and item-per-input behavior as applicable.
- For a programmatic exception, prove the documented exceptional behavior plus input immutability, paired items, request-helper use, and `continueOnFail` handling as applicable.
- Prove invalid blank/default state fails locally before transport when it cannot form a valid request.
- Add a harmless credential test where supported and assert intended nodes reference the credential.
- Use exact, run-owned live fixtures with fail-closed target guards and cleanup assertions. Never sweep by prefix.
- For multipart behavior, record independent unit decoding separately from actual n8n execution.
  Runtime evidence must verify bytes, boundary/header agreement, UTF-8 filename, MIME type,
  authentication, optional fields, and replacement semantics when supported.

## Handoff

- Summary and files changed
- Contract/runtime discrepancies
- Implementation-style decision, evidence, and rejected declarative options for any programmatic exception
- Commands and exact results
- Package or UI smoke evidence, clearly distinguished from metadata inference
- Cleanup status, limitations, risks, and decisions still needed
- Registration/source-review results and any removed placeholder modules
- Multipart unit evidence and real-n8n runtime evidence, explicitly distinguished
- `git diff --check` and allowed-file review result
