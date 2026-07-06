'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormFieldConfig, FormSchema, normalizeFieldType, FieldType, FileUploadResult } from '@/types/forms';
import { FileUploadInfo } from '@/lib/edgeFunction';
import { formatPhoneDisplay } from '@/lib/phone';
import {
  TextInput,
  TextArea,
  Select,
  RadioGroup,
  Checkbox,
  CheckboxGroup,
  Switch,
  ChipSelect,
  DatePicker,
  DateRangePicker,
  Slider,
  ValueSlider,
  RangeSlider,
  NumberStepper,
  StarRating,
  ColorPicker,
  SignaturePad,
  FileUpload,
  ImageUpload,
  Autocomplete,
  PlacesAutocomplete,
  PrefilledConfirm,
  ReferenceBlock,
} from '@/components/form-fields';
import type { PrefillPayload } from '@/components/form-fields';
import TrueFalseToggle from '@/components/form-fields/TrueFalseToggle';
import PromptCardTextArea from '@/components/form-fields/PromptCardTextArea';
import { Check, Loader2, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatedProgressBar, PageDots, StepCounter } from '@/components/motion/AnimatedProgress';
import { pageVariants, pageTransition, staggerContainer, fieldEntrance } from '@/lib/motion';
import { useServerDraft } from '@/hooks/useServerDraft';
import { ResumeModal } from './ResumeModal';
import { PolicyAreaBreadcrumb, POLICY_AREA_LABELS } from './PolicyAreaBreadcrumb';
// Authoritative Missouri ZIP -> dominant county map, built from the MO voter
// file (public.mo_voter_file, residential_zip5 + county). Kansas City is an
// election jurisdiction, not a county, so its ZIPs are resolved to the real
// underlying county (Jackson/Clay/Platte). Used to auto-fill County when the
// applicant types their address by hand.
import MO_ZIP_COUNTY from '@/data/mo-zip-county.json';

interface CustomFieldsStageProps {
  schema: FormSchema;
  identityValues: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
  onFieldBlur: (key: string, value: unknown, type?: string) => void;
  onSubmit: (finalData?: Record<string, unknown>, fileUploads?: FileUploadInfo[]) => Promise<boolean>;
  onBack?: () => void;
  isLoading: boolean;
  submitLabel?: string;
  onFileUpload?: (file: File, fieldId: string) => Promise<FileUploadResult>;
  /** Extra key/value pairs merged into submitted data (e.g. candidate_id). */
  extraFormData?: Record<string, unknown>;
  /** Show the Young Dem vs Partner track reveal banner once DOB is answered. */
  showTrackBanner?: boolean;
  /**
   * Opt-in localStorage autosave. When set, drafts are persisted under
   * `moyd-form-draft:<autosaveKey>` and the user is offered a "Pick up where
   * you left off?" banner on next load. Useful for long/surveyed forms like
   * the endorsement questionnaire (65+ questions).
   */
  autosaveKey?: string | null;
  /**
   * Smart-form prefill bag — keys map to `prefill_source` strings on
   * questions of type `prefilled_confirm`. Each value is shaped
   * `{value, display, source, confidence}` and comes from the Supabase
   * RPC `prefill_endorsement_for_candidate(<candidate_id>)`.
   */
  prefillData?: Record<string, PrefillPayload> | null;
}

// Patterns to detect identity fields by ID or label
const PHONE_PATTERNS = ['phone', 'mobile', 'cell', 'telephone', 'tel'];
const NAME_PATTERNS = ['name', 'full_name', 'fullname', 'your_name', 'yourname'];
const EMAIL_PATTERNS = ['email', 'e_mail', 'email_address', 'emailaddress'];
const ZIP_PATTERNS = ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postalcode'];

// Fields that are about somebody (or something) OTHER than the person filling
// out the form must never be absorbed into the identity stage. Without this
// guard, the endorsement questionnaire's "Reference 1 — Phone", "Campaign
// treasurer name", "Name of the Democratic incumbent", etc. were stripped
// from the form and silently overwritten with the submitter's own
// name/phone/email at submit time. 'preferred' is here because
// "Preferred name (if different)" is by definition distinct from the
// identity-stage legal name and must stay an answerable question.
const THIRD_PARTY_FIELD_EXCLUSIONS = [
  'ref_', 'reference', 'treasurer', 'incumbent', 'opponent', 'manager',
  'consultant', 'committee', 'witness', 'preferred',
  // 'home_' address-page fields (home_zip especially) are their own answerable
  // questions on the "Where you live" page — home_zip matches the ZIP identity
  // pattern and was being absorbed into the identity stage, so it never rendered
  // and couldn't be auto-filled from the Places selection.
  'home_',
];

type IdentityFieldType = 'phone' | 'name' | 'email' | 'zip_code' | null;

// Map question_type values to FieldType values
// `prefilled_confirm` is part of the FieldType union (see types/forms.ts).
const QUESTION_TYPE_MAP: Record<string, FieldType> = {
  'short_answer': 'text',
  'long_answer': 'textarea',
  'textarea': 'textarea',
  'phone': 'phone',
  'email': 'email',
  'radio': 'radio',
  'dropdown': 'dropdown',
  'checkbox': 'checkbox',
  'checkbox_group': 'checkbox_group',
  'file_upload': 'file_picker',
  'date': 'date_picker',
  'date_picker': 'date_picker',
  'time': 'time_picker',
  'time_picker': 'time_picker',
  'number': 'number',
  'url': 'url',
  'hidden': 'text',
  'section_header': 'section_header',
  // Smart-form widget — see PrefilledConfirm.tsx. The renderer treats this
  // as its own type and only falls through to `fallback_question_type`
  // (mapped via this same table) when the user picks Edit.
  'prefilled_confirm': 'prefilled_confirm',
};

// Condition type from schema
interface SimpleCondition {
  field: string;
  value: string;
}

// Show the field once another field has any non-empty answer (e.g. reveal the
// campaign-manager email only after a manager name is entered).
interface NotEmptyCondition {
  field: string;
  notEmpty: true;
}

interface AndCondition {
  and: SimpleCondition[];
}

// Show the field when ANY of the listed field=value pairs match (e.g. reveal the
// FEC candidate ID only for federal offices: US House OR US Senate).
interface OrCondition {
  or: SimpleCondition[];
}

type Condition = SimpleCondition | NotEmptyCondition | AndCondition | OrCondition;

