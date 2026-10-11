/**
 * Shared Type Definitions for RIT ECE Platform
 * Used across Web (React / TypeScript) and Mobile (Flutter/Dart bindings)
 */

export type UserRole = 'student' | 'alumni' | 'faculty' | 'admin' | 'moderator';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';
export type PostVisibility = 'public' | 'connections' | 'department' | 'community';
export type JobType = 'full_time' | 'internship' | 'part_time' | 'research_fellowship';
export type ApplicationStatus = 'submitted' | 'under_review' | 'shortlisted' | 'rejected' | 'accepted';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  headline: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  roll_number?: string;
  register_number?: string;
  department: string;
  role: UserRole;
  verification_status: VerificationStatus;
  batch_year?: number;
  graduation_year?: number;
  current_company?: string;
  current_position?: string;
  location?: string;
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  resume_url?: string;
  profile_completeness: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  author?: Profile;
  content: string;
  visibility: PostVisibility;
  tags: string[];
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  is_deleted: boolean;
  media?: PostMedia[];
  has_liked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: 'image' | 'video' | 'document';
  file_name?: string;
  file_size?: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author?: Profile;
  parent_comment_id?: string;
  content: string;
  created_at: string;
}

export interface UserConnection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  requester?: Profile;
  recipient?: Profile;
  created_at: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  title?: string;
  members: Profile[];
  last_message?: Message;
  unread_count?: number;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: Profile;
  content: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  posted_by: string;
  poster?: Profile;
  title: string;
  company: string;
  logo_url?: string;
  location: string;
  is_remote: boolean;
  job_type: JobType;
  domain: string;
  description: string;
  skills_required: string[];
  salary_range?: string;
  is_alumni_referral: boolean;
  application_url?: string;
  deadline?: string;
  is_active: boolean;
  created_at: string;
}

export interface Hackathon {
  id: string;
  title: string;
  organizer: string;
  banner_url?: string;
  description: string;
  theme: string;
  prize_pool?: string;
  team_size: string;
  event_start_date: string;
  event_end_date: string;
  registration_url: string;
  is_incubation_program: boolean;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  category: string;
  members_count: number;
  is_verified: boolean;
  is_member?: boolean;
}
