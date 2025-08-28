import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AboutDocument = About & Document;

@Schema({ timestamps: true })
export class About {
  @Prop({ required: true })
  title: string;

  @Prop([
    {
      type: {
        type: String,
        enum: ['text', 'image', 'video', 'team', 'quote'],
        required: true,
      },
      title: String,
      content: String,
      url: String,
      teamMembers: [
        {
          name: { type: String, required: true },
          role: { type: String, required: true },
          photo: String,
        },
      ],
      quote: String,
      order: { type: Number, default: 0 },
    },
  ])
  sections: {
    type: 'text' | 'image' | 'video' | 'team' | 'quote';
    title?: string;
    content?: string;
    url?: string;
    teamMembers?: {
      name: string;
      role: string;
      photo?: string;
    }[];
    quote?: string;
    order: number;
  }[];

  @Prop({
    type: {
      email: String,
      phone: String,
    },
  })
  contact?: {
    email?: string;
    phone?: string;
  };

  @Prop({ type: Map, of: String })
  socialLinks?: Record<string, string>;

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
}

export const AboutSchema = SchemaFactory.createForClass(About);

export type SectionType = 'text' | 'image' | 'video' | 'team' | 'quote';

export interface ISection {
  _id?: string;
  title?: string;
  content?: string;
  type: SectionType; // phải khớp với schema
  url?: string;
  teamMembers?: {
    name: string;
    role: string;
    photo?: string;
  }[];
  quote?: string;
  order: number;
}

export interface IAbout {
  _id?: string;
  sections: ISection[];
}
