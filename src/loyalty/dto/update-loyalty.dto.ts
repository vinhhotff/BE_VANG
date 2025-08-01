import { PartialType } from '@nestjs/mapped-types';
import { CreateLoyaltyDto } from './create-loyalty.dto';

export class UpdateLoyaltyDto extends PartialType(CreateLoyaltyDto) {}
