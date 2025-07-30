import { PickType } from '@nestjs/mapped-types';
import { Guest } from '../schemas/guest.schema';

export class UpdateGuestDto extends PickType(Guest, ['isPaid']) {}
