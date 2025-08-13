/* eslint-disable */

import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import helmet from 'helmet';
import { VersioningType } from '@nestjs/common/enums/version-type.enum';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/interceptors/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { join } from 'path';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const reflector = app.get(Reflector);
  app.use(cookieParser());
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));
  app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), { prefix: '/uploads/' });
  const configService = app.get(ConfigService);
  const port = configService.get<string>('PORT');
  app.enableCors({
  allowedHeaders: ['content-type', 'authorization'],
  origin: configService.get<string>('FE_URL') || 'http://localhost:3000',
  credentials: true,
});
 app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.use(helmet());
  app.enableVersioning({
    defaultVersion: '1',
    prefix: 'api/v',
    type: VersioningType.URI
  });
   app.useGlobalPipes(new ValidationPipe({ whitelist: true,transform: true, forbidNonWhitelisted: true }));

  await app.listen(port || 8080);
}
bootstrap();


