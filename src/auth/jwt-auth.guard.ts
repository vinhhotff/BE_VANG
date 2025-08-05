import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decoration/setMetadata';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Allow access to public routes, but still attempt to authenticate
    // so that user information can be available if a token is provided.
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is public and there's no user (or an error),
    // don't throw an error, just return null.
    if (isPublic && (err || !user)) {
      return null;
    }

    // For protected routes, if there's an error or no user, throw an exception.
    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized access');
    }

    // For both public and protected routes, if authentication is successful,
    // return the user.
    return user;
  }
}
