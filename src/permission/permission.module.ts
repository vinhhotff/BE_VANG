import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { RoleService } from 'src/role/role.service';
import { RoleModule } from 'src/role/role.module';
import { Role, RoleSchema } from 'src/role/schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Permission.name, schema: PermissionSchema }]),
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),

  ],
  controllers: [PermissionController],
  providers: [PermissionService],
})
export class PermissionModule { }
