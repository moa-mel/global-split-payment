
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  PaymentProvider,
  CheckoutRequest,
  CheckoutResult,
  VerifiedTransaction,
  TransferRequest,
  TransferResult,
} from './payment-provider.interface';

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

@Injectable()
export class PaystackService implements PaymentProvider {
  readonly name = 'PAYSTACK' as const;

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
   * Create a checkout session through Paystack.
   * This is the method PaymentsService expects.
   */
  async createCheckout(
    input: CheckoutRequest,
  ): Promise<CheckoutResult> {
    if (!input.customerEmail) {
      throw new BadRequestException(
        'Customer email is required by Paystack.',
      );
    }

    if (
      !Number.isSafeInteger(input.amount) ||
      input.amount <= 0
    ) {
      throw new BadRequestException(
        'Payment amount must be a positive integer.',
      );
    }

    const result = await this.initializeTransaction({
      email: input.customerEmail,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      description: input.description,
      split: input.split,
      callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
    });

    return {
      providerReference: result.reference,
      checkoutUrl: result.authorization_url,
      accessCode: result.access_code,
    };
  }

  /**
   * Initialize a Paystack transaction.
   */
  async initializeTransaction(input: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    callbackUrl?: string;
    description?: string;
    split?: CheckoutRequest['split'];
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

      ...(input.callbackUrl
        ? { callback_url: input.callbackUrl }
        : {}),

      metadata: {
        description: input.description,
        splitflow_reference: input.reference,
      },

      ...(input.split
        ? { split: input.split }
        : {}),
    });
  }

  /**
   * Verify a transaction with Paystack.
   */
  async verifyTransaction(
    reference: string,
  ): Promise<VerifiedTransaction> {
    return this.request<VerifiedTransaction>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      'GET',
    );
  }

  /**
   * Resolve a Nigerian bank account.
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

  /**
   * Create a transfer recipient and initiate a Paystack transfer.
   */
  async initiateTransfer(
    input: TransferRequest,
  ): Promise<TransferResult> {
    if (
      !Number.isSafeInteger(input.amount) ||
      input.amount <= 0
    ) {
      throw new BadRequestException(
        'Transfer amount must be a positive integer.',
      );
    }

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

    const recipient = await this.request<{
      recipient_code: string;
      name: string;
    }>('/transferrecipient', 'POST', {
      type: 'nuban',
      name: input.beneficiaryName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: input.currency,
    });

    const transfer = await this.request<{
      transfer_code: string;
      reference: string;
      status: string;
    }>('/transfer', 'POST', {
      source: 'balance',
      amount: input.amount,
      recipient: recipient.recipient_code,
      reference: input.reference,
      reason: `SplitFlow payout to ${input.beneficiaryName}`,
    });

    const status = transfer.status.toLowerCase();

    let normalizedStatus: TransferResult['status'];

    switch (status) {
      case 'success':
        normalizedStatus = 'SUCCESSFUL';
        break;

      case 'failed':
      case 'reversed':
        normalizedStatus = 'FAILED';
        break;

      case 'pending':
      case 'otp':
      case 'processing':
      default:
        normalizedStatus = 'PENDING';
        break;
    }

    return {
      providerReference: transfer.reference || input.reference,
      status: normalizedStatus,
    };
  }
}
