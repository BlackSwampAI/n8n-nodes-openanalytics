import { describe, expect, it, vi } from 'vitest';
import {
	buildDiscordPayload,
	notifyDiscord,
	webhookUrlWithWait,
} from '../scripts/notify-discord.mjs';

const release = {
	packageName: '@blackswampai/n8n-nodes-openanalytics',
	version: '0.1.1',
	repository: 'BlackSwampAI/n8n-nodes-openanalytics',
	tag: 'v0.1.1',
};

describe('Discord release notification', () => {
	it('identifies the verified release with one source link and prevents mentions', () => {
		expect(buildDiscordPayload(release)).toEqual({
			content:
				'Released **@blackswampai/n8n-nodes-openanalytics@0.1.1**: npm publication and published-package verification succeeded.\nRepository/tag: BlackSwampAI/n8n-nodes-openanalytics @ v0.1.1\nhttps://github.com/BlackSwampAI/n8n-nodes-openanalytics/tree/v0.1.1',
			allowed_mentions: { parse: [] },
		});
	});

	it('emits exactly one URL and encodes the tag in its source link', () => {
		const payload = buildDiscordPayload({ ...release, tag: 'release/0.1.1' });
		expect(payload.content.match(/https?:\/\/\S+/g)).toEqual([
			'https://github.com/BlackSwampAI/n8n-nodes-openanalytics/tree/release%2F0.1.1',
		]);
		expect(payload.content).toContain(
			'Repository/tag: BlackSwampAI/n8n-nodes-openanalytics @ release/0.1.1',
		);
	});

	it('adds wait=true without dropping a Discord thread', () => {
		const url = webhookUrlWithWait('https://discord.com/api/webhooks/1/token?thread_id=99');
		expect(url.searchParams.get('thread_id')).toBe('99');
		expect(url.searchParams.get('wait')).toBe('true');
	});

	it('skips cleanly when the optional secret is missing', async () => {
		const fetchMock = vi.fn();
		await expect(notifyDiscord({ webhook: '', fetchImpl: fetchMock, ...release })).resolves.toEqual(
			{ skipped: true },
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('posts JSON once with a bounded signal', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
		const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
		await expect(
			notifyDiscord({
				webhook: 'https://discord.com/api/webhooks/1/token',
				fetchImpl: fetchMock,
				...release,
			}),
		).resolves.toEqual({ skipped: false });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
		expect(url.searchParams.get('wait')).toBe('true');
		expect(options).toMatchObject({
			method: 'POST',
			headers: { 'content-type': 'application/json' },
		});
		expect(options.signal).toBeInstanceOf(AbortSignal);
		expect(timeoutSpy).toHaveBeenCalledWith(10_000);
		expect(JSON.parse(String(options.body))).toEqual(buildDiscordPayload(release));
	});

	it('reports only a sanitized status on HTTP failure', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
		await expect(
			notifyDiscord({
				webhook: 'https://discord.com/api/webhooks/1/SECRET',
				fetchImpl: fetchMock,
				...release,
			}),
		).rejects.toThrow('Discord webhook returned HTTP 429');
		await expect(
			notifyDiscord({
				webhook: 'https://discord.com/api/webhooks/1/SECRET',
				fetchImpl: fetchMock,
				...release,
			}),
		).rejects.not.toThrow('SECRET');
	});

	it('redacts transport failures and does not retry', async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValue(new Error('request to https://discord.com/api/webhooks/1/SECRET failed'));
		await expect(
			notifyDiscord({
				webhook: 'https://discord.com/api/webhooks/1/SECRET',
				fetchImpl: fetchMock,
				...release,
			}),
		).rejects.toThrow('Discord webhook request failed');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
