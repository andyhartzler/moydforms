export interface VoteInfo {
  vote_id: string | null;
  vote_title: string | null;
  vote_description: string | null;
  vote_status: 'not_found' | 'not_active' | 'not_started' | 'ended' | 'open';
  voting_starts_at: string | null;
  voting_ends_at: string | null;
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
  session_token: string;
  error?: string;
}

export interface VoteSchema {
  fields: VoteField[];
  settings?: {
    showDescriptions?: boolean;
  };
}

export interface VoteField {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'ranked_choice' | 'yes_no';
  label: string;
  description?: string;
  required?: boolean;
  options?: VoteOption[];
}

export interface VoteOption {
  id: string;
  label: string;
  description?: string;
  image_url?: string;
}

export interface VoteSubmissionResult {
  success: boolean;
  error?: string;
}
