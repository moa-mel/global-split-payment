
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class BifrostService {
  private readonly baseUrl =
    process.env.BIFROST_BASE_URL ?? 'http://localhost:8080';

  private readonly apiKey = process.env.BIFROST_API_KEY;

  private readonly model =
    process.env.BIFROST_MODEL ?? 'openai/gpt-4o-mini';

  async draftSplitRule(instruction: string, currency = 'NGN') {
    const prompt = `
You help merchants design payment split rules.

Convert the merchant's instruction into a JSON split-rule draft.

Rules:
- Return JSON only. Do not include markdown.
- Do not invent beneficiary IDs.
- Use beneficiary names as provided in the instruction.
- Percentage values must be basis points: 65% = 6500.
- Fixed values must be in the smallest currency unit.
- Percentage allocations must not exceed 10000 basis points.
- Never claim that a payment or transfer has been executed.
- If the instruction is ambiguous, include questions.
- The merchant must review and approve this draft.

Currency: ${currency}
Merchant instruction: ${instruction}

Return this structure:
{
  "name": "string",
  "description": "string",
  "currency": "${currency}",
  "items": [
    {
      "beneficiaryName": "string",
      "splitType": "PERCENTAGE or FIXED",
      "value": 6500
    }
  ],
  "questions": []
}
`;

    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, '')}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey
              ? { Authorization: `Bearer ${this.apiKey}` }
              : {}),
          },
          body: JSON.stringify({
            model: this.model,
            temperature: 0.1,
            messages: [
              {
                role: 'system',
                content:
                  'You produce structured merchant split-rule drafts. Return valid JSON only.',
              },
              { role: 'user', content: prompt },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new BadGatewayException(
          `Bifrost request failed with status ${response.status}`,
        );
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new BadGatewayException('Bifrost returned an empty response');
      }

      const cleaned = String(content)
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      try {
        return {
          source: 'bifrost',
          requiresMerchantApproval: true,
          draft: JSON.parse(cleaned),
        };
      } catch {
        throw new BadGatewayException(
          'Bifrost returned invalid JSON. Please try again.',
        );
      }
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new InternalServerErrorException(
        'Unable to generate a split-rule draft',
      );
    }
  }

  async assistant(question: string) {
    const prompt = `
You are SplitFlow's merchant payment assistant.

Help with:
- Understanding payment split rules.
- Explaining percentage and fixed allocations.
- Explaining payment and payout workflows.
- Identifying missing information in a merchant's instructions.

Never:
- Claim that a transfer has been made.
- Authorize or initiate a payout.
- Make final financial calculations.
- Pretend to know a provider's current fees or capabilities without research.

Question: ${question}
`;

    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, '')}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey
              ? { Authorization: `Bearer ${this.apiKey}` }
              : {}),
          },
          body: JSON.stringify({
            model: this.model,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }],
          }),
        },
      );

      if (!response.ok) {
        throw new BadGatewayException('Bifrost request failed');
      }

      const result = await response.json();

      return {
        answer: result.choices?.[0]?.message?.content ?? '',
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new InternalServerErrorException(
        'Unable to contact the AI assistant',
      );
    }
  }
}
