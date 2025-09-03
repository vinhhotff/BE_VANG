// src/user/user.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
// 👇 Nếu có import AuthModule
import { FileModule } from 'src/file/file.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_SECRET_TOKEN_SECRET'
        ),
        signOptions: {
          expiresIn:
            configService.get<string>('JWT_EXPIRATION_TIME') || '3600s',
        },
      }),
      inject: [ConfigService],
    }),
    FileModule, // ✅ Không import AuthModule nữa
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService,MongooseModule],
})
export class UserModule {}
