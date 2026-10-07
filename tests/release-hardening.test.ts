// Release-tool tests intentionally use Node built-ins and disposable local files.
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { execFileSync } from 'node:child_process';
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { tmpdir } from 'node:os';
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { dirname, join } from 'node:path';
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports
import { cwd, execPath } from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import { prepareNpmAuth } from '../scripts/prepare-npm-auth.mjs';
import {
	isDeterministicSecurityFailure,
	isLikelyPropagationFailure,
} from '../scripts/scan-policy.mjs';
import { assertRegisteredCredentialsAreWired } from '../scripts/node-load-smoke.mjs';

const temporaryDirectories: string[] = [];
const runReleaseAudit = (directory: string) => {
	try {
		// eslint-disable-next-line @n8n/community-nodes/no-dangerous-functions -- fixed executable and test-owned fixture
		return execFileSync(execPath, ['scripts/release-check.mjs'], {
			cwd: directory,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	} catch (error) {
		const output = error as { message?: string; stderr?: string };
		// eslint-disable-next-line @n8n/community-nodes/require-node-api-error -- release-tool fixture
		throw new Error(output.stderr || output.message || String(error));
	}
};
const createReleaseAuditFixture = () => {
	const directory = mkdtempSync(join(tmpdir(), 'openanalytics-release-audit-'));
	temporaryDirectories.push(directory);
	const repository = cwd();
	for (const relative of [
		'scripts',
		'docs',
		'.github/workflows',
		'.github/pull_request_template.md',
		'.blackswamp/template.json',
		'package.json',
		'package-lock.json',
		'README.md',
		'RELEASING.md',
		'LICENSE.md',
		'CHANGELOG.md',
		'vitest.config.mts',
		'tsconfig.test.json',
	]) {
		const source = join(repository, relative);
		const target = join(directory, relative);
		mkdirSync(dirname(target), { recursive: true });
		cpSync(source, target, { recursive: true });
	}
	mkdirSync(join(directory, '.git'));
	writeFileSync(
		join(directory, '.git/config'),
		'[remote "origin"]\n\turl = https://github.com/BlackSwampAI/n8n-nodes-openanalytics.git\n',
	);
	writeFileSync(
		join(directory, '.blackswamp/template.json'),
		JSON.stringify({
			schemaVersion: 1,
			templateVersion: '2.2.0',
			sourceRepository: 'https://github.com/christopherjnelson/n8n-community-node-template',
		}),
	);
	return directory;
};

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0))
		rmSync(directory, { recursive: true, force: true });
});

describe('npm authentication preparation', () => {
	it('preserves token bootstrap configuration', () => {
		const directory = mkdtempSync(join(tmpdir(), 'template-auth-test-'));
		temporaryDirectories.push(directory);
		const config = join(directory, '.npmrc');
		const contents = '//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}\nprovenance=true\n';
		writeFileSync(config, contents);
		expect(prepareNpmAuth({ NODE_AUTH_TOKEN: 'present', NPM_CONFIG_USERCONFIG: config })).toBe(
			'token',
		);
		expect(readFileSync(config, 'utf8')).toBe(contents);
	});

	it('removes only the empty setup-node placeholder for OIDC', () => {
		const directory = mkdtempSync(join(tmpdir(), 'template-auth-test-'));
		temporaryDirectories.push(directory);
		const config = join(directory, '.npmrc');
		writeFileSync(
			config,
			'registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}\nprovenance=true\n',
		);
		expect(prepareNpmAuth({ NODE_AUTH_TOKEN: '', NPM_CONFIG_USERCONFIG: config })).toBe('oidc');
		expect(readFileSync(config, 'utf8')).toBe(
			'registry=https://registry.npmjs.org/\nprovenance=true\n',
		);
	});
});

describe('published scanner retry policy', () => {
	const packageSpec = '@example/n8n-nodes-service@1.2.3';

	it('retries only observed propagation failures for the expected version', () => {
		const analysis404 = `Package ${packageSpec} has failed security checks\nReason: Analysis failed: Request failed with status code 404`;
		const missingVersion = `Package ${packageSpec} has failed security checks\nReason: No package metadata found for version 1.2.3`;
		const provenanceSource404 = `Package ${packageSpec} has failed security checks\nReason: Could not fetch the source repository recorded in the package's npm provenance (Request failed with status code 404).`;
		expect(isLikelyPropagationFailure(analysis404, packageSpec)).toBe(true);
		expect(isLikelyPropagationFailure(missingVersion, packageSpec)).toBe(true);
		expect(isLikelyPropagationFailure(provenanceSource404, packageSpec)).toBe(true);
		expect(
			isLikelyPropagationFailure(
				`Package ${packageSpec} has failed security checks\nReason: No package metadata found for version 1.2.2`,
				packageSpec,
			),
		).toBe(false);
	});

	it('fails deterministic scanner findings immediately', () => {
		const output = `Package ${packageSpec} has failed security checks\nReason: ESLint violations found\nfile.ts:1:1 error`;
		expect(isLikelyPropagationFailure(output, packageSpec)).toBe(false);
		expect(isDeterministicSecurityFailure(output, packageSpec)).toBe(true);
	});

	it('does not retry unrelated network, metadata, or security output', () => {
		for (const reason of [
			'Reason: Analysis failed: Request timed out',
			'Reason: Analysis failed: Request failed with status code 403',
			'Reason: Analysis failed: Request failed with status code 429',
			'Reason: Could not fetch source repository (Request failed with status code 404)',
			'Reason: Package metadata is invalid for version 1.2.3',
			'Reason: No package metadata found for version 1.2.2',
		]) {
			const output = `Package ${packageSpec} has failed security checks\n${reason}`;
			expect(isLikelyPropagationFailure(output, packageSpec)).toBe(false);
			expect(isDeterministicSecurityFailure(output, packageSpec)).toBe(true);
		}
	});
});

