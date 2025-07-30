// dto/update-payment.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-pay-ment.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}
