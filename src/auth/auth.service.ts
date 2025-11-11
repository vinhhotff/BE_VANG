/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { Response } from 'express';
import { IUser } from 'src/user/user.interface';
import { Role } from 'src/role/schemas/role.schema';
import { RoleService } from 'src/role/role.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService)) // ✅ forwardRef ở đây
    private userService: UserService,
    private jwtService: JwtService,
    private readonly configService: ConfigService, // Thêm ConfigService nếu cần
    private roleService: RoleService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findUserByEmail(email); // đảm bảo tên hàm đúng

    if (!user) {
      return null; // không tìm thấy user, trả về null
    }

    const isValidPassword = await this.userService.validatePassword(
      pass,
      user.password
    );

    if (!isValidPassword) {
      throw new BadRequestException('Invalid password');
    }

    return user; // xác thực thành công
  }

  async login(user: any, res: Response) {
    const payload = {
      _id: user._id,
      email: user.email,
      username: user.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.configService.get<string>('JWT_SECRET_TOKEN_SECRET'),
    });
    const refreshToken = await this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_EXPIRATION_REFRESHTOKEN_TIME'
      ),
      secret: this.configService.get<string>('JWT_SECRET_TOKEN_SECRET'), // Sử dụng cùng secret
    });
    const hashedRefreshToken =
      await this.userService.hashedSomething(refreshToken);
    await this.userService.updateRefreshToken(user._id, hashedRefreshToken);
    // Set cả accessToken và refreshToken cookies
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction, // Chỉ secure khi production
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction, // Chỉ secure khi production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    const findNameRole = await this.roleService.findById(user.role.toString());
    return {
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: findNameRole.name,
      },
    };
  }

  async register(user: RegisterUserDto) {
    const newUser = await this.userService.register(user);
    if (!newUser) {
      throw new Error('User registration failed');
    }
    const register = {
      email: newUser.email,
      name: newUser.name,
      _id: newUser._id,
    };
    return register;
  }

  refreshToken = async (refreshToken: string, res: Response) => {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token not found');
    }

    const user = await this.userService.findUserByAccessToken(refreshToken);
    if (!user) {
      throw new BadRequestException('Invalid refresh token');
    }

    // Lấy role từ RoleService
    const findNameRole = await this.roleService.findById(user.role.toString());

    const payload = {
      _id: user._id,
      email: user.email,
      username: user.name,
      role: findNameRole.name, // ✅ dùng tên thay vì ObjectId
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.configService.get<string>('JWT_SECRET_TOKEN_SECRET'),
    });

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return {
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: findNameRole.name, // ✅ luôn trả tên
      },
    };
  };

  async logout(res: Response) {
    const refreshToken = res.req.cookies['refreshToken'];

    // Ép kiểu trả về là IUser, nếu không thể sửa service thì dùng as IUser
    const user = (await this.userService.findUserByAccessToken(
      refreshToken
    )) as unknown as IUser;

    if (!user || !user._id) {
      return { message: 'User not found or already logged out' };
    }

    // Ép kiểu ObjectId thành string
    const userId = user._id.toString();

    await this.userService.updateRefreshToken(userId, '');

    // Xoá cookie ở client
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return { message: 'Logout successful' };
  }
}
