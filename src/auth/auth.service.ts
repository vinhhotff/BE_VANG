/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { Response } from 'express';
import { IUser } from 'src/user/user.interface';
import { stringify } from 'querystring';
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private readonly configService: ConfigService, // Thêm ConfigService nếu cần
  ) { }

 async validateUser(email: string, pass: string): Promise<any> {
  const user = await this.userService.findUserByEmail(email); // đảm bảo tên hàm đúng

  if (!user) {
    return null; // không tìm thấy user, trả về null
  }

  const isValidPassword = await this.userService.validatePassword(pass, user.password);

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
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.configService.get<string>('JWT_SECRET_TOKEN_SECRET'),
    });

    const refreshToken = await this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION_REFRESHTOKEN_TIME'),
      secret: this.configService.get<string>('JWT_SECRET_REFRESHTOKEN_SECRET'),
    });
    const hashedRefreshToken = await this.userService.hashedSomething(refreshToken);
    await this.userService.updateRefreshToken(user._id, hashedRefreshToken);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return {
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
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
    const payload = {
      _id: user._id.toString(),
      email: user.email,
      username: user.name,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION_TIME'),
      secret: this.configService.get<string>('JWT_SECRET_TOKEN_SECRET'),
    });
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
    });
    return { accessToken, user };
  }

  async logout(res: Response) {
  const user = await this.userService.findUserByAccessToken(res.req.cookies['refreshToken']);
  await this.userService.updateRefreshToken(user._id.toString(), '');

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
