// Field types supported by the form system
export type FieldType =
  // Text inputs
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'textarea'
  // Selection
  | 'dropdown'
  | 'searchable_dropdown'
  | 'checkbox'
  | 'checkbox_group'
  | 'radio'
  | 'choice_chips'
  | 'filter_chips'
  | 'switch'
  // Date/Time
  | 'date_picker'
  | 'time_picker'
  | 'date_time_picker'
  | 'date_range_picker'
  // Numeric
  | 'slider'
  | 'value_slider' // branded single-value slider (percent / currency / number)
  | 'range_slider'
  | 'touch_spin'
  | 'touchSpin' // alias
  | 'rating'
  // Special
  | 'color_picker'
  | 'signature_pad'
  | 'typeahead'
  | 'file_picker'
  | 'image_picker'
  | 'section_header'
  | 'hidden'
  // Smart-form: confirm-this-prefilled-value widget. The renderer reads
  // `prefill_source` on the question and looks up the matching payload
  // in the bag returned by prefill_endorsement_for_candidate(). When the
  // user picks Edit, the renderer falls through to `fallback_question_type`.
  | 'prefilled_confirm'
  // Grouped optional references (1-3) with an "add another" button
  | 'reference_block'
  // iOS (Cupertino) - render as standard on web
  | 'cupertino_text_field'
  | 'cupertino_checkbox'
  | 'cupertino_switch'
  | 'cupertino_slider'
  | 'cupertino_segmented_control'
  | 'cupertino_sliding_segmented_control'
  // Legacy/aliases
  | 'select'
  | 'tel'
  | 'date';

// Conditional logic operators
export type ConditionalOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'isEmpty'
  | 'isNotEmpty';

// Option for select-type fields
export interface FieldOption {
  value: string;
  label: string;
}

// Validation configuration
export interface ValidationConfig {
  required?: boolean;
  email?: boolean;
  url?: boolean;
  minLength?: number;
  maxLength?: number;
  minWordsCount?: number;
  maxWordsCount?: number;
  numeric?: boolean;
  integer?: boolean;
  min?: number;
  max?: number;
  phoneNumber?: boolean;
  alphabetical?: boolean;
  match?: string; // regex pattern
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  pattern?: string; // legacy: regex pattern
  message?: string; // custom error message
}

// Form field configuration
export interface FormFieldConfig {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  help?: string;
  required: boolean;
  enabled?: boolean;
  defaultValue?: any;

  // Options (for dropdown, radio, checkbox_group, chips)
  options?: FieldOption[];

  // Validators
  validatorTypes?: string[];
  validation?: ValidationConfig;

  // Text field properties
  maxLength?: number;
  minLines?: number;
  maxLines?: number;
  rows?: number; // legacy for textarea
  keyboardType?: string;

  // Numeric properties
  minValue?: number;
  maxValue?: number;
  initialValue?: number;
  step?: number;
  divisions?: number;
  // Slider display (value_slider): how to format the live value + ticks, and
  // whether the max is open-ended (renders the top value with a trailing "+").
  sliderFormat?: 'percent' | 'currency' | 'number';
  openEnded?: boolean;
  /** Unit appended to a number-format slider's live value (e.g. "years", "hrs/week"). */
  sliderUnit?: string;
  /** Field id whose numeric value a percent slider multiplies to show "≈ $X". */
  derivedFromField?: string;
  // checkbox_group: cap how many options can be selected (e.g. "up to 3").
  maxSelections?: number;

  // Date/Time properties
  firstDate?: string;
  lastDate?: string;
  dateFormat?: string;
  timeFormat?: string;

  // File upload properties
  allowedExtensions?: string[];
  allowMultipleFiles?: boolean;
  maxFileSizeMB?: number;
  fileTypeFilter?: 'any' | 'image' | 'video' | 'audio' | 'custom';

  // Image picker properties
  maxImages?: number;
  imageQuality?: number;
  maxImageWidth?: number;
  maxImageHeight?: number;
  allowCamera?: boolean;
  allowGallery?: boolean;

  // Conditional logic
  conditionalFieldId?: string;
  conditionalOperator?: ConditionalOperator;
  conditionalValue?: any;
  showWhenConditionMet?: boolean;

  // Multi-page forms
  pageNumber?: number;

  // Display properties
  prefixText?: string;
  suffixText?: string;
  hintText?: string;

  // When true on a radio/checkbox_group, selecting the "Other" option
  // reveals a free-text input. The typed value is stored as a sibling
  // form_data entry under `<fieldId>_other_text`.
  allow_other?: boolean;

  // When true on a text field, render a Google Places Autocomplete
  // dropdown below the input. Selecting a suggestion fills the value
  // with the street-address portion (number + route). Only useful on the
  // Street Address field today; opt-in per schema.
  places_autocomplete?: boolean;

  // Map from Google address-component type (locality, administrative_area
  // _level_1, postal_code, etc) to the form field id that should receive
  // that component's long name when the user selects a place. Used with
  // places_autocomplete to auto-populate city/state/zip from the address.
  places_fill_map?: Record<string, string>;
}

// Form styling configuration
export interface FormStyling {
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
}