// Question format from new schema (questions array)
interface QuestionFormat {
  id: string;
  text: string;
  question_type: string;
  /** v2 schema exposes a coarse `type` ("true_false", "long_text", ...) next
   *  to the narrower HTML widget hint `question_type`. We preserve it so
   *  the renderer can use it to pick specialty widgets (TrueFalseToggle,
   *  PromptCardTextArea, ...) without regressing generic radio/textarea
   *  behavior. */
  type?: string;
  required?: boolean;
  options?: Array<{ id?: string; value: string; label: string; aligned?: boolean; spectrum?: string }>;
  placeholder?: string;
  helper_text?: string;
  description?: string;
  validation?: Record<string, unknown>;
  condition?: Condition;
  page?: number;
  file_config?: Record<string, unknown>;
  /** v2 endorsement schema metadata — carried into the field config so the
   *  renderer can surface policy-area breadcrumbs and tune styling based on
   *  scoring weight, but NEVER sent back to the submit endpoint as anything
   *  other than the answer value itself (see finalData construction). */
  policy_area?: string;
  weight?: number;
  moyd_aligned_answer?: unknown;
  max_length?: number;
  min_length?: number;
  /**
   * Smart-form fields — see PrefilledConfirm.tsx + the migration
   * 20260507_01_prefill_endorsement_for_candidate.sql for the source
   * of truth on the JSON contract.
   *
   * `prefill_source` names the key the renderer looks up in the prefill
   * bag returned by the RPC. `fallback_question_type` is the editable
   * widget type the renderer mounts when the user picks Edit (or when
   * the RPC returned no value for this source).
   */
  prefill_source?: string;
  prefill_format?: 'currency' | 'text' | 'csv' | 'date';
  fallback_question_type?: string;
}

// Extended field config to include condition and section header info
interface ExtendedFieldConfig extends FormFieldConfig {
  isSectionHeader?: boolean;
  sectionDescription?: string;
  condition?: Condition;
  /** Raw snake_case smart-form keys as stored on fields[]-shape schemas in
   *  form_schemas.schema (see migration 20260507_01). Translated to the
   *  camelCase props below in normalizeSchemaToFields. */
  prefill_source?: string;
  prefill_format?: 'currency' | 'text' | 'csv' | 'date';
  fallback_question_type?: string;
  originalQuestionType?: string;
  /** v2 endorsement schema metadata — see QuestionFormat comment. */
  policyArea?: string;
  weight?: number;
  isTrueFalse?: boolean;
  isLongFormNarrative?: boolean;
  /** Smart-form metadata — see QuestionFormat. */
  prefillSource?: string;
  prefillFormat?: 'currency' | 'text' | 'csv' | 'date';
  fallbackQuestionType?: string;
}

// Extended schema type to handle both formats
interface ExtendedSchema extends FormSchema {
  questions?: QuestionFormat[];
}

// Normalize questions format to fields format (including section headers)
function normalizeSchemaToFields(schema: ExtendedSchema): ExtendedFieldConfig[] {
  // If schema has fields array, use it directly.
  // Fields with type="section_header" need isSectionHeader=true so the
  // renderer treats them as page intros instead of text inputs.
  //
  // Fields-format schemas store conditional visibility under
  // `conditional_visibility: {conditionalFieldId, conditionalValue, ...}`
  // but evaluateCondition() reads `condition: {field, value}`. Without
  // this translation, EVERY conditional field on the membership form
  // stays visible regardless of the controlling answer — the exact bug
  // that caused Committee Choices + School Name + Leadership fields
  // to show when they shouldn't.
  if (schema.fields && schema.fields.length > 0) {
    return (schema.fields as ExtendedFieldConfig[]).map((f) => {
      const translated: ExtendedFieldConfig = {
        ...f,
        isSectionHeader: f.isSectionHeader || f.type === 'section_header',
        // Smart-form (prefilled_confirm) metadata is stored snake_case on the
        // fields[] schema shape, but the renderer reads the camelCase props.
        // Without this mapping the prefill payload is never matched (no
        // confirm-card ever shows) and the fallback widget always degrades
        // to a bare text input — radio fallbacks lose their options.
        prefillSource: f.prefillSource ?? f.prefill_source,
        prefillFormat: f.prefillFormat ?? f.prefill_format,
        fallbackQuestionType: f.fallbackQuestionType ?? f.fallback_question_type,
      };
      // The FormBuilder writes conditional rules as flat properties on the
      // field itself — `conditionalFieldId` / `conditionalValue` /
      // `conditionalOperator` / `showWhenConditionMet`. evaluateCondition()
      // reads `condition.{field, value}`, so we translate once here.
      // `showWhenConditionMet=false` flips the polarity (field is visible
      // when the condition does NOT match), which we emulate by inverting
      // the value match at eval time — but in the current schema every
      // conditional uses showWhenConditionMet=true so we only implement
      // the forward case for now.
      if (f.conditionalFieldId && !translated.condition) {
        translated.condition = {
          field: f.conditionalFieldId,
          value: String(f.conditionalValue ?? ''),
        };
      }
      return translated;
    });
  }

  // If schema has questions array, convert to fields format
  if (schema.questions && schema.questions.length > 0) {
    return schema.questions
      .filter((q) => q.question_type !== 'hidden')
      .map((q): ExtendedFieldConfig => {
        const isTrueFalse = q.type === 'true_false';
        const isLongFormNarrative =
          q.type === 'long_text' ||
          q.question_type === 'long_answer' ||
          q.question_type === 'textarea';
        return {
          id: q.id,
          type: QUESTION_TYPE_MAP[q.question_type] || 'text',
          label: q.text,
          placeholder: q.placeholder,
          help: q.helper_text,
          required: q.required ?? false,
          options: q.options?.map((opt) => ({
            value: opt.value,
            label: opt.label,
          })),
          validation: {
            ...(q.validation as FormFieldConfig['validation'] ?? {}),
            // v2 schema surfaces min_length/max_length at the top level on
            // narrative prompts — promote them into validation so existing
            // validators light up without a separate code path.
            ...(q.min_length != null ? { minLength: q.min_length } : {}),
            ...(q.max_length != null ? { maxLength: q.max_length } : {}),
          },
          maxLength: q.max_length ?? undefined,
          pageNumber: q.page,
          allowedExtensions: q.file_config?.accept as string[] | undefined,
          maxFileSizeMB: q.file_config?.max_size_mb as number | undefined,
          // Extended properties
          isSectionHeader: q.question_type === 'section_header',
          sectionDescription: q.description,
          condition: q.condition,
          originalQuestionType: q.question_type,
          policyArea: q.policy_area,
          weight: q.weight,
          isTrueFalse,
          isLongFormNarrative,
          prefillSource: q.prefill_source,
          prefillFormat: q.prefill_format,
          fallbackQuestionType: q.fallback_question_type,
        };
      });
  }

  return [];
}