describe('compiled credential wiring invariant', () => {
	it('rejects a registered package credential that no loaded node references', () => {
		const nodes = [{ description: { credentials: [{ name: 'usedCredential' }] } }];
		const credentials = [{ name: 'usedCredential' }, { name: 'orphanedCredential' }];
		expect(() => assertRegisteredCredentialsAreWired(nodes, credentials)).toThrow(
			'Registered credential types are not referenced by a node: orphanedCredential',
		);
	});

	it('allows built-in node credential references while requiring package credentials', () => {
		const nodes = [
			{ description: { credentials: [{ name: 'packageCredential' }, { name: 'httpBasicAuth' }] } },
		];
		expect(() =>
			assertRegisteredCredentialsAreWired(nodes, [{ name: 'packageCredential' }]),
		).not.toThrow();
	});
});

describe('template release gates', () => {
	it('keeps CI source review before build and permits manual dispatch', () => {
		const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
		expect(workflow).toContain('workflow_dispatch:');
		expect(workflow.indexOf('npm run review:source')).toBeLessThan(
			workflow.indexOf('npm run build'),
		);
	});

	it('requires immediate full-history tag verification before release setup', () => {
		const workflow = readFileSync('.github/workflows/publish.yml', 'utf8');
		const checkout = workflow.indexOf('actions/checkout@v6');
		const nextStep = workflow.indexOf('\n      - ', checkout + 1);
		const afterCheckout = workflow.indexOf('\n      - ', nextStep + 1);
		const guard = workflow.indexOf('node scripts/verify-release-tag.mjs');
		expect(workflow.slice(checkout, nextStep)).toContain('fetch-depth: 0');
		expect(workflow.slice(nextStep, afterCheckout)).toContain(
			'node scripts/verify-release-tag.mjs',
		);
		expect(guard).toBeLessThan(workflow.indexOf('actions/setup-node@v6'));
		expect(guard).toBeLessThan(workflow.indexOf('npm ci'));
		expect(guard).toBeLessThan(workflow.indexOf('node scripts/prepare-npm-auth.mjs'));
		expect(guard).toBeLessThan(workflow.indexOf('npm run release'));
	});

	it('makes the optional notification read-only and dependent on verified publication', () => {
		const workflow = readFileSync('.github/workflows/publish.yml', 'utf8');
		const job = workflow.split(/\n {2}notify-discord:\s*\n/)[1] ?? '';
		expect(job).toContain('needs: [publish, verify-published]');
		expect(job).toContain('contents: read');
		expect(job).toContain('node scripts/notify-discord.mjs');
		expect(job).toContain('secrets.DISCORD_WEBHOOK');
		expect(job).toContain('continue-on-error: true');
		expect(job).not.toMatch(/id-token:\s*write|NODE_AUTH_TOKEN|secrets\.NPM_TOKEN/);
	});
});

describe('product-mode release audit migration guards', () => {
	it('accepts the current generated package invariants', () => {
		const directory = createReleaseAuditFixture();
		expect(runReleaseAudit(directory)).toContain(
			'Release audit passed for @blackswampai/n8n-nodes-openanalytics@0.1.1',
		);
	});

	it('rejects an intervening publish step before immutable tag verification', () => {
		const directory = createReleaseAuditFixture();
		const path = join(directory, '.github/workflows/publish.yml');
		const workflow = readFileSync(path, 'utf8').replace(
			'      - name: Verify immutable release tag\n',
			'      - run: echo intervening\n      - name: Verify immutable release tag\n',
		);
		writeFileSync(path, workflow);
		expect(() => runReleaseAudit(directory)).toThrow(
			'publish must fetch full history and verify the release tag immediately after checkout',
		);
	});

	it('rejects source review after the build', () => {
		const directory = createReleaseAuditFixture();
		const path = join(directory, '.github/workflows/ci.yml');
		const workflow = readFileSync(path, 'utf8')
			.replace('      - run: npm run review:source\n', '')
			.replace(
				'      - run: npm run build\n',
				'      - run: npm run build\n      - run: npm run review:source\n',
			);
		writeFileSync(path, workflow);
		expect(() => runReleaseAudit(directory)).toThrow(
			'CI must review source before build, then scan before packaging',
		);
	});
});
