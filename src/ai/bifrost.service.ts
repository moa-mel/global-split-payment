import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class BifrostService {
  private get baseUrl() {
    return (process.env.BIFROST_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  }

  private async complete(messages: Array<{ role: string; content: string }>) {
    if (!process.env.BIFROST_BASE_URL) {
      throw new ServiceUnavailableException('Configure BIFROST_BASE_URL and a model provider.');
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.BIFROST_API_KEY) headers.Authorization = `Bearer ${process.env.BIFROST_API_KEY}`;

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: process.env.BIFROST_MODEL ?? 'openai/gpt-4o-mini',
        temperature: 0.2,
        messages,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new BadGatewayException(`Bifrost request failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const data: any = await response.json();
    return data.choices?.[0]?.message?.content as string;
  }

  async ask(message: string) {
    const answer = await this.complete([
      { role: 'system', content: 'You are SplitFlow, a clear and careful group-payment assistant. Explain contribution and allocation concepts. Never claim a payment was made. Never authorize or initiate transfers. For money calculations, ask the backend to calculate and clearly state assumptions.' },
      { role: 'user', content: message },
    ]);
    return { answer };
  }

  async createGroupDraft(message: string) {
    const raw = await this.complete([
      {
        role: 'system',
        content: `Convert the user's group-payment request into JSON only. Schema:
{"name":string,"description":string,"currency":"NGN"|"USD"|"GBP"|"EUR","targetAmount":integer,"ownerName":string|null,"members":[{"name":string,"email":string|null}],"recipients":[{"name":string,"amount":integer}],"assumptions":[string]}
All money values must be integer minor units (kobo for NGN, cents for USD/GBP/EUR). If user gives NGN naira, multiply by 100. Do not invent missing personal details. If total is unclear, use targetAmount 0 and explain in assumptions. This is a draft only.`,
      },
      { role: 'user', content: message },
    ]);

    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const draft = JSON.parse(cleaned);
      if (!draft || typeof draft !== 'object' || !Array.isArray(draft.members) || !Array.isArray(draft.recipients)) {
        throw new Error('Unexpected draft shape');
      }
      if (!Number.isSafeInteger(draft.targetAmount) || draft.targetAmount < 0) {
        throw new Error('Invalid target amount');
      }
      const recipientTotal = draft.recipients.reduce((sum: number, r: any) => {
        if (!Number.isSafeInteger(r.amount) || r.amount < 0) throw new Error('Invalid recipient amount');
        return sum + r.amount;
      }, 0);
      return { draft, validation: { recipientTotal, matchesTarget: recipientTotal === draft.targetAmount }, requiresHumanApproval: true };
    } catch {
      return { raw, error: 'The AI response was not valid structured JSON. Please refine the request and try again.', requiresHumanApproval: true };
    }
  }
}
