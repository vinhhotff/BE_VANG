import { Module, forwardRef } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { RoleModule } from 'src/role/role.module';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';
import { UserModule } from 'src/user/user.module';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Permission.name, schema: PermissionSchema },{ name: Role.name, schema: RoleSchema }]),
    forwardRef(() => UserModule),
  ],
  controllers: [PermissionController],
  providers: [PermissionService, PermissionGuard],
  exports: [PermissionService, PermissionGuard],
})
export class PermissionModule {}
