import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports -- test uses TMPDIR-aware paths without filesystem effects
import { tmpdir } from 'node:os';
// eslint-disable-next-line @n8n/community-nodes/no-restricted-imports -- test uses TMPDIR-aware path construction
import { join } from 'node:path';
import { createDevProcessOptions, DEV_PORT } from '../scripts/dev.mjs';

describe('development launcher', () => {
	it('forces the disposable n8n port while preserving the environment', () => {
		const options = createDevProcessOptions({ PATH: '/bin', N8N_PORT: '5678' }, [
			'--custom-user-folder',
			join(tmpdir(), 'n8n-dev-example'),
		]);
		expect(DEV_PORT).toBe('5690');
		expect(options.environment).toMatchObject({ PATH: '/bin', N8N_PORT: '5690' });
		expect(options.arguments).toEqual([
			'dev',
			'--custom-user-folder',
			join(tmpdir(), 'n8n-dev-example'),
		]);
	});
});
