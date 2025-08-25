import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../auth/decoration/setMetadata';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (
      !user ||
      !user.role ||
      !user.role.permissions ||
      user.role.permissions.length === 0
    ) {
      throw new ForbiddenException('User has no role or permissions');
    }

    const userPermissions = user.role.permissions.map((p: any) =>
      typeof p === 'string' ? p : p.name,
    );

    // Nếu muốn yêu cầu tất cả quyền
    // const hasPermission = requiredPermissions.every((perm) =>
    //   userPermissions.includes(perm),
    // );

    // Nếu chỉ cần 1 quyền khớp
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