// Check if a field is an identity field and return which type
function getIdentityFieldType(field: ExtendedFieldConfig): IdentityFieldType {
  // Skip section headers
  if (field.isSectionHeader) return null;

  const idLower = field.id.toLowerCase().replace(/[-\s]/g, '_');
  const labelLower = field.label.toLowerCase().replace(/[-\s]/g, '_');
  const fieldType = field.type.toLowerCase();

  // Hard stop: third-party fields (references, treasurer, opponent, ...) are
  // questions, not identity — regardless of their input type.
  if (THIRD_PARTY_FIELD_EXCLUSIONS.some((e) => idLower.includes(e) || labelLower.includes(e))) {
    return null;
  }

  // Common exclusions for social media and secondary contact fields
  // These should NOT be treated as identity fields even if they have email/phone type
  // Note: "contact_" is NOT excluded because "contact_name", "contact_email", "contact_phone" ARE primary identity fields
  const socialMediaExclusions = ['twitter', 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'social_', 'secondary', 'backup', 'alternate', 'alt_', 'other_', 'work_', 'home_', 'personal_', 'business_', 'emergency', 'parent', 'guardian', 'spouse', 'partner', 'notification'];
  const isExcludedField = socialMediaExclusions.some((e) => idLower.includes(e) || labelLower.includes(e));

  // Check by field type first (most reliable), but skip if it's a secondary/social field
  if (!isExcludedField) {
    if (fieldType === 'phone' || fieldType === 'tel') return 'phone';
    if (fieldType === 'email') return 'email';
  }

  // Check phone patterns (but not secondary/social phone fields)
  const hasPhonePattern = PHONE_PATTERNS.some((p) => idLower.includes(p) || labelLower.includes(p));
  if (hasPhonePattern && !isExcludedField) {
    return 'phone';
  }

  // Check email patterns (but not secondary/social email fields)
  const hasEmailPattern = EMAIL_PATTERNS.some((p) => idLower.includes(p) || labelLower.includes(p));
  if (hasEmailPattern && !isExcludedField) {
    return 'email';
  }

  // Check name patterns (but not if it's clearly something else like "company_name")
  const nameExclusions = ['company', 'business', 'organization', 'event', 'product', 'project', 'chapter', 'school', 'college', 'university', 'username', 'user_name', 'screen_name', 'screenname', 'handle', 'twitter', 'instagram', 'facebook', 'tiktok', 'linkedin', 'social', 'website', 'domain', 'channel', 'youtube'];
  const hasNamePattern = NAME_PATTERNS.some((p) => idLower.includes(p) || labelLower.includes(p));
  const hasExclusion = nameExclusions.some((e) => idLower.includes(e) || labelLower.includes(e));
  if (hasNamePattern && !hasExclusion) {
    return 'name';
  }

  // Check zip patterns
  if (ZIP_PATTERNS.some((p) => idLower.includes(p) || labelLower.includes(p))) {
    return 'zip_code';
  }

  return null;
}

// Evaluate a condition against the current form data
function evaluateCondition(condition: Condition | undefined, formData: Record<string, unknown>): boolean {
  if (!condition) return true; // No condition means always show

  // Handle AND condition
  if ('and' in condition && Array.isArray(condition.and)) {
    return condition.and.every((c) => formData[c.field] === c.value);
  }

  // Handle OR condition (any match shows the field)
  if ('or' in condition && Array.isArray(condition.or)) {
    return condition.or.some((c) => {
      const fv = formData[c.field];
      return Array.isArray(fv) ? fv.includes(c.value) : fv === c.value;
    });
  }

  // Handle "reveal once another field is non-empty"
  if ('field' in condition && 'notEmpty' in condition && condition.notEmpty) {
    const v = formData[condition.field];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null && String(v).trim() !== '';
  }

  // Handle simple condition. For a multiselect controlling field (array value),
  // treat the condition as "value is among the selected" so e.g. an "Other,
  // please name" text field shows when "Other" is one of the checked options.
  if ('field' in condition && 'value' in condition) {
    const fv = formData[condition.field];
    if (Array.isArray(fv)) return fv.includes(condition.value);
    return fv === condition.value;
  }

  return true; // Unknown condition format, show by default
}

