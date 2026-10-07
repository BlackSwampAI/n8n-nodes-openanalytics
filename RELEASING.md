# Releasing an n8n community node

Releases are user-authorized and publish only from `.github/workflows/publish.yml`. Never run `npm publish` locally for an n8n release.

## Finalize the generated repository

Complete the README initialization checklist. `npm run release:check` enters template mode only when the normalized git origin is exactly this template repository. Every generated repository uses normal mode and must have final identity, no placeholders/examples, and no `private: true`.

## Repository or registry restoration

Treat restoration as a read-only audit before changing external state. Compare preserved source,
workflow files, and immutable tags with GitHub's observed Actions registration, run history, secrets,
permissions, branch policies, and npm trust/registry state. Source files do not automatically restore
Actions runs, repository secrets, npm package objects, or Trusted Publisher configuration, and a
workflow in Git does not prove GitHub registered or executed it.

Recover ordinary CI first. Merge the reviewed `workflow_dispatch` trigger to the default branch,
confirm GitHub registers the workflow, dispatch it only after that merge, and require the real matrix
run to pass. Do not add manual publication or replay an old release tag.

If the whole npm package was removed, current npm policy blocks publishing under that name for 24
hours and permanently forbids reusing any previously published name/version pair. Re-check the live
registry and [current official unpublish policy](https://docs.npmjs.com/policies/unpublish/) before
proceeding. npm requires the package to exist before a Trusted Publisher can be configured. Only
after explicit authorization for a new release may a truly absent package use one narrowly scoped
temporary `NPM_TOKEN` for a new immutable version. After the first successful publish and independent
verification, configure OIDC under the
[Trusted Publishers guidance](https://docs.npmjs.com/trusted-publishers/) for the exact owner,
repository, `publish.yml`, and declared environment tuple with **Allow npm publish**, then delete the
GitHub secret and revoke the temporary token.

Restore an optional `DISCORD_WEBHOOK` privately only when the user wants notifications. Never send a
live test message. Record unknown or inaccessible trust/settings state as unverified, not lost, and
never promise that restoration or these guards prevent every release or node defect.

## Immutable release-tag guard

Local tag tests do not qualify GitHub Actions checkout behavior. Before relying on this guard for a release, verify that the actual checkout retains the annotated tag object; an unexpected lightweight tag fails closed.

The tag-only publish job checks out full branch and tag history, then runs
`scripts/verify-release-tag.mjs` immediately after checkout and before runtime setup, dependency
installation, authentication, or publication. The guard requires `GITHUB_REF` to equal
`refs/tags/v<package.json version>`, requires that ref to exist as an annotated tag, requires the tag
to resolve to the checked-out `HEAD`, and requires the tagged commit to be an ancestor of the fetched
`refs/remotes/origin/main`.

This Git-history check does not prove that CI passed, that a human reviewed the commit, or that prior
published tags have never been moved or deleted. Require human review and CI on the exact release
commit before creating the tag. Never move, delete, or replay a release tag. The `.mjs` guard is a
direct-execution release tool and is an intentional exception to the repository's TypeScript test
file convention; its automated tests remain TypeScript Vitest files.

## Prepublication gate

Run on the exact release commit:

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run review:source
npm run build
npm run scan:source
npm run package:check
npm run smoke:load
npm run smoke:install
git diff --check
```

Inspect the dry-run tarball and install it in a disposable n8n instance. Verify node/credential loading, representative operations, error handling, and triggers where present. CI must pass on Node 22.22.0 and Node 24. The pinned official scanner preflight checks both its source patterns and built JavaScript; inline ESLint disables do not replace compliance.

Every API credential should provide a harmless authenticated test request where the service supports one. Add a product-specific release invariant so the credential cannot remain registered but disconnected from every node.

## First publication only

npm requires a package to exist before Trusted Publisher configuration. For a genuinely new package, create a narrowly scoped, temporary granular token with publish access only to that package and store it only as the `NPM_TOKEN` Actions secret. After explicit user approval, tag the reviewed commit with an annotated immutable `v0.1.0` tag and let GitHub Actions publish with provenance.

Immediately after success, configure npm Trusted Publishing for the exact GitHub owner, repository, `publish.yml`, and no environment unless the workflow declares one. Delete the GitHub secret and revoke the token. Existing packages skip token bootstrap and use OIDC from the first release.

The workflow removes setup-node's literal empty `_authToken=${NODE_AUTH_TOKEN}` line before tokenless publishing. Do not remove this preparation: an empty auth placeholder can suppress OIDC.

## Verify and preserve history

Verify the workflow, npm version and `latest` tag, SLSA provenance attestation, package contents/load smoke, and matching GitHub release. The post-publication scanner accepts only a published registry package and may exit zero while printing failed checks, so require the exact `Package <name>@<version> has passed all security checks` output. It runs in the separate dependent `verify-published` job after a 60-second registry settling period. The wrapper makes at most 11 scan attempts, waiting 30 seconds only between recognized registry/provenance propagation failures, for a total wait budget of 360 seconds excluding scanner runtime. Deterministic security findings, including lint findings combined with propagation text, and all other errors fail immediately. If publication succeeded but only verification failed after this bounded window, diagnose it and use GitHub Actions **Re-run failed jobs**; never rerun the successful publish job for an immutable npm version. Never reuse an npm version or move/delete a published tag. User-visible npm README or metadata corrections require a new version; workflow-only corrections do not.

Submit only that exact published version to Creator Portal, then visually inspect and record its card version and logo. A valid npm tarball can still appear stale or generic in the portal.

After both publication and published-package verification succeed, the dependent notification job posts the package/version, confirms both successful stages, and includes the GitHub tag/source link as its single URL when the optional `DISCORD_WEBHOOK` repository secret exists. Repository and tag are also shown as plain text. A missing secret skips cleanly. A webhook failure is sanitized and does not turn a successful immutable publication into a failed release or trigger republication.

Before adopting this baseline in an older repository, inspect `.npmrc` and `engines.node`. Do not keep `engine-strict=true` when the declared engine excludes a required Node 22.22.0 or Node 24 CI lane. Create the migration branch from the current post-squash `main`; rebasing an old pre-squash feature branch can replay already-merged work.
