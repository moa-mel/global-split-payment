
export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

export interface CheckoutRequest {
  reference: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  description?: string;
}

export interface CheckoutResult {
  providerReference: string;
  checkoutUrl: string;
}

export interface TransferRequest {
  reference: string;
  amount: number;
  currency: string;
  accountNumber: string;
  bankCode: string;
  beneficiaryName: string;
}

export interface TransferResult {
  providerReference: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
}

export interface PaymentProvider {
  readonly name: string;

  createCheckout(
    request: CheckoutRequest,
  ): Promise<CheckoutResult>;

  initiateTransfer(
    request: TransferRequest,
  ): Promise<TransferResult>;
}
