// Database types
export type AppRole = 'admin' | 'moderator';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Customer {
  id: string;
  session_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferences: Record<string, unknown>;
  notes: string | null;
  member_status: 'guest' | 'member' | 'vip';
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  session_id: string;
  started_at: string;
  last_message_at: string;
  context_summary: string | null;
  metadata: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  rich_content: RichContent[] | null;
  rating: number | null;
  created_at: string;
}

export interface AdminInstruction {
  id: string;
  content: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QAOverride {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeUrl {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  content: string | null;
  last_scraped_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface KnowledgeFile {
  id: string;
  filename: string;
  storage_path: string;
  content: string | null;
  file_type: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminAlert {
  id: string;
  message: string;
  conversation_id: string | null;
  severity: 'low' | 'medium' | 'high';
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

export interface ClubImage {
  id: string;
  url: string;
  storage_path: string;
  category: string;
  title: string;
  description: string | null;
  tags: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface SocialLink {
  id: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'youtube' | 'tiktok';
  url: string;
  icon: string;
  display_name: string;
  is_active: boolean;
  display_order: number;
}

export interface QuickAction {
  id: string;
  label: string;
  action_type: 'message' | 'link' | 'phone' | 'email';
  action_data: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

export interface MessageRating {
  id: string;
  message_id: string;
  rating: 1 | 5; // 1 = thumbs down, 5 = thumbs up
  feedback_text: string | null;
  created_at: string;
}

export interface RatedAnswer {
  id: string;
  question: string;
  answer: string;
  rating: number;
  feedback: string | null;
  conversation_id: string | null;
  created_at: string;
}

// Rich content types for AI responses
export type RichContentType =
  | 'image'
  | 'weather'
  | 'map'
  | 'social'
  | 'contact'
  | 'link'
  | 'gallery';

export interface RichContentBase {
  type: RichContentType;
}

export interface ImageRichContent extends RichContentBase {
  type: 'image';
  url: string;
  caption?: string;
  alt?: string;
}

export interface WeatherRichContent extends RichContentBase {
  type: 'weather';
  temperature: number;
  conditions: string;
  icon: string;
  humidity?: number;
  wind_speed?: number;
  recommendation?: string;
}

export interface MapRichContent extends RichContentBase {
  type: 'map';
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  zoom?: number;
}

export interface SocialRichContent extends RichContentBase {
  type: 'social';
  platform: string;
  url: string;
  label: string;
}

export interface ContactRichContent extends RichContentBase {
  type: 'contact';
  phone?: string;
  whatsapp?: string;
  email?: string;
}

export interface LinkRichContent extends RichContentBase {
  type: 'link';
  url: string;
  title: string;
  description?: string;
  image?: string;
}

export interface GalleryRichContent extends RichContentBase {
  type: 'gallery';
  images: Array<{
    url: string;
    caption?: string;
  }>;
}

export type RichContent =
  | ImageRichContent
  | WeatherRichContent
  | MapRichContent
  | SocialRichContent
  | ContactRichContent
  | LinkRichContent
  | GalleryRichContent;

// Chat response from edge function
export interface ChatResponse {
  response: string;
  rich_content?: RichContent[];
  quick_actions?: Array<{
    label: string;
    action: string;
  }>;
  suggestions?: string[];
  customer_update?: {
    interests?: string[];
    last_topic?: string;
  };
  message_id?: string;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  role: AppRole | null;
}

// Analytics types
export interface DailyStats {
  date: string;
  total_conversations: number;
  total_messages: number;
  unique_customers: number;
  average_rating: number;
}

export interface TopQuestion {
  question: string;
  count: number;
  last_asked: string;
}
