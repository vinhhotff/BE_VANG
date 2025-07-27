import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
  ], controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleModule,RoleService], // Exporting RoleService if needed in other modules
})
export class RoleModule { }
