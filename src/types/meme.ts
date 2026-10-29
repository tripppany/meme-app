export interface BaseLayer {
  id: string;
  x: number;
  y: number;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
  strokeColor: string;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  img: HTMLImageElement;
  dataUrl?: string;
  width: number;
  height: number;
}

export type CanvasLayer = TextLayer | ImageLayer;

export interface MemeTemplate {
  id: string;
  title: string;
  url: string;
  isCustom?: boolean;
  isHidden?: boolean;
  createdAt?: number;
}

export interface MemeItem {
  id: string;
  dataUrl: string;
  author: string;
  realAuthor?: string;
  isAnonymous?: boolean;
  timestamp: number;
  status: 'pending' | 'approved';
}

export interface TelegramUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}
