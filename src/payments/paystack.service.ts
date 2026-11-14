
import {
    BadGatewayException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';


@Injectable()
export class PaystackService {
    private readonly secretKey = process.env.PAYSTACK_SECRET_KEY;
    private readonly paystackApiUrl = process.env.PAYSTACK_API;

    private get headers() {
        if (!this.secretKey) {
            throw new InternalServerErrorException(
                'PAYSTACK_SECRET_KEY is not configured',
            );
        }

        return {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
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
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
        } catch {
            throw new BadGatewayException(
                'Unable to connect to Paystack',
            );
        }

        const result = await response.json();

        if (!response.ok || result.status !== true) {
            throw new BadGatewayException(
                result.message ?? 'Paystack request failed',
            );
        }

        return result.data as T;
    }

    async createSubaccount(input: {
        businessName: string;
        bankCode: string;
        accountNumber: string;
        email?: string;
    }) {
        return this.request<{
            subaccount_code: string;
            account_name: string;
            account_number: string;
            settlement_bank: string;
            currency: string;
        }>('/subaccount', 'POST', {
            business_name: input.businessName,
            settlement_bank: input.bankCode,
            account_number: input.accountNumber,
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
