import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, IS_PUBLIC_KEY } from '../auth/decoration/setMetadata';
import { UserService } from '../user/user.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermission = this.reflector.get<string>(
      PERMISSION_KEY,
      context.getHandler()
    );

    // If the route is public and doesn't require a specific permission, allow access.
    if (isPublic && !requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If there's no user, and the route is not public, deny access.
    if (!user && !isPublic) {
      throw new UnauthorizedException('User not found in request');
    }

    // If no specific permission is required, and we have a user (or it's a public route), allow access.
    if (!requiredPermission) {
      return true;
    }
    
    // If the route is public but requires a permission, we still need to check the user's permissions.
    // If there's no user at this point, it means it's a public route, but they can't access it without the right permission.
    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    const fullUser = await this.userService.findUserWithRoleAndPermissions(user._id);
    
    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    const role: any = fullUser.role;
    const userPermissions = Array.isArray(role?.permissions) ? role.permissions.map((p: any) => p.name) : [];

    if (!userPermissions.includes(requiredPermission)) {
      throw new BadRequestException(`You don't have permission: ${requiredPermission}`);
    }
    
    return true;
  }
}