export function CustomFieldsStage({
  schema,
  identityValues,
  onFieldChange,
  onFieldBlur,
  onSubmit,
  onBack,
  isLoading,
  submitLabel = 'Submit',
  onFileUpload,
  extraFormData,
  showTrackBanner,
  autosaveKey,
  prefillData,
}: CustomFieldsStageProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageDirection, setPageDirection] = useState(1);
  // Highest page the respondent has reached. Every page up to here has already
  // passed validation once, so its step dot is safe to jump straight to (in
  // either direction) — this is what lets someone who reached the end hop back
  // to the last page again instead of being stuck.
  const [maxVisitedPage, setMaxVisitedPage] = useState<number>(1);
  // Anchor at the very top of the current page's fields, so navigating scrolls
  // the new QUESTIONS to the top — not the persistent identity card + progress
  // bar, which otherwise shoved the actual content down to mid-screen.
  const pageTopRef = useRef<HTMLDivElement>(null);
  const fieldFocusTime = useRef<Record<string, number>>({});
  const [showRestoreBanner, setShowRestoreBanner] = useState<boolean>(false);

  // Server-side draft, keyed by the respondent's phone + form slug. Persists to
  // Supabase (RLS-locked table via SECURITY DEFINER RPCs) so a candidate can
  // resume on any device. The slug is the part of autosaveKey before the ':';
  // the phone comes from the identity stage.
  const draftSlug = autosaveKey ? autosaveKey.split(':')[0] : null;
  const draftPhone = typeof identityValues?.phone === 'string' ? identityValues.phone : null;
  const {
    available: savedDraft,
    clearDraft,
    dismiss: ackDraft,
  } = useServerDraft({
    slug: draftSlug,
    phone: draftPhone,
    formData,
    page: currentPage,
    enabled: !!autosaveKey,
  });

  // Surface the resume modal once, when a server draft is found.
  useEffect(() => {
    if (savedDraft && !showRestoreBanner) {
      setShowRestoreBanner(true);
    }
  }, [savedDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestoreDraft = useCallback(() => {
    if (!savedDraft) return;
    const draftValues = savedDraft.data;
    const draftPage = savedDraft.page;
    if (draftValues && typeof draftValues === 'object') {
      setFormData(draftValues);
      Object.entries(draftValues).forEach(([k, v]) => onFieldChange(k, v));
    }
    if (typeof draftPage === 'number') {
      setCurrentPage(draftPage);
    }
    setShowRestoreBanner(false);
    ackDraft();
  }, [savedDraft, onFieldChange, ackDraft]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setShowRestoreBanner(false);
  }, [clearDraft]);

  // Derive `dob_is_young_dem` synthetic flag from date_of_birth for schemas that
  // use age-gated branching (e.g. endorsement-questionnaire-2026 pages 10 vs 11).
  // Writes 'true'/'false' string back into formData so evaluateCondition can match.
  // Cutoff is 36 — MOYD's Young Dems definition (35 and under).
  useEffect(() => {
    const dob = formData.date_of_birth;
    // Only derive the track once the birthdate is COMPLETE and plausible.
    // Guarding on a full ISO date (YYYY-MM-DD) + a sane birth-year range stops
    // the Young-Dem/Partner banner from flickering while the year is still being
    // typed (e.g. "1" → "19" → "1998" would each parse to a different age).
    if (typeof dob !== 'string') return;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
    if (!m) return;
    const year = Number(m[1]);
    const currentYear = new Date().getFullYear();
    // No one applying to run for office is under 16 or over 120.
    if (year < currentYear - 120 || year > currentYear - 16) return;
    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) return;
    const ageYears = (Date.now() - dobDate.getTime()) / (365.25 * 24 * 3600 * 1000);
    const flag = ageYears < 36 ? 'true' : 'false';
    if (formData.dob_is_young_dem !== flag) {
      setFormData((prev) => ({ ...prev, dob_is_young_dem: flag }));
    }
  }, [formData.date_of_birth, formData.dob_is_young_dem]);

  // Get all fields from schema
  const allFields = useMemo(() => normalizeSchemaToFields(schema as ExtendedSchema), [schema]);

  // Pre-fill plain fields from the smart-form prefill bag (campaign committee
  // name, treasurer, etc.) so an identified candidate sees their info already
  // filled in — editable, and WITHOUT the "we have this on file / confirm
  // correct" card. Only fills a field that's currently empty, so it never
  // clobbers a resumed draft or something the user already typed.
  useEffect(() => {
    if (!prefillData) return;
    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };
      allFields.forEach((f) => {
        const src = f.prefillSource;
        if (!src) return;
        if (normalizeFieldType(f.type) === 'prefilled_confirm') return; // card owns its value
        const payload = prefillData[src];
        if (!payload || payload.value == null || payload.value === '') return;
        const cur = next[f.id];
        if (cur !== undefined && cur !== null && cur !== '') return;
        next[f.id] = payload.value;
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [prefillData, allFields]);

  // Does this form use the home_zip / home_county address convention? Only then
  // do we run the ZIP -> county autofill below.
  const hasZipCountyPair = useMemo(
    () => allFields.some((f) => f.id === 'home_zip') && allFields.some((f) => f.id === 'home_county'),
    [allFields]
  );

  // Auto-fill County from a Missouri ZIP the applicant types. Places
  // autocomplete would normally populate county via places_fill_map, but it's
  // unavailable while Google Maps billing is down, so most people enter their
  // address by hand and County was being left blank. When home_zip is a
  // complete 5-digit MO ZIP we look it up in MO_ZIP_COUNTY and set County.
  // lastAutoCounty tracks the value we set so we only ever overwrite our own
  // autofill (or an empty field) and never clobber a county the user typed.
  const lastAutoCounty = useRef<string | null>(null);
  useEffect(() => {
    if (!hasZipCountyPair) return;
    const raw = formData.home_zip;
    const zip = typeof raw === 'string' ? raw.trim().slice(0, 5) : '';
    if (!/^\d{5}$/.test(zip)) return;
    const county = (MO_ZIP_COUNTY as Record<string, string>)[zip];
    if (!county) return;
    const cur = formData.home_county;
    const curEmpty = cur === undefined || cur === null || cur === '';
    // Respect a county the applicant typed themselves.
    if (!curEmpty && cur !== lastAutoCounty.current) return;
    if (cur === county) {
      lastAutoCounty.current = county;
      return;
    }
    lastAutoCounty.current = county;
    handleFieldChange('home_county', county);
  }, [formData.home_zip, formData.home_county, hasZipCountyPair]); // eslint-disable-line react-hooks/exhaustive-deps

  // Separate identity fields from custom fields
  const { identityFieldMappings, customFields } = useMemo(() => {
    const mappings: Array<{ field: ExtendedFieldConfig; identityKey: IdentityFieldType }> = [];
    const custom: ExtendedFieldConfig[] = [];

    allFields.forEach((field) => {
      const identityType = getIdentityFieldType(field);
      if (identityType) {
        mappings.push({ field, identityKey: identityType });
      } else {
        custom.push(field);
      }
    });

    return { identityFieldMappings: mappings, customFields: custom };
  }, [allFields]);

  // Check if a field should be visible based on its condition
  const shouldShowField = useCallback(
    (field: ExtendedFieldConfig): boolean => {
      return evaluateCondition(field.condition, formData);
    },
    [formData]
  );

  // Get unique page numbers — only pages with at least one VISIBLE,
  // answerable field count. A page whose every question is condition-gated
  // off (e.g. the endorsement questionnaire's Partner track page when the
  // candidate is on the Young Dem track) is skipped entirely instead of
  // rendering as a blank "Please review your information" interstitial.
  const pageNumbers = useMemo(() => {
    const pages = new Set<number>();
    customFields.forEach((f) => {
      if (!f.pageNumber) return;
      if (f.isSectionHeader) return; // headers alone don't make a page
      if (!shouldShowField(f)) return;
      pages.add(f.pageNumber);
    });
    return Array.from(pages).sort((a, b) => a - b);
  }, [customFields, shouldShowField]);

  const totalPages = pageNumbers.length || 1;
  const isMultiPage = totalPages > 1;

  // If answers change in a way that removes pages (totalPages shrank below
  // the page we're standing on), clamp so we never strand the user on a
  // page index that no longer exists.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Keep the furthest-reached marker in sync however the page changed (Next,
  // draft restore, age-track jump), clamped to the pages that currently exist.
  useEffect(() => {
    setMaxVisitedPage((m) => Math.min(Math.max(m, currentPage), totalPages));
  }, [currentPage, totalPages]);

  // Derive a policy-area label for the current page. We take the most common
  // policy_area among the page's scored questions — section headers and
  // narrative prompts don't count. This is the label rendered in the
  // breadcrumb above the question set ("Step 3 of 9 · Healthcare").
  const currentPagePolicyLabel = useMemo<string | null>(() => {
    if (!isMultiPage) return null;
    const targetPage = pageNumbers[currentPage - 1] || pageNumbers[0];
    const areaCounts: Record<string, number> = {};
    customFields.forEach((f) => {
      if (f.pageNumber !== targetPage) return;
      if (f.isSectionHeader) return;
      if (!f.policyArea || f.policyArea === 'narrative') return;
      areaCounts[f.policyArea] = (areaCounts[f.policyArea] || 0) + 1;
    });
    const sorted = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    const key = sorted[0][0];
    return POLICY_AREA_LABELS[key] || null;
  }, [customFields, pageNumbers, currentPage, isMultiPage]);

  // Weighted progress — instead of N/total-pages (each page worth the same),
  // weight each page by how many answerable fields live on it. Makes the
  // bar feel truthful on long forms where page 5 has 14 questions but page
  // 8 has just 4. Section headers don't count — they're pure chrome.
  const pageWeights = useMemo(() => {
    const weights: Record<number, number> = {};
    customFields.forEach((f) => {
      if (f.isSectionHeader) return;
      const pn = f.pageNumber ?? 1;
      weights[pn] = (weights[pn] || 0) + 1;
    });
    return weights;
  }, [customFields]);

  const weightedProgressPercent = useMemo(() => {
    if (!isMultiPage) return 100;
    const completedPages = pageNumbers.slice(0, currentPage - 1);
    const totalWeight = pageNumbers.reduce((acc, p) => acc + (pageWeights[p] || 1), 0);
    const completedWeight = completedPages.reduce((acc, p) => acc + (pageWeights[p] || 1), 0);
    // Add a half-weight for the current page (user is partway through it).
    const currentPageNum = pageNumbers[currentPage - 1];
    const inProgressWeight = (pageWeights[currentPageNum] || 1) * 0.15;
    return Math.min(100, ((completedWeight + inProgressWeight) / totalWeight) * 100);
  }, [currentPage, pageNumbers, pageWeights, isMultiPage]);

  // Get fields for current page that should be visible
  const currentPageFields = useMemo(() => {
    if (!isMultiPage) {
      // Single page form - show all custom fields that pass condition
      return customFields.filter(shouldShowField);
    }

    // Multi-page form - filter by page number and condition
    const targetPage = pageNumbers[currentPage - 1] || pageNumbers[0];
    return customFields
      .filter((f) => f.pageNumber === targetPage)
      .filter(shouldShowField);
  }, [customFields, currentPage, pageNumbers, isMultiPage, shouldShowField]);

  // Check if there are any visible fields on the current page
  const hasVisibleFields = currentPageFields.some((f) => !f.isSectionHeader);

  // Validation logic
  const validateField = (field: ExtendedFieldConfig, value: unknown): string | null => {
    // Skip section headers
    if (field.isSectionHeader) return null;

    // Skip hidden fields (condition not met)
    if (!shouldShowField(field)) return null;

    // Check required
    if (field.required) {
      if (value === undefined || value === null || value === '') {
        return `${field.label} is required`;
      }
      if (Array.isArray(value) && value.length === 0) {
        return `${field.label} is required`;
      }
    }

    // Skip further validation if empty and not required
    if (!value && !field.required) return null;

    const validation = field.validation || {};
    const validators = field.validatorTypes || [];

    // Email validation
    if (field.type === 'email' || validators.includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value as string)) {
        return 'Invalid email address';
      }
    }

    // Phone validation
    if ((field.type === 'phone' || field.type === 'tel' || validators.includes('phoneNumber')) && value) {
      const phoneRegex = /^[\d\s\-+()]+$/;
      if (!phoneRegex.test(value as string)) {
        return 'Invalid phone number';
      }
    }

    // Min length
    if (validation.minLength != null && typeof value === 'string' && value.length < validation.minLength) {
      return `Minimum length is ${validation.minLength} characters`;
    }

    // Max length
    const maxLength = validation.maxLength ?? field.maxLength;
    if (maxLength != null && typeof value === 'string' && value.length > maxLength) {
      return `Maximum length is ${maxLength} characters`;
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      try {
        const regex = new RegExp(validation.pattern as string);
        if (!regex.test(value)) {
          return validation.message || 'Invalid format';
        }
      } catch {
        // Invalid regex, skip validation
      }
    }

    return null;
  };

  const validateCurrentPage = (): boolean => {
    const newErrors: Record<string, string> = {};

    currentPageFields.forEach((field) => {
      if (field.isSectionHeader) return;
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAllFields = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    customFields.forEach((field) => {
      if (field.isSectionHeader) return;
      if (!shouldShowField(field)) return; // Skip hidden fields
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    setErrors(newErrors);
    return newErrors;
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    onFieldChange(fieldId, value);

    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleFieldFocus = (fieldId: string) => {
    fieldFocusTime.current[fieldId] = Date.now();
  };

  const handleFieldBlur = (fieldId: string, fieldType: string) => {
    const value = formData[fieldId];
    onFieldBlur(fieldId, value, fieldType);

    const startTime = fieldFocusTime.current[fieldId];
    if (startTime) {
      delete fieldFocusTime.current[fieldId];
    }
  };

  const goToNextPage = () => {
    if (validateCurrentPage()) {
      setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    }
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allErrors = validateAllFields();
    if (Object.keys(allErrors).length > 0) {
      // Errors can live on an EARLIER page than the one the submit button is
      // on (e.g. a conditional field that became required after the user
      // passed its page). Submitting silently while showing nothing is a
      // dead end — jump back to the first page that has an error so the
      // user can see and fix it.
      const firstErroredField = customFields.find((f) => allErrors[f.id]);
      if (firstErroredField?.pageNumber) {
        const pageIdx = pageNumbers.indexOf(firstErroredField.pageNumber);
        if (pageIdx >= 0 && pageIdx + 1 !== currentPage) {
          setPageDirection(-1);
          setCurrentPage(pageIdx + 1);
        }
      }
      setTimeout(() => {
        const firstErrorEl = document.querySelector('[class*="text-red-600"]');
        firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
      return;
    }

    // Build final data: start with identity values, overlay form answers, then
    // any caller-injected extras (e.g. candidate_id from a URL query param).
    // Extras win — they should never be overwritten by a user-typed value.
    const finalData: Record<string, unknown> = {
      ...identityValues,
      ...formData,
      ...(extraFormData || {}),
    };

    // Map identity values to the form's specific field IDs
    identityFieldMappings.forEach(({ field, identityKey }) => {
      if (identityKey && identityValues[identityKey] !== undefined) {
        finalData[field.id] = identityValues[identityKey];
      }
    });

    // Extract file upload info from form data for Edge Function processing
    const fileUploads: FileUploadInfo[] = [];
    customFields.forEach((field) => {
      const normalizedType = normalizeFieldType(field.type);
      if (normalizedType === 'file_picker' || normalizedType === 'image_picker') {
        const fieldValue = formData[field.id];
        if (fieldValue && Array.isArray(fieldValue)) {
          fieldValue.forEach((file: { name?: string; size?: number; type?: string; storage_path?: string }) => {
            if (file.storage_path) {
              fileUploads.push({
                field_id: field.id,
                storage_path: file.storage_path,
                file_name: file.name || 'unknown',
                file_size: file.size || 0,
                mime_type: file.type || 'application/octet-stream',
              });
            }
          });
        }
      }
    });

    const ok = await onSubmit(finalData, fileUploads);
    // Only clear the draft on a confirmed successful submit — if the caller
    // returns false we want the user's answers to survive a retry.
    if (ok !== false) {
      clearDraft();
    }
  };

  // Render a section header with animation. On the endorsement questionnaire
  // these are the page intros — bigger, bolder, with a gold accent bar and
  // (when available) a serif display face — so they read like a real chapter
  // break. The eyebrow shows the policy area when a page is policy-tagged.
  const renderSectionHeader = (field: ExtendedFieldConfig) => {
    const eyebrowLabel =
      field.policyArea && POLICY_AREA_LABELS[field.policyArea]
        ? POLICY_AREA_LABELS[field.policyArea]
        : null;
    return (
      <div key={field.id} className="mb-8 pb-6 border-b border-gray-100">
        {/* Gold accent bar lives in normal flow with a fixed gap below it, so it
            never crowds or overlaps the heading. It used to be absolutely
            positioned at top-0 and relied on the heading's top margin to clear
            it, which collapsed onto the text on mobile (tight leading + large
            display font). */}
        <div
          className="w-14 h-1 rounded-full mb-4"
          style={{
            background: 'linear-gradient(90deg, #FDB813 0%, #f0c04e 100%)',
          }}
        />
        {eyebrowLabel && (
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-moyd-unity/70">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-moyd-sunrise" />
            {eyebrowLabel}
          </div>
        )}
        <h3 className="font-display text-3xl sm:text-4xl font-semibold text-moyd-unity leading-[1.05] tracking-tight">
          {field.label}
        </h3>
        {field.sectionDescription && (
          <p className="mt-3 text-[15px] text-gray-600 leading-relaxed max-w-2xl">
            {field.sectionDescription}
          </p>
        )}
      </div>
    );
  };

  // Google Form parity: when a radio/checkbox field has allow_other=true and the
  // user picks (or ticks) an option whose value is "Other", show a free-text
  // input so they can specify. The typed value goes in form_data as a sibling
  // key `<fieldId>_other_text` — downstream code in the membership process
  // handler can read both the structured option AND the free-text.
  const renderWithOther = (field: ExtendedFieldConfig, value: unknown, node: JSX.Element) => {
    if (!field.allow_other) return node;
    const showOther = Array.isArray(value) ? value.includes('Other') : value === 'Other';
    if (!showOther) return node;
    const otherKey = `${field.id}_other_text`;
    const otherValue = (formData[otherKey] as string | undefined) ?? '';
    return (
      <div key={field.id}>
        {node}
        <div className="mb-5 -mt-2 ml-2 pl-4 border-l-2 border-primary-200">
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={otherKey}>
            Please specify
          </label>
          <input
            id={otherKey}
            type="text"
            value={otherValue}
            onChange={(e) => handleFieldChange(otherKey, e.target.value)}
            onBlur={() => handleFieldBlur(otherKey, 'text')}
            placeholder="Type your answer…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>
      </div>
    );
  };

  // Helper: render a non-section field by its `type` (or a coerced override
  // type for the fallback widget that prefilled_confirm pops out when the
  // user picks Edit). Extracted from renderField so prefilled_confirm can
  // pass its own fallback type through the same dispatch.
  const renderFieldByType = (
    field: ExtendedFieldConfig,
    coercedType: FieldType,
    value: unknown,
    error?: string,
  ): JSX.Element => {
    const normalizedType = normalizeFieldType(coercedType);
    const commonProps = {
      field,
      value,
      onChange: (val: unknown) => handleFieldChange(field.id, val),
      error,
      onFocus: () => handleFieldFocus(field.id),
      onBlur: () => handleFieldBlur(field.id, field.type),
    };

    switch (normalizedType) {
      case 'text':
      case 'email':
      case 'phone':
      case 'tel':
      case 'url':
      case 'number':
      case 'cupertino_text_field':
        if (field.places_autocomplete) {
          return (
            <PlacesAutocomplete
              key={field.id}
              {...commonProps}
              setField={(id, v) => handleFieldChange(id, v)}
            />
          );
        }
        return <TextInput key={field.id} {...commonProps} />;

      case 'textarea':
        return <TextArea key={field.id} {...commonProps} />;

      case 'dropdown':
      case 'select':
      case 'searchable_dropdown':
        return <Select key={field.id} {...commonProps} />;

      case 'radio':
        return renderWithOther(field, value, <RadioGroup key={field.id} {...commonProps} />);

      case 'checkbox':
      case 'cupertino_checkbox':
        if (!field.options || field.options.length === 0) {
          return <Checkbox key={field.id} {...commonProps} />;
        }
        return renderWithOther(field, value, <CheckboxGroup key={field.id} {...commonProps} />);

      case 'checkbox_group':
        return renderWithOther(field, value, <CheckboxGroup key={field.id} {...commonProps} />);

      case 'switch':
      case 'cupertino_switch':
        return <Switch key={field.id} {...commonProps} />;

      default:
        return <TextInput key={field.id} {...commonProps} />;
    }
  };

  // Render a single field
  const renderField = (field: ExtendedFieldConfig) => {
    // Render section headers specially
    if (field.isSectionHeader) {
      return renderSectionHeader(field);
    }

    const value = formData[field.id];
    const error = errors[field.id];
    const normalizedType = normalizeFieldType(field.type);

    // `excludeSelectedFrom` drops any option already chosen in another multiselect
    // (e.g. the "actively pursuing" list hides endorsements you've already marked
    // as received), so the two lists never overlap.
    let effectiveField = field;
    const exclFrom = (field as ExtendedFieldConfig & { excludeSelectedFrom?: string }).excludeSelectedFrom;
    if (exclFrom && Array.isArray(field.options)) {
      const chosen = formData[exclFrom];
      const chosenSet = new Set(Array.isArray(chosen) ? (chosen as unknown[]).map(String) : []);
      if (chosenSet.size > 0) {
        // "Other" is a catch-all — a candidate can have a different "other"
        // endorsement received vs pursuing, so it must stay selectable in both
        // lists even after it's picked in the excluded-from list.
        const isOther = (o: string | { value: string; label?: string }) => {
          const val = String(typeof o === 'string' ? o : o.value).toLowerCase();
          const lab = String(typeof o === 'string' ? o : (o.label ?? '')).toLowerCase();
          return val === 'other' || val.startsWith('other') || lab.startsWith('other');
        };
        effectiveField = {
          ...field,
          options: field.options.filter(
            (o) => isOther(o) || !chosenSet.has(String(typeof o === 'string' ? o : o.value))
          ),
        };
      }
    }

    const commonProps = {
      field: effectiveField,
      value,
      onChange: (val: unknown) => handleFieldChange(field.id, val),
      error,
      onFocus: () => handleFieldFocus(field.id),
      onBlur: () => handleFieldBlur(field.id, field.type),
    };

    // Smart-form prefilled_confirm — render the confirm/edit card with the
    // matching prefill payload. If the RPC didn't supply data for this
    // question's source, fall through to the editable widget (defined by
    // the question's `fallback_question_type`).
    if (normalizedType === 'prefilled_confirm') {
      const sourceKey = field.prefillSource;
      const payload = (sourceKey && prefillData?.[sourceKey]) || null;
      const fallbackTypeRaw = field.fallbackQuestionType || 'short_answer';
      const fallbackType = (QUESTION_TYPE_MAP[fallbackTypeRaw] || 'text') as FieldType;
      const fallbackNode = renderFieldByType(
        { ...field, type: fallbackType, isSectionHeader: false },
        fallbackType,
        value,
        error,
      );
      return (
        <PrefilledConfirm
          key={field.id}
          field={{
            id: field.id,
            label: field.label,
            help: field.help,
            required: field.required,
            fallback: fallbackNode,
          }}
          prefillPayload={payload}
          value={value}
          onChange={(val) => handleFieldChange(field.id, val)}
          error={error}
        />
      );
    }

    // Specialty widgets: prompt-card for marquee narrative prompt, pill-pair
    // for true/false. These are opt-in via schema metadata and short-circuit
    // the generic type-based dispatch below. The shape of `commonProps` stays
    // identical, so CustomFieldsStage's consumer contract is unchanged.
    if (field.isLongFormNarrative && (field.policyArea === 'narrative' || (field.weight ?? 0) === 0)) {
      return <PromptCardTextArea key={field.id} {...commonProps} />;
    }
    if (field.isTrueFalse && field.options && field.options.length === 2) {
      return <TrueFalseToggle key={field.id} {...commonProps} />;
    }

    switch (normalizedType) {
      case 'text':
      case 'email':
      case 'phone':
      case 'tel':
      case 'url':
      case 'number':
      case 'cupertino_text_field':
        if (field.places_autocomplete) {
          return (
            <PlacesAutocomplete
              key={field.id}
              {...commonProps}
              setField={(id, v) => handleFieldChange(id, v)}
            />
          );
        }
        return <TextInput key={field.id} {...commonProps} />;

      case 'textarea':
        return <TextArea key={field.id} {...commonProps} />;

      case 'dropdown':
      case 'select':
      case 'searchable_dropdown':
        return <Select key={field.id} {...commonProps} />;

      case 'radio':
        return renderWithOther(field, value, <RadioGroup key={field.id} {...commonProps} />);

      case 'checkbox':
      case 'cupertino_checkbox':
        if (!field.options || field.options.length === 0) {
          return <Checkbox key={field.id} {...commonProps} />;
        }
        return renderWithOther(field, value, <CheckboxGroup key={field.id} {...commonProps} />);

      case 'checkbox_group':
        return renderWithOther(field, value, <CheckboxGroup key={field.id} {...commonProps} />);

      case 'switch':
      case 'cupertino_switch':
        return <Switch key={field.id} {...commonProps} />;

      case 'choice_chips':
      case 'cupertino_segmented_control':
      case 'cupertino_sliding_segmented_control':
        return <ChipSelect key={field.id} {...commonProps} multiple={false} />;

      case 'filter_chips':
        return <ChipSelect key={field.id} {...commonProps} multiple={true} />;

      case 'date_picker':
      case 'date':
      case 'time_picker':
      case 'date_time_picker':
        return <DatePicker key={field.id} {...commonProps} />;

      case 'date_range_picker':
        return <DateRangePicker key={field.id} {...commonProps} />;

      case 'slider':
      case 'cupertino_slider':
        return <Slider key={field.id} {...commonProps} />;

      case 'value_slider':
        return <ValueSlider key={field.id} {...commonProps} />;

      case 'range_slider':
        return <RangeSlider key={field.id} {...commonProps} />;

      case 'touch_spin':
        return <NumberStepper key={field.id} {...commonProps} />;

      case 'rating':
        return <StarRating key={field.id} {...commonProps} />;

      case 'color_picker':
        return <ColorPicker key={field.id} {...commonProps} />;

      case 'signature_pad':
        return <SignaturePad key={field.id} {...commonProps} onFileUpload={onFileUpload} />;

      case 'typeahead':
        return <Autocomplete key={field.id} {...commonProps} />;

      case 'file_picker':
        return <FileUpload key={field.id} {...commonProps} onFileUpload={onFileUpload} />;

      case 'image_picker':
        return <ImageUpload key={field.id} {...commonProps} onFileUpload={onFileUpload} />;

      case 'reference_block':
        return (
          <ReferenceBlock
            key={field.id}
            field={field}
            formData={formData}
            setField={(id, v) => handleFieldChange(id, v)}
          />
        );

      default:
        return <TextInput key={field.id} {...commonProps} />;
    }
  };

  const isLastPage = currentPage >= totalPages;
  const isFirstPage = currentPage <= 1;
  const progressPercent = isMultiPage ? (currentPage / totalPages) * 100 : 100;

  // Override nav functions to track direction
  // Scroll so the NEW page's first question sits near the top of the viewport
  // (just under the site header), instead of scrolling to the whole form top
  // which re-shows the identity card + progress and pushes questions to
  // mid-screen. Runs after the page-transition animation has swapped content.
  const scrollToPageTop = () => {
    setTimeout(() => {
      const el = pageTopRef.current;
      if (!el) return;
      const y = window.scrollY + el.getBoundingClientRect().top - 88;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }, 120);
  };

  const scrollToFirstError = () => {
    const firstErrorEl = document.querySelector('[class*="text-red-600"]');
    firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const goToNextPageAnimated = () => {
    if (validateCurrentPage()) {
      setPageDirection(1);
      setCurrentPage((prev) => {
        const next = Math.min(prev + 1, totalPages);
        setMaxVisitedPage((m) => Math.max(m, next));
        return next;
      });
      scrollToPageTop();
    } else {
      scrollToFirstError();
    }
  };

  const goToPrevPageAnimated = () => {
    setPageDirection(-1);
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    scrollToPageTop();
  };

  // Aria-live error summary — screen readers announce when a new validation
  // error is surfaced on the current page. Polite so it doesn't interrupt.
  const errorCount = Object.keys(errors).length;
  const ariaErrorMessage = errorCount
    ? errorCount === 1
      ? 'One answer needs attention before you can continue.'
      : `${errorCount} answers need attention before you can continue.`
    : '';

  return (
    <form onSubmit={handleSubmit} className="custom-fields-form" noValidate>
      {/* Invisible aria-live region — announces validation changes to AT users
          without disturbing the visual layout. */}
      <div className="sr-only" aria-live="polite" role="status">
        {ariaErrorMessage}
      </div>

      {/* Identity summary with stagger animation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
      >
        <h3 className="text-sm font-medium text-gray-500 mb-3">Your Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: '📱', value: formatPhoneDisplay((identityValues.phone as string) || '') },
            { icon: '👤', value: (identityValues.name as string) || '' },
            { icon: '✉️', value: (identityValues.email as string) || '' },
            { icon: '📍', value: (identityValues.zip_code as string) || '' },
          ].filter(item => item.value).map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 400, damping: 25 }}
              className="flex items-center text-sm"
            >
              <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
              <span className="text-gray-600 truncate">{item.value}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Centered resume modal — surfaces when we find an unsubmitted,
          server-saved application for this phone number. */}
      <ResumeModal
        open={showRestoreBanner && !!savedDraft}
        updatedAt={savedDraft?.updatedAt}
        onResume={handleRestoreDraft}
        onStartOver={handleDiscardDraft}
      />

      {/* Multi-page progress indicator — step counter + segmented page dots,
          now with a weighted fill bar underneath and (for policy-tagged
          schemas) a policy-area breadcrumb replacing the bare "Step N of M".
          Each page's slice of the bar is proportional to how many real
          questions live on it, so page 5 (14 questions) advances the bar
          more than page 8 (4 questions). */}
      {isMultiPage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 mb-6"
        >
          <div className="flex items-center justify-between mb-3 gap-3">
            {currentPagePolicyLabel ? (
              <PolicyAreaBreadcrumb
                areaLabel={currentPagePolicyLabel}
                current={currentPage}
                total={totalPages}
              />
            ) : (
              <StepCounter current={currentPage} total={totalPages} />
            )}
            <PageDots
              total={totalPages}
              current={currentPage - 1}
              maxReached={maxVisitedPage - 1}
              onDotClick={(i) => {
                const target = i + 1;
                if (target === currentPage) return;
                if (target < currentPage) {
                  // Jumping BACK is always free.
                  setPageDirection(-1);
                  setCurrentPage(target);
                  scrollToPageTop();
                } else if (target <= maxVisitedPage) {
                  // Jumping FORWARD is allowed only to pages already completed
                  // (reached before), and only if the current page still
                  // validates so an error isn't carried past.
                  if (validateCurrentPage()) {
                    setPageDirection(1);
                    setCurrentPage(target);
                    scrollToPageTop();
                  } else {
                    scrollToFirstError();
                  }
                }
              }}
            />
          </div>
          <div
            className="relative h-1.5 w-full rounded-full bg-gray-100 overflow-hidden"
            role="progressbar"
            aria-label="Form completion"
            aria-valuenow={Math.round(weightedProgressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, #273351 0%, #FDB813 55%, #f0c04e 100%)',
                boxShadow: '0 0 12px rgba(253,184,19,0.45)',
              }}
              initial={false}
              animate={{ width: `${weightedProgressPercent}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            />
          </div>
        </motion.div>
      )}

      {/* Track reveal banner — appears once DOB is answered and animates the
          Young Dem vs Partner Candidate badge in. Only rendered when the
          caller opts in (showTrackBanner) so we don't touch unrelated forms. */}
      {showTrackBanner &&
        (formData.dob_is_young_dem === 'true' ||
          formData.dob_is_young_dem === 'false') && (
        <AnimatePresence mode="wait">
          <motion.div
            key={formData.dob_is_young_dem === 'true' ? 'yd' : 'partner'}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className={
              'mb-6 relative overflow-hidden rounded-2xl p-5 border-2 shadow-lg ' +
              (formData.dob_is_young_dem === 'true'
                ? 'bg-gradient-to-br from-primary-600 to-primary-800 border-gold-400/60'
                : 'bg-gradient-to-br from-gold-500 to-gold-700 border-primary-600/60')
            }
          >
            {/* Animated sparkle */}
            <motion.div
              aria-hidden
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            />
            <div className="relative flex items-center gap-4">
              <motion.div
                initial={{ rotate: -15, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 18,
                  delay: 0.15,
                }}
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl"
              >
                {formData.dob_is_young_dem === 'true' ? '⚡' : '🤝'}
              </motion.div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-0.5"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  You're on the
                </div>
                <div
                  className="text-white text-lg sm:text-xl font-extrabold leading-tight"
                  style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.02em' }}
                >
                  {formData.dob_is_young_dem === 'true'
                    ? 'Young Democrat track'
                    : 'Partner Candidate track'}
                </div>
                <div className="text-white/80 text-sm mt-0.5">
                  {formData.dob_is_young_dem === 'true'
                    ? "As someone under the age of 36, you qualify as a Young Democrat, so we'll ask you relevant questions."
                    : "As someone over the age of 35, you qualify as a partner candidate, so we'll ask a few questions about your alliance with MOYD."}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Custom fields with page transitions */}
      {hasVisibleFields && (
        <div ref={pageTopRef} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden scroll-mt-24">
          <AnimatePresence mode="wait" custom={pageDirection}>
            <motion.div
              key={currentPage}
              custom={pageDirection}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              className="p-6 sm:p-8"
            >
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-1"
              >
                {currentPageFields.map((field) => (
                  <motion.div key={field.id} variants={fieldEntrance}>
                    {renderField(field)}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation and submit buttons — sticky on mobile */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4 border-t border-gray-100 bg-gray-50/50 md:relative sticky-bottom-nav md:static md:bg-gray-50/50">
            <div className="flex gap-3">
              {!isFirstPage ? (
                <motion.button
                  type="button"
                  onClick={goToPrevPageAnimated}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[48px]"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="hidden sm:inline">Previous</span>
                </motion.button>
              ) : onBack ? (
                <motion.button
                  type="button"
                  onClick={onBack}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[48px]"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="hidden sm:inline">Back</span>
                </motion.button>
              ) : null}

              {!isLastPage ? (
                <motion.button
                  type="button"
                  onClick={goToNextPageAnimated}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl text-white font-semibold hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg min-h-[48px]"
                >
                  Next
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={!isLoading ? { scale: 1.02 } : {}}
                  whileTap={!isLoading ? { scale: 0.97 } : {}}
                  className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white font-semibold text-base hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg min-h-[48px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      {submitLabel}
                    </>
                  )}
                </motion.button>
              )}
            </div>

            {/* Inline hint under the action button when the page has errors, so
                it's obvious WHY Next/Submit didn't advance. */}
            <AnimatePresence>
              {errorCount > 0 && (
                <motion.p
                  key="page-error-hint"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  role="alert"
                  className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-red-600"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Please fix the errors above.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* If no visible fields */}
      {!hasVisibleFields && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <p className="text-gray-600 text-center mb-6">
            Please review your information above and continue.
          </p>
          <div className="flex gap-3">
            {!isFirstPage ? (
              <motion.button
                type="button"
                onClick={goToPrevPageAnimated}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[48px]"
              >
                <ChevronLeft className="h-5 w-5" />
                Previous
              </motion.button>
            ) : onBack ? (
              <motion.button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[48px]"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </motion.button>
            ) : null}

            {!isLastPage ? (
              <motion.button
                type="button"
                onClick={goToNextPageAnimated}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl text-white font-semibold hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg min-h-[48px]"
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.97 } : {}}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white font-semibold text-base hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg min-h-[48px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    {submitLabel}
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
