import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentsService } from './payments.service';

@Controller('webhooks/paystack')
export class PaystackWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  private verifySignature(
    rawBody: Buffer,
    signatureHeader?: string,
  ) {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;

    if (!secret || !signatureHeader) {
      return false;
    }

    // Current Paystack signatures may contain multiple v1 entries.
    const candidates = signatureHeader
      .split(',')
      .filter((part) => part.trim().startsWith('v1='))
      .map((part) => part.trim().slice(3));

    // Also accept the legacy plain hexadecimal signature format.
    if (!candidates.length) {
      candidates.push(signatureHeader.trim());
    }

    const expected = createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    return candidates.some((candidate) => {
      const supplied = candidate.includes(':')
        ? candidate.slice(candidate.lastIndexOf(':') + 1)
        : candidate;

      if (!/^[a-f0-9]{128}$/i.test(supplied)) {
        return false;
      }

      const expectedBuffer = Buffer.from(expected, 'hex');
      const suppliedBuffer = Buffer.from(supplied, 'hex');

      return (
        expectedBuffer.length === suppliedBuffer.length &&
        timingSafeEqual(expectedBuffer, suppliedBuffer)
      );
    });
  }

  @Post()
  @HttpCode(200)
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const rawBody = request.rawBody;

    if (!rawBody || !this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException(
        'Invalid Paystack webhook signature',
      );
    }

    const event = request.body;

    if (event.event === 'charge.success') {
      const reference = event.data?.reference;

      if (reference) {
        await this.payments.verifyAndConfirm(reference);
      }
    }

    return { received: true };
  }
}