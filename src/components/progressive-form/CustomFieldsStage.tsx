'use client';

import { useState, useCallback, useRef } from 'react';
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
import { Check, Loader2, Send, ChevronLeft } from 'lucide-react';

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
  'hidden': 'text', // Hidden fields won't render anyway
  'section_header': 'text', // Will be handled specially
};

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
  condition?: { field: string; value: string } | { and?: Array<{ field: string; value: string }> };
  page?: number;
  file_config?: Record<string, unknown>;
}

// Extended schema type to handle both formats
interface ExtendedSchema extends FormSchema {
  questions?: QuestionFormat[];
}

// Normalize questions format to fields format
function normalizeSchemaToFields(schema: ExtendedSchema): FormFieldConfig[] {
  // If schema has fields array, use it directly
  if (schema.fields && schema.fields.length > 0) {
    return schema.fields;
  }

  // If schema has questions array, convert to fields format
  if (schema.questions && schema.questions.length > 0) {
    return schema.questions
      .filter((q) => q.question_type !== 'section_header' && q.question_type !== 'hidden')
      .map((q): FormFieldConfig => ({
        id: q.id,
        type: QUESTION_TYPE_MAP[q.question_type] || 'text',
        label: q.text,
        placeholder: q.placeholder,
        help: q.helper_text || q.description,
        required: q.required ?? false,
        options: q.options?.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
        validation: q.validation as FormFieldConfig['validation'],
        // Store condition for later use
        conditionalFieldId: q.condition && 'field' in q.condition ? q.condition.field : undefined,
        conditionalValue: q.condition && 'value' in q.condition ? q.condition.value : undefined,
        showWhenConditionMet: q.condition ? true : undefined,
        pageNumber: q.page,
        // Pass through file config for file upload fields
        allowedExtensions: q.file_config?.accept as string[] | undefined,
        maxFileSizeMB: q.file_config?.max_size_mb as number | undefined,
      }));
  }

  return [];
}

// Check if a field is an identity field and return which type
function getIdentityFieldType(field: FormFieldConfig): IdentityFieldType {
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
  const nameExclusions = ['company', 'business', 'organization', 'event', 'product', 'project'];
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
  const fieldFocusTime = useRef<Record<string, number>>({});

  // Separate identity fields from custom fields and track mappings
  // Support both 'fields' format and 'questions' format
  const allFields = normalizeSchemaToFields(schema as ExtendedSchema);
  const identityFieldMappings: Array<{ field: FormFieldConfig; identityKey: IdentityFieldType }> = [];
  const customFields: FormFieldConfig[] = [];

  allFields.forEach((field) => {
    const identityType = getIdentityFieldType(field);
    if (identityType) {
      identityFieldMappings.push({ field, identityKey: identityType });
    } else {
      customFields.push(field);
    }
  });

  // Has custom fields?
  const hasCustomFields = customFields.length > 0;

  // Validation logic
  const validateField = (field: FormFieldConfig, value: unknown): string | null => {
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

    return null;
  };

  const validateAllFields = (): boolean => {
    const newErrors: Record<string, string> = {};

    customFields.forEach((field) => {
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
    // This ensures that if a form has a field like "phone_number" or "email_address",
    // it gets populated with the value from the identity stage
    identityFieldMappings.forEach(({ field, identityKey }) => {
      if (identityKey && identityValues[identityKey] !== undefined) {
        finalData[field.id] = identityValues[identityKey];
      }
    });

    await onSubmit(finalData);
  };

  // Render a single field
  const renderField = (field: FormFieldConfig) => {
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

      {/* Custom fields */}
      {hasCustomFields && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-8 space-y-1">{customFields.map(renderField)}</div>

          {/* Submit button */}
          <div className="px-8 pb-8 pt-4 border-t border-gray-100 bg-gray-50/50">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white font-semibold text-base hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
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

            {/* Back button */}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="w-full mt-3 py-3 px-6 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
                Back
              </button>
            )}
          </div>
        </div>
      )}

      {/* If no custom fields, show submit directly */}
      {!hasCustomFields && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <p className="text-gray-600 text-center mb-6">
            Please review your information above and submit when ready.
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white font-semibold text-base hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
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

          {/* Back button */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="w-full mt-3 py-3 px-6 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </button>
          )}
        </div>
      )}
    </form>
  );
}
