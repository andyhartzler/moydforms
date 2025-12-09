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

// The actual schema structure from the database
// fields array contains the vote options directly (e.g., Aye, Nay, Present)
export interface VoteSchema {
  fields: VoteOption[];
  settings?: {
    showDescriptions?: boolean;
  };
}

// Vote option - represents a single voting choice
export interface VoteOption {
  id: string;
  label: string;
  description?: string | null;
  votes?: number;
  image_url?: string;
}

export interface VoteSubmissionResult {
  success: boolean;
  error?: string;
}
