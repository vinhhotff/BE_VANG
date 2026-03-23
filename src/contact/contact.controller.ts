import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto, UpdateContactDto, ReplyContactDto } from './dto/contact.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, Public } from '../auth/decoration/setMetadata';
import { Role } from '../role/schemas/role.schema';
import { ContactStatus } from './schemas/contact.schema';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // ========== Public: Submit Contact Form ==========
  @Post()
  @ApiOperation({ summary: 'Submit a new contact message' })
  async create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  // ========== Admin: Get All Contacts ==========
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as unknown as Role)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all contact messages (Admin only)' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: ContactStatus,
  ) {
    return this.contactService.findAll(
      parseInt(page) || 1,
      parseInt(limit) || 10,
      status,
    );
  }

  // ========== Admin: Get Contact Stats ==========
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as unknown as Role)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact statistics (Admin only)' })
  async getStats() {
    return this.contactService.getStats();
  }

  // ========== Admin: Get Single Contact ==========
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as unknown as Role)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single contact by ID (Admin only)' })
  async findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  // ========== Admin: Update Contact Status ==========
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as unknown as Role)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update contact status (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    return this.contactService.update(id, updateContactDto);
  }

  // ========== Admin: Reply to Contact ==========
  @Post(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as unknown as Role)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a contact (Admin only)' })
  async reply(
    @Param('id') id: string,
    @Body() replyContactDto: ReplyContactDto,
    @Request() req: any,
  ) {
    return this.contactService.reply(id, replyContactDto, req.user);
  }

  // ========== Admin: Accept Contact ==========
  @Post(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as unknown as Role)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark contact as accepted/read (Admin only)' })
  async accept(@Param('id') id: string) {
    return this.contactService.accept(id);
  }

  // ========== Admin: Reject Contact ==========
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as unknown as Role)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject/close a contact (Admin only)' })
  async reject(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.contactService.reject(id, reason);
  }

  // ========== Admin: Delete Contact ==========
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin' as unknown as Role)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a contact (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }
}
