
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class TavilyService {
  private readonly apiKey = process.env.TAVILY_API_KEY;
  private readonly endpoint = 'https://api.tavily.com/search';

  async researchProvider(provider: string, country = 'Nigeria') {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'TAVILY_API_KEY is not configured',
      );
    }

    const query = `
${provider} payment gateway ${country}
merchant payment collection
split payments and subaccounts
transfers and settlements
supported banks and currencies
transaction fees and payout restrictions
official documentation
`;

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'advanced',
          max_results: 8,
          include_answer: true,
          include_raw_content: false,
        }),
      });

      if (!response.ok) {
        throw new BadGatewayException(
          `Tavily request failed with status ${response.status}`,
        );
      }

      const data = await response.json();

      return {
        provider,
        country,
        answer: data.answer ?? null,
        results: (data.results ?? []).map((item: any) => ({
          title: item.title,
          url: item.url,
          content: item.content,
          score: item.score,
        })),
        disclaimer:
          'Research results must be verified against the provider’s current official documentation before implementation.',
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;

      throw new InternalServerErrorException(
        'Unable to research this payment provider',
      );
    }
  }

  async research(query: string) {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'TAVILY_API_KEY is not configured',
      );
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: `${query} payment collection split settlement transfer provider documentation`,
          search_depth: 'advanced',
          max_results: 8,
          include_answer: true,
        }),
      });

      if (!response.ok) {
        throw new BadGatewayException('Tavily request failed');
      }

      const data = await response.json();

      return {
        answer: data.answer ?? null,
        results: data.results ?? [],
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;

      throw new InternalServerErrorException(
        'Unable to complete research',
      );
    }
  }
}
