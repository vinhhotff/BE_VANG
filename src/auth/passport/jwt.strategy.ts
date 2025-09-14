import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { Model } from 'mongoose';

interface IAuthUser {
  _id: string;
  email: string;
  role: {
    _id: string;
    name: string;
    permissions: string[];
  } | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET_TOKEN_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const accessToken = req.cookies?.accessToken;
          const refreshToken = req.cookies?.refreshToken;

          if (accessToken) return accessToken;
          if (refreshToken) return refreshToken;

          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any): Promise<IAuthUser> {
    const user = await this.userModel
      .findById(payload._id || payload.sub)
      .populate({
        path: 'role',
        model: 'Role',
        populate: { path: 'permissions', model: 'Permission' },
      })
      .lean();

    if (!user) throw new UnauthorizedException();

    const role: any = user.role;

    return {
      _id: user._id.toString(),
      email: user.email,
      role: role
        ? {
            _id: role._id?.toString(),
            name: role.name,
            permissions: Array.isArray(role.permissions)
              ? role.permissions.map((p: any) =>
                  typeof p === 'string' ? p : p.name
                )
              : [],
          }
        : null,
    };
  }
}
