import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RestaurantDocument = Restaurant & Document;

@Schema({ timestamps: true })
export class Restaurant {
  @Prop({ required: true, unique: true })
  name: string; // Tên nhà hàng

  @Prop()
  description?: string; // Mô tả

  @Prop()
  logo?: string; // URL logo

  @Prop()
  favicon?: string; // URL favicon

  @Prop()
  coverImage?: string; // Ảnh cover

  // Branding Colors
  @Prop({
    type: {
      primary: { type: String, default: '#1e40af' },
      secondary: { type: String, default: '#f59e0b' },
      accent: { type: String, default: '#10b981' },
      background: { type: String, default: '#101826' },
    },
    default: {
      primary: '#1e40af',
      secondary: '#f59e0b',
      accent: '#10b981',
      background: '#101826',
    },
  })
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };

  // Contact Information
  @Prop({
    type: {
      phone: String,
      email: String,
      address: String,
      city: String,
      country: String,
      zipCode: String,
    },
  })
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    zipCode?: string;
  };

  // Social Media Links
  @Prop({ type: Map, of: String })
  socialLinks?: Record<string, string>;

  // Business Hours
  @Prop({
    type: [
      {
        day: { type: String, required: true },
        open: { type: String, required: true },
        close: { type: String, required: true },
        isClosed: { type: Boolean, default: false },
      },
    ],
  })
  businessHours?: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];

  // Homepage Content
  @Prop()
  homepageTitle?: string;

  @Prop()
  homepageSubtitle?: string;

  @Prop()
  homepageDescription?: string;

  // SEO Settings
  @Prop({
    type: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
  })
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  // Payment Settings
  @Prop({
    type: {
      currency: { type: String, default: 'VND' },
      currencySymbol: { type: String, default: 'đ' },
      taxRate: { type: Number, default: 0 },
      serviceCharge: { type: Number, default: 0 },
    },
  })
  payment?: {
    currency: string;
    currencySymbol: string;
    taxRate: number;
    serviceCharge: number;
  };

  // Features Toggle
  @Prop({
    type: {
      enableReservation: { type: Boolean, default: true },
      enableDelivery: { type: Boolean, default: true },
      enableQROrder: { type: Boolean, default: true },
      enableLoyalty: { type: Boolean, default: true },
    },
    default: {
      enableReservation: true,
      enableDelivery: true,
      enableQROrder: true,
      enableLoyalty: true,
    },
  })
  features?: {
    enableReservation: boolean;
    enableDelivery: boolean;
    enableQROrder: boolean;
    enableLoyalty: boolean;
  };

  // Domain/Subdomain (for multi-tenant)
  @Prop({ unique: true, sparse: true })
  domain?: string;

  @Prop({ unique: true, sparse: true })
  subdomain?: string;

  // Active status
  @Prop({ default: true })
  isActive: boolean;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

