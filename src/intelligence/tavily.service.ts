import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class TavilyService {
  async researchProviders(query: string) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('TAVILY_API_KEY is not configured.');

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${query} payment collection split payments transfers fees supported countries official documentation`,
        search_depth: 'advanced',
        topic: 'general',
        max_results: 6,
        include_answer: true,
        include_raw_content: false,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new BadGatewayException(`Tavily request failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const data: any = await response.json();
    return {
      answer: data.answer ?? null,
      results: (data.results ?? []).map((item: any) => ({
        title: item.title,
        url: item.url,
        content: item.content,
        score: item.score,
      })),
      disclaimer: 'Research results are informational. Verify fees, availability and legal requirements with each provider before use.',
    };
  }
}
