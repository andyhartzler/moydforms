'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { FormFieldConfig, FormSchema, normalizeFieldType, FieldType } from '@/types/forms';
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
} from '@/components/form-fields';
import { Check, Loader2, Send, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomFieldsStageProps {
  schema: FormSchema;
  identityValues: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
  onFieldBlur: (key: string, value: unknown, type?: string) => void;
  onSubmit: (finalData?: Record<string, unknown>) => Promise<boolean>;
  onBack?: () => void;
  isLoading: boolean;
  submitLabel?: string;
  onFileUpload?: (file: File, fieldId: string) => Promise<string>;
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
  // If schema has fields array, use it directly
  if (schema.fields && schema.fields.length > 0) {
    return schema.fields as ExtendedFieldConfig[];
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

  // Check by field type first (most reliable)
  if (fieldType === 'phone' || fieldType === 'tel') return 'phone';
  if (fieldType === 'email') return 'email';

  // Check phone patterns
  if (PHONE_PATTERNS.some((p) => idLower.includes(p) || labelLower.includes(p))) {
    return 'phone';
  }

  // Check email patterns
  if (EMAIL_PATTERNS.some((p) => idLower.includes(p) || labelLower.includes(p))) {
    return 'email';
  }

  // Check name patterns (but not if it's clearly something else like "company_name")
  const nameExclusions = ['company', 'business', 'organization', 'event', 'product', 'project', 'chapter', 'school', 'college', 'university'];
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
}: CustomFieldsStageProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const fieldFocusTime = useRef<Record<string, number>>({});

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

    // Build final data: start with identity values
    const finalData: Record<string, unknown> = {
      ...identityValues,
      ...formData,
    };

    // Map identity values to the form's specific field IDs
    identityFieldMappings.forEach(({ field, identityKey }) => {
      if (identityKey && identityValues[identityKey] !== undefined) {
        finalData[field.id] = identityValues[identityKey];
      }
    });

    await onSubmit(finalData);
  };

  // Render a section header
  const renderSectionHeader = (field: ExtendedFieldConfig) => {
    return (
      <div key={field.id} className="mb-6 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{field.label}</h3>
        {field.sectionDescription && (
          <p className="mt-1 text-sm text-gray-600">{field.sectionDescription}</p>
        )}
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
        return <TextInput key={field.id} {...commonProps} />;

      case 'textarea':
        return <TextArea key={field.id} {...commonProps} />;

      case 'dropdown':
      case 'select':
      case 'searchable_dropdown':
        return <Select key={field.id} {...commonProps} />;

      case 'radio':
        return <RadioGroup key={field.id} {...commonProps} />;

      case 'checkbox':
      case 'cupertino_checkbox':
        if (!field.options || field.options.length === 0) {
          return <Checkbox key={field.id} {...commonProps} />;
        }
        return <CheckboxGroup key={field.id} {...commonProps} />;

      case 'checkbox_group':
        return <CheckboxGroup key={field.id} {...commonProps} />;

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

  const isLastPage = currentPage >= totalPages;
  const isFirstPage = currentPage <= 1;
  const progressPercent = isMultiPage ? (currentPage / totalPages) * 100 : 100;

  return (
    <form onSubmit={handleSubmit}>
      {/* Identity summary */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Your Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600">
              {formatPhoneDisplay((identityValues.phone as string) || '')}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600 truncate">{(identityValues.name as string) || ''}</span>
          </div>
          <div className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600 truncate">{(identityValues.email as string) || ''}</span>
          </div>
          <div className="flex items-center text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600">{(identityValues.zip_code as string) || ''}</span>
          </div>
        </div>
      </div>

      {/* Multi-page progress indicator */}
      {isMultiPage && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-6">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <span className="text-gray-500">{Math.round(progressPercent)}% complete</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Custom fields */}
      {hasVisibleFields && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8 space-y-1">{currentPageFields.map(renderField)}</div>

          {/* Navigation and submit buttons */}
          <div className="px-8 pb-8 pt-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex gap-3">
              {/* Previous/Back button */}
              {!isFirstPage ? (
                <button
                  type="button"
                  onClick={goToPrevPage}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Previous
                </button>
              ) : onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Back
                </button>
              ) : null}

              {/* Next/Submit button */}
              {!isLastPage ? (
                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl text-white font-semibold hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Next
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white font-semibold text-base hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
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
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* If no visible fields on current page (all conditional fields hidden), show message */}
      {!hasVisibleFields && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <p className="text-gray-600 text-center mb-6">
            Please review your information above and continue.
          </p>
          <div className="flex gap-3">
            {!isFirstPage ? (
              <button
                type="button"
                onClick={goToPrevPage}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5" />
                Previous
              </button>
            ) : onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </button>
            ) : null}

            {!isLastPage ? (
              <button
                type="button"
                onClick={goToNextPage}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl text-white font-semibold hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white font-semibold text-base hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
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
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
