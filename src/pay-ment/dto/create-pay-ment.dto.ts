import { IsEnum, IsNotEmpty, IsNumber, IsDateString, IsMongoId } from 'class-validator';

export class CreatePaymentDto {
    @IsEnum(['cash', 'qr'])
    method: 'cash' | 'qr';

    @IsNumber()
    amount: number;

    @IsDateString()
    paidAt: Date;

    @IsMongoId()
    guest: string;
    @IsMongoId()
    user: string;
    @IsMongoId({ each: true })
    orders: string[];
}