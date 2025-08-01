import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MESSAGE_KEY } from '../../auth/decoration/setMetadata';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const message = this.reflector.getAllAndOverride<string>(MESSAGE_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);

        return {
          statusCode: context.switchToHttp().getResponse().statusCode,
          message: message || 'Success',
          data: data,
          timestamp: new Date().toISOString(),
        };
      })
    );
  }
}
//format data if success
