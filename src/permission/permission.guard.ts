// // src/common/guards/permission.guard.ts
// import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { PERMISSION_KEY } from '../auth/decoration/setMetadata'; // Đảm bảo đường dẫn đúng

// @Injectable()
// export class PermissionGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     // Lấy permission yêu cầu từ metadata
//     const requiredPermission = this.reflector.get<string>(
//       PERMISSION_KEY,
//       context.getHandler()
//     );

//     // Nếu route không yêu cầu permission cụ thể => cho qua
//     if (!requiredPermission) return true;

//     const request = context.switchToHttp().getRequest();
//     const user = request.user;

//     // Populate role → permissions
//     await user.populate({
//       path: 'role',
//       populate: { path: 'permissions' },
//     });

//     // Lấy danh sách permission của user
//     const userPermissions = user.role?.permissions?.map((p: any) => p.name);

//     // Kiểm tra người dùng có permission cần thiết không
//     await userPermissions.includes(requiredPermission);
//     if (!userPermissions || !userPermissions.includes(requiredPermission)) {
//       throw new BadRequestException("you don't have permissioon to do this"); // Không có quyền truy cập
//     }
//     return true; // Người dùng có quyền truy cập
//   }
// }
