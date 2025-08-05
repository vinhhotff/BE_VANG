import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Permission } from './auth/decoration/setMetadata';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Permission('app:getHello')
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
