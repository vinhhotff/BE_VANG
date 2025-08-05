/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUser } from 'src/user/user.interface';
import { Request } from 'express';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET_TOKEN_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          // Thêm logging để debug
          const accessToken = req.cookies?.accessToken;
          const refreshToken = req.cookies?.refreshToken;
          
          if (accessToken) {
            return accessToken;
          }
          if (refreshToken) {
            return refreshToken;
          }
          
          return null;
        },
        // Fallback to Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),

      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    
    // Đảm bảo trả về đầy đủ thông tin user
    const user = {
      _id: payload._id || payload.sub,
      name: payload.username || payload.name,
      email: payload.email,
      role: payload.role,
    };
    
    return user;
  }
}