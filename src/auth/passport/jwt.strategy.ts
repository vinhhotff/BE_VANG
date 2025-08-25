/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUser } from 'src/user/user.interface';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { Model } from 'mongoose';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
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
    const user = await this.userModel
      .findById(payload._id || payload.sub)
      .populate({
        path: 'role',
        model: 'Role', // Ensure the model is specified for population
        populate: { path: 'permissions', model: 'Permission' },
      })
      .lean();

    if (!user) throw new UnauthorizedException();

    return {
       _id: user._id,
      email: user.email,
      role: typeof user.role === 'object' && user.role !== null && 'permissions' in user.role
        ? {
            _id: user.role._id,
            name: typeof user.role === 'object' && user.role !== null && 'name' in user.role ? (user.role as any).name : undefined,
            permissions: Array.isArray(user.role.permissions)
              ? user.role.permissions.map((p: any) =>
                  typeof p === 'string' ? p : p.name,
                )
              : [],
          }
        : user.role, // fallback to ObjectId if not populated
    };
  }

}