import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { AboutService } from './about.service';
import { About, IAbout, ISection } from './schemas/about.schema';

@Controller('about')
export class AboutController {
  constructor(private readonly aboutService: AboutService) {}

  @Get()
  async getAbout(): Promise<About> {
    return this.aboutService.getAbout();
  }

  @Patch(':id')
  async updateAbout(
    @Param('id') id: string,
    @Body() body: IAbout
  ): Promise<About> {
    return this.aboutService.updateAbout(id, body);
  }

  // ✅ Update 1 section con
  @Patch(':aboutId/sections/:sectionId')
  async updateSection(
    @Param('aboutId') aboutId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: ISection
  ): Promise<About> {
    return this.aboutService.updateSection(aboutId, sectionId, body);
  }
}
