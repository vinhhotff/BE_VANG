// src/common/enums/permission.enum.ts

export enum PermissionEnum {
  // PermissionController
  PERMISSION_CREATE = 'permission:create',
  PERMISSION_READ = 'permission:read',
  PERMISSION_READ_ID = 'permission:read:id',
  PERMISSION_DELETE = 'permission:delete',

  // RoleController
  ROLE_CREATE = 'role:create',
  ROLE_READ = 'role:read',
  ROLE_READ_ID = 'role:read:id',
  ROLE_DELETE = 'role:delete',

  // UserController
  USER_CREATE = 'user:create',
  USER_READ = 'user:read', //FindAll
  USER_READ_ID = 'user:read:id',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
}
