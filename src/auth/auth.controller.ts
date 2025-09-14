/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CustomMessage, Public, User } from './decoration/setMetadata';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @CustomMessage('Login User')
  login(@Request() req, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(req.user, res);
  }

  @Post('register')
  @CustomMessage('Register User')
  @Public()
  register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }
  @Get('refresh')
  @Public()
  @CustomMessage('Refresh Token')
  async refresh(@Res({ passthrough: true }) response: Response) {
    const refreshToken = response.req.cookies['refreshToken'];
    return this.authService.refreshToken(refreshToken, response);
  }
  @Post('logout')
  @CustomMessage('Logout User')
  @Public()
  async logout(@Res({ passthrough: true }) response: Response) {
    return this.authService.logout(response);
  }

  @Get('profile')
  @CustomMessage('Get current user profile')
  async getProfile(@User() user: any) {
    if (!user || !user._id) {
      return { error: 'User not found or not authenticated.' };
    }
    const fullUser = await this.userService.findUserWithRoleAndPermissions(
      user._id
    );
    let permissions: string[] = [];
    const role: any =
      fullUser && typeof fullUser.role === 'object' && fullUser.role
        ? fullUser.role
        : null;
    if (role && Array.isArray(role.permissions)) {
      permissions = role.permissions.map((p: any) =>
        typeof p === 'object' ? p.name : p
      );
    }
    return {
      user: fullUser,
      permissions,
    };
  }
}
