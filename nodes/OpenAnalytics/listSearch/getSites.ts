import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

interface SiteItem {
	id: string;
	slug?: string;
	name?: string;
	status?: string;
	role?: string;
}

export async function getSites(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	let rawSites: SiteItem[] = [];

	try {
		const credentials = await this.getCredentials('openAnalyticsApi');
		const rawBaseUrl = (credentials?.baseUrl as string) || 'https://api.getopen.so';
		const baseUrl = rawBaseUrl.replace(/\/$/, '');

		const responseData = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'openAnalyticsApi',
			{
				method: 'GET',
				url: `${baseUrl}/v1/read/sites`,
				json: true,
			},
		)) as SiteItem[] | { sites?: SiteItem[] } | undefined;

		rawSites = Array.isArray(responseData)
			? responseData
			: Array.isArray(responseData?.sites)
				? responseData.sites
				: [];
	} catch {
		return { results: [] };
	}

	let results: INodeListSearchItems[] = rawSites.map((site) => ({
		name: site.name || site.slug || site.id,
		value: site.id,
		description: site.slug ? `slug: ${site.slug}` : undefined,
	}));

	if (filter) {
		const lowerFilter = filter.toLowerCase();
		results = results.filter(
			(item) =>
				item.name.toLowerCase().includes(lowerFilter) ||
				String(item.value).toLowerCase().includes(lowerFilter),
		);
	}

	return { results };
}
