import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secretOrPrivateKey: configService.get<string>(
              'JWT_SECRET_TOKEN_SECRET'
            ),
            signOptions: {
              expiresIn:
                configService.get<string>('JWT_EXPIRATION_TIME') || '3600s',
            },
          }),
          inject: [ConfigService],
        }),
  ],

  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export UserService if needed in other modules
})
export class UserModule {}
