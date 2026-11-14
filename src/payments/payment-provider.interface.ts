
export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

export interface PaystackSplit {
  type: 'percentage' | 'flat';
  bearer_type: 'account';
  subaccounts: {
    subaccount: string;
    share: number;
  }[];
}

export interface CheckoutRequest {
  reference: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  description?: string;
  split?: PaystackSplit;
}

export interface CheckoutResult {
  providerReference: string;
  checkoutUrl: string;
  accessCode: string;
}

export interface VerifiedTransaction {
  status: string;
  amount: number;
  currency: string;
  reference: string;
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
  status: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED';
}

export interface PaymentProvider {
  readonly name: string;

  createCheckout(
    request: CheckoutRequest,
  ): Promise<CheckoutResult>;

  verifyTransaction(
    reference: string,
  ): Promise<VerifiedTransaction>;

  initiateTransfer(
    request: TransferRequest,
  ): Promise<TransferResult>;
}
