export interface VoteInfo {
  vote_id: string | null;
  vote_title: string | null;
  vote_description: string | null;
  vote_status: 'not_found' | 'not_active' | 'not_started' | 'ended' | 'open';
  voting_starts_at: string | null;
  voting_ends_at: string | null;
  executive_only?: boolean;
  supporting_documents?: SupportingDocument[] | null;
  session_token: string;
}

export interface MemberVerification {
  success: boolean;
  is_member: boolean;
  member_id: string | null;
  member_name: string | null;
  already_voted: boolean;
  vote_id: string | null;
  vote_title: string | null;
  vote_description: string | null;
  vote_schema: VoteSchema | null;
  vote_status: 'not_found' | 'not_active' | 'not_started' | 'ended' | 'open';
  voting_starts_at: string | null;
  voting_ends_at: string | null;
  is_eligible: boolean;
  eligibility_reason: string | null;
  supporting_documents?: SupportingDocument[] | null;
  session_token: string;
  error?: string;
}

// Supporting document
export interface SupportingDocument {
  id: string;
  url: string;
  name: string;
  path: string;
  size: number;
  uploaded_at: string;
  content_type: string;
}

// Vote question types
export type QuestionType = 'multiple_choice' | 'rating_scale' | 'multiple_select' | 'short_answer' | 'ranked_choice' | 'yes_no';

// Vote option - represents a single option in a question
export interface VoteOption {
  id: string;
  label: string;
  description?: string | null;
  votes?: number;
  image_url?: string;
}

// Vote question - represents a single question in a vote
export interface VoteQuestion {
  id: string;
  text: string;
  question_type: QuestionType;
  required: boolean;
  options?: VoteOption[];
  min_rating?: number;
  max_rating?: number;
}

// The actual schema structure from the database
// Updated to support both old (fields array) and new (questions array) structures
export interface VoteSchema {
  fields?: VoteOption[]; // Legacy: single main question
  questions?: VoteQuestion[]; // New: multiple questions
  settings?: {
    showDescriptions?: boolean;
  };
}

// Vote submission data
export type VoteSubmissionData = Record<string, unknown>;

export interface VoteSubmissionResult {
  success: boolean;
  error?: string;
  vote_id?: string;
}
