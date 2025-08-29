// src/config/supabase.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseConfig } from './supabase.config';

@Module({
  imports: [ConfigModule],
  providers: [SupabaseConfig],
  exports: [SupabaseConfig], // export để các module khác có thể inject
})
export class SupabaseModule {}
