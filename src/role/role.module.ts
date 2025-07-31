import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema';
import {
  Permission,
  PermissionSchema,
} from 'src/permission/schemas/permission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
    // nếu có circular dependency, dùng forwardRef
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService], // để module khác có thể dùng RoleService nếu cần
})
export class RoleModule {}