// Form confirmation configuration
export interface FormConfirmation {
  message?: string;
  redirectUrl?: string;
}

// Supporting document configuration
export interface SupportingDocument {
  id: string;
  url: string;
  name: string;
  path: string;
  size: number;
  uploaded_at: string;
  content_type: string;
}

// Form schema structure (stored in form_schemas.schema)
export interface FormSchema {
  fields: FormFieldConfig[];
  styling?: FormStyling;
  confirmation?: FormConfirmation;
  supporting_documents?: SupportingDocument[];
}

// Form settings structure (stored in form_schemas.settings)
export interface FormSettings {
  showProgressBar?: boolean;
  allowSaveDraft?: boolean;
  showFieldNumbers?: boolean;
  submitButtonText?: string;
  theme?: 'light' | 'dark' | 'auto';
}

// Full form record from form_schemas table
export interface FormRecord {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  title: string;
  description: string | null;
  preview_text: string | null;
  form_type: 'survey' | 'registration' | 'feedback' | 'vote';
  schema: FormSchema;
  settings: FormSettings | null;
  status: 'draft' | 'active' | 'closed' | 'archived';
  slug: string;
  page_count: number;
  submission_count: number;
  opens_at: string | null;
  closes_at: string | null;
  max_submissions: number | null;
  require_login: boolean;
  one_submission_per_user: boolean;
  notification_emails: string[] | null;
  confirmation_email_template: string | null;
  template_id: string | null;
  voting_starts_at: string | null;
  voting_ends_at: string | null;
  eligible_members: any | null;
  results_public: boolean;
  results_data: any | null;
  show_back_button?: boolean;
  public_form?: boolean;
}

// Form submission record
export interface FormSubmission {
  id: string;
  created_at: string;
  form_id: string;
  member_id: string | null;
  subscriber_id: string | null;
  data: Record<string, any>;
  submitter_email: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
  file_urls: string[] | null;
  page_data: Record<string, any> | null;
  status: 'draft' | 'submitted' | 'reviewed' | 'processed';
  ip_address: string | null;
  user_agent: string | null;
}

// Analytics event types
export type FormAnalyticsEventType = 'view' | 'start' | 'submit' | 'abandon';
export type FieldAnalyticsEventType = 'interaction' | 'validation_error' | 'skip' | 'time_spent';

// Form analytics record
export interface FormAnalytics {
  id: string;
  created_at: string;
  form_id: string;
  user_id: string | null;
  member_id: string | null;
  event_type: FormAnalyticsEventType;
  timestamp: string;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
}

// Field analytics record
export interface FormFieldAnalytics {
  id: string;
  created_at: string;
  form_id: string;
  field_id: string;
  field_type: string;
  user_id: string | null;
  member_id: string | null;
  event_type: FieldAnalyticsEventType;
  timestamp: string;
  metadata: Record<string, any> | null;
}

// Form template record
export interface FormTemplate {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  description: string | null;
  category: 'General' | 'Feedback' | 'Events' | 'Employment' | 'Nonprofit' | 'Marketing';
  icon: string | null;
  schema: FormSchema;
  settings: FormSettings | null;
  is_public: boolean;
  is_system: boolean;
  use_count: number;
}

// Form file record
export interface FormFile {
  id: string;
  created_at: string;
  submission_id: string | null;
  form_id: string;
  field_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  storage_bucket: string;
  public_url: string | null;
  metadata: Record<string, any> | null;
  uploaded_by: string | null;
  member_id: string | null;
}

// Form availability check result
export interface FormAvailability {
  available: boolean;
  reason?: string;
}

// File upload result from API
export interface FileUploadResult {
  url: string;
  path: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  field_id?: string;
}

// Utility function to normalize field types (handle aliases)
export function normalizeFieldType(type: string): FieldType {
  const aliases: Record<string, FieldType> = {
    'touchSpin': 'touch_spin',
    'select': 'dropdown',
    'tel': 'phone',
    'date': 'date_picker',
    'file_upload': 'file_picker',
    'file': 'file_picker',
    'image_upload': 'image_picker',
    // Open-ended prose questions. Without these the CRM's 'long_answer' type
    // fell through to the renderer's default single-line TextInput, so a long
    // question ("Why are you running?") got a cramped one-line box — the
    // "awkward space under the question" report. Map them to a real textarea.
    'long_answer': 'textarea',
    'long_text': 'textarea',
    'paragraph': 'textarea',
    'multiline': 'textarea',
    'short_answer': 'text',
  };
  return (aliases[type] || type) as FieldType;
}

// Check form availability
export function checkFormAvailability(form: FormRecord): FormAvailability {
  if (form.status !== 'active') {
    return { available: false, reason: 'This form is not currently active.' };
  }

  const now = new Date();

  if (form.opens_at && new Date(form.opens_at) > now) {
    return {
      available: false,
      reason: `This form opens on ${new Date(form.opens_at).toLocaleDateString()}.`,
    };
  }

  if (form.closes_at && new Date(form.closes_at) < now) {
    return { available: false, reason: 'This form is closed.' };
  }

  if (form.max_submissions && form.submission_count >= form.max_submissions) {
    return { available: false, reason: 'This form has reached its submission limit.' };
  }

  return { available: true };
}
