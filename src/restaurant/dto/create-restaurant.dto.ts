import { IsString, IsOptional, IsObject, IsBoolean, IsArray, IsNumber } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  favicon?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsObject()
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };

  @IsOptional()
  @IsObject()
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    zipCode?: string;
  };

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @IsOptional()
  @IsArray()
  businessHours?: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];

  @IsOptional()
  @IsString()
  homepageTitle?: string;

  @IsOptional()
  @IsString()
  homepageSubtitle?: string;

  @IsOptional()
  @IsString()
  homepageDescription?: string;

  @IsOptional()
  @IsObject()
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  @IsOptional()
  @IsObject()
  payment?: {
    currency?: string;
    currencySymbol?: string;
    taxRate?: number;
    serviceCharge?: number;
  };

  @IsOptional()
  @IsObject()
  features?: {
    enableReservation?: boolean;
    enableDelivery?: boolean;
    enableQROrder?: boolean;
    enableLoyalty?: boolean;
  };

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  subdomain?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

