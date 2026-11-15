
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

@Injectable()
export class PaystackService {
  private readonly secretKey = process.env.PAYSTACK_SECRET_KEY;

  private readonly paystackApiUrl = (
    process.env.PAYSTACK_API || 'https://api.paystack.co'
  ).replace(/\/+$/, '');

  private get headers() {
    if (!this.secretKey) {
      throw new InternalServerErrorException(
        'PAYSTACK_SECRET_KEY is not configured',
      );
    }

    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.paystackApiUrl}${path}`, {
        method,
        headers: this.headers,
        ...(body !== undefined
          ? { body: JSON.stringify(body) }
          : {}),
      });
    } catch {
      throw new BadGatewayException(
        'Unable to connect to Paystack. Please try again.',
      );
    }

    let result: PaystackResponse<T>;

    try {
      result = await response.json();
    } catch {
      throw new BadGatewayException(
        'Paystack returned an invalid response.',
      );
    }

    if (!response.ok || result.status !== true) {
      const message =
        result?.message || 'Paystack request failed';

      // Account and bank validation errors should be reported
      // as client validation errors, not generic gateway errors.
      if (
        /account number|account name|bank code|bank details|resolve account|settlement bank/i.test(
          message,
        )
      ) {
        throw new BadRequestException(message);
      }

      throw new BadGatewayException(message);
    }

    return result.data;
  }

  /**
   * Resolve a Nigerian bank account using its account number
   * and Paystack bank code.
   */
  async resolveAccount(input: {
    accountNumber: string;
    bankCode: string;
  }) {
    const accountNumber = String(input.accountNumber).trim();
    const bankCode = String(input.bankCode).trim();

    if (!/^\d{10}$/.test(accountNumber)) {
      throw new BadRequestException(
        'Account number must contain exactly 10 digits.',
      );
    }

    if (!bankCode) {
      throw new BadRequestException('Bank code is required.');
    }

    const query = new URLSearchParams({
      account_number: accountNumber,
      bank_code: bankCode,
    });

    return this.request<{
      account_number: string;
      account_name: string;
      bank_id: number;
    }>(`/bank/resolve?${query.toString()}`, 'GET');
  }

  /**
   * Create a Paystack subaccount.
   */
  async createSubaccount(input: {
    businessName: string;
    bankCode: string;
    accountNumber: string;
    email?: string;
  }) {
    const accountNumber = String(input.accountNumber).trim();
    const bankCode = String(input.bankCode).trim();

    if (!/^\d{10}$/.test(accountNumber)) {
      throw new BadRequestException(
        'Account number must contain exactly 10 digits.',
      );
    }

    if (!bankCode) {
      throw new BadRequestException('Bank code is required.');
    }

    return this.request<{
      subaccount_code: string;
      account_name: string;
      account_number: string;
      settlement_bank: string;
      currency: string;
    }>('/subaccount', 'POST', {
      business_name: input.businessName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 0,
      ...(input.email
        ? { primary_contact_email: input.email }
        : {}),
    });
  }

  async initializeTransaction(input: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    callbackUrl: string;
    description?: string;
    split: {
      type: 'percentage' | 'flat';
      bearer_type: 'account';
      subaccounts: Array<{
        subaccount: string;
        share: number;
      }>;
    };
  }) {
    return this.request<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>('/transaction/initialize', 'POST', {
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: {
        description: input.description,
        splitflow_reference: input.reference,
      },
      split: input.split,
    });
  }

  async verifyTransaction(reference: string) {
    return this.request<{
      status: string;
      reference: string;
      amount: number;
      currency: string;
      gateway_response: string;
      paid_at: string | null;
      metadata: unknown;
    }>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      'GET',
    );
  }
}
