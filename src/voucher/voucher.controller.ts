import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import { Permission, Public } from '../auth/decoration/setMetadata';
import { VoucherStatus } from './schemas/voucher.schema';

@Controller('vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Permission('voucher:create')
  @Post()
  create(
    @Body(ValidationPipe) createVoucherDto: CreateVoucherDto,
    @Req() req?: any
  ) {
    const userId = req?.user?._id;
    return this.voucherService.create(createVoucherDto, userId);
  }

  @Permission('voucher:findAll')
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: VoucherStatus,
    @Query('search') search?: string
  ) {
    return this.voucherService.findAll(
      parseInt(page),
      parseInt(limit),
      status,
      search
    );
  }

  @Public()
  @Get('active')
  getActiveVouchers() {
    return this.voucherService.getActiveVouchers();
  }

  @Permission('voucher:stats')
  @Get('stats')
  getStats() {
    return this.voucherService.getVoucherStats();
  }

  @Permission('voucher:findOne')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.voucherService.findById(id);
  }

  @Permission('voucher:findByCode')
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.voucherService.findByCode(code);
  }

  @Permission('voucher:update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateVoucherDto: UpdateVoucherDto,
    @Req() req?: any
  ) {
    const userId = req?.user?._id;
    return this.voucherService.update(id, updateVoucherDto, userId);
  }

  @Permission('voucher:remove')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.voucherService.remove(id);
  }

  @Public()
  @Post('validate')
  validateVoucher(@Body(ValidationPipe) validateVoucherDto: ValidateVoucherDto) {
    return this.voucherService.validateVoucher(validateVoucherDto);
  }

  @Permission('voucher:use')
  @Post('use/:code')
  useVoucher(
    @Param('code') code: string,
    @Req() req?: any
  ) {
    const userId = req?.user?._id;
    return this.voucherService.useVoucher(code, userId);
  }

  @Permission('voucher:updateExpired')
  @Post('update-expired')
  updateExpiredVouchers() {
    return this.voucherService.updateExpiredVouchers();
  }
}
