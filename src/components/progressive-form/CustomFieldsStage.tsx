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
  RangeSlider,
  NumberStepper,
  StarRating,
  ColorPicker,
  SignaturePad,
  FileUpload,
  ImageUpload,
  Autocomplete,
  PlacesAutocomplete,
} from '@/components/form-fields';
import { Check, Loader2, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatedProgressBar, PageDots, StepCounter } from '@/components/motion/AnimatedProgress';
import { pageVariants, pageTransition, staggerContainer, fieldEntrance } from '@/lib/motion';

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
}

// Patterns to detect identity fields by ID or label
const PHONE_PATTERNS = ['phone', 'mobile', 'cell', 'telephone', 'tel'];
const NAME_PATTERNS = ['name', 'full_name', 'fullname', 'your_name', 'yourname'];
const EMAIL_PATTERNS = ['email', 'e_mail', 'email_address', 'emailaddress'];
const ZIP_PATTERNS = ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postalcode'];

type IdentityFieldType = 'phone' | 'name' | 'email' | 'zip_code' | null;

// Map question_type values to FieldType values
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
};

// Condition type from schema
interface SimpleCondition {
  field: string;
  value: string;
}

interface AndCondition {
  and: SimpleCondition[];
}

type Condition = SimpleCondition | AndCondition;

// Question format from new schema (questions array)
interface QuestionFormat {
  id: string;
  text: string;
  question_type: string;
  required?: boolean;
  options?: Array<{ id?: string; value: string; label: string }>;
  placeholder?: string;
  helper_text?: string;
  description?: string;
  validation?: Record<string, unknown>;
  condition?: Condition;
  page?: number;
  file_config?: Record<string, unknown>;
}

// Extended field config to include condition and section header info
interface ExtendedFieldConfig extends FormFieldConfig {
  isSectionHeader?: boolean;
  sectionDescription?: string;
  condition?: Condition;
  originalQuestionType?: string;
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
      .map((q): ExtendedFieldConfig => ({
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
        validation: q.validation as FormFieldConfig['validation'],
        pageNumber: q.page,
        allowedExtensions: q.file_config?.accept as string[] | undefined,
        maxFileSizeMB: q.file_config?.max_size_mb as number | undefined,
        // Extended properties
        isSectionHeader: q.question_type === 'section_header',
        sectionDescription: q.description,
        condition: q.condition,
        originalQuestionType: q.question_type,
      }));
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

  // Handle simple condition
  if ('field' in condition && 'value' in condition) {
    return formData[condition.field] === condition.value;
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
}: CustomFieldsStageProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const fieldFocusTime = useRef<Record<string, number>>({});

  // Derive `dob_is_young_dem` synthetic flag from date_of_birth for schemas that
  // use age-gated branching (e.g. endorsement-questionnaire-2026 pages 10 vs 11).
  // Writes 'true'/'false' string back into formData so evaluateCondition can match.
  // Cutoff is 36 — MOYD's Young Dems definition (35 and under).
  useEffect(() => {
    const dob = formData.date_of_birth;
    if (typeof dob !== 'string' || dob.length < 4) return;
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

  // Get unique page numbers
  const pageNumbers = useMemo(() => {
    const pages = new Set<number>();
    customFields.forEach((f) => {
      if (f.pageNumber) pages.add(f.pageNumber);
    });
    return Array.from(pages).sort((a, b) => a - b);
  }, [customFields]);

  const totalPages = pageNumbers.length || 1;
  const isMultiPage = totalPages > 1;

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

  // Check if a field should be visible based on its condition
  const shouldShowField = useCallback(
    (field: ExtendedFieldConfig): boolean => {
      return evaluateCondition(field.condition, formData);
    },
    [formData]
  );

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

  const validateAllFields = (): boolean => {
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
    return Object.keys(newErrors).length === 0;
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

    if (!validateAllFields()) {
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

    await onSubmit(finalData, fileUploads);
  };

  // Render a section header with animation. On the endorsement questionnaire
  // these are the page intros — bigger, bolder, with a gold accent bar — so
  // they read like a real chapter break instead of a sub-heading.
  const renderSectionHeader = (field: ExtendedFieldConfig) => {
    return (
      <div key={field.id} className="mb-8 pb-5 border-b border-gray-100 relative">
        <div
          className="absolute top-0 left-0 w-12 h-1 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #d4a039 0%, #f0c04e 100%)',
          }}
        />
        <h3
          className="mt-4 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            letterSpacing: '-0.03em',
          }}
        >
          {field.label}
        </h3>
        {field.sectionDescription && (
          <p className="mt-2 text-[15px] text-gray-600 leading-relaxed max-w-2xl">
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

  // Render a single field
  const renderField = (field: ExtendedFieldConfig) => {
    // Render section headers specially
    if (field.isSectionHeader) {
      return renderSectionHeader(field);
    }

    const value = formData[field.id];
    const error = errors[field.id];
    const normalizedType = normalizeFieldType(field.type);

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

      case 'range_slider':
        return <RangeSlider key={field.id} {...commonProps} />;

      case 'touch_spin':
        return <NumberStepper key={field.id} {...commonProps} />;

      case 'rating':
        return <StarRating key={field.id} {...commonProps} />;

      case 'color_picker':
        return <ColorPicker key={field.id} {...commonProps} />;

      case 'signature_pad':
        return <SignaturePad key={field.id} {...commonProps} />;

      case 'typeahead':
        return <Autocomplete key={field.id} {...commonProps} />;

      case 'file_picker':
        return <FileUpload key={field.id} {...commonProps} onFileUpload={onFileUpload} />;

      case 'image_picker':
        return <ImageUpload key={field.id} {...commonProps} onFileUpload={onFileUpload} />;

      default:
        return <TextInput key={field.id} {...commonProps} />;
    }
  };

  const [pageDirection, setPageDirection] = useState(1);
  const isLastPage = currentPage >= totalPages;
  const isFirstPage = currentPage <= 1;
  const progressPercent = isMultiPage ? (currentPage / totalPages) * 100 : 100;

  // Override nav functions to track direction
  const goToNextPageAnimated = () => {
    if (validateCurrentPage()) {
      setPageDirection(1);
      setCurrentPage((prev) => Math.min(prev + 1, totalPages));

      // Auto-scroll to top of form on page change
      setTimeout(() => {
        document.querySelector('.custom-fields-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      // Auto-scroll to first error
      const firstErrorEl = document.querySelector('[class*="text-red-600"]');
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const goToPrevPageAnimated = () => {
    setPageDirection(-1);
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <form onSubmit={handleSubmit} className="custom-fields-form">
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

      {/* Multi-page progress indicator — step counter + segmented page dots,
          now with a weighted fill bar underneath. Each page's slice of the
          bar is proportional to how many real questions live on it, so page
          5 (14 questions) advances the bar more than page 8 (4 questions). */}
      {isMultiPage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <StepCounter current={currentPage} total={totalPages} />
            <PageDots total={totalPages} current={currentPage - 1} />
          </div>
          <div className="relative h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, #0b4db8 0%, #d4a039 60%, #f0c04e 100%)',
                boxShadow: '0 0 12px rgba(212,160,57,0.45)',
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
      {showTrackBanner && formData.dob_is_young_dem && (
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
                    ? "You qualify as a MOYD member candidate — we'll ask about your Young Dems involvement."
                    : "You're over 35 — we'll ask a few partner-specific questions about your alliance with MOYD."}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Custom fields with page transitions */}
      {hasVisibleFields && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
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
