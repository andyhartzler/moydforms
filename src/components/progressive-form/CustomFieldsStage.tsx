'use client';

import { useState, useCallback, useRef } from 'react';
import { FormFieldConfig, FormSchema, normalizeFieldType } from '@/types/forms';
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
import { Check, Loader2, Send } from 'lucide-react';

interface CustomFieldsStageProps {
  schema: FormSchema;
  identityValues: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
  onFieldBlur: (key: string, value: unknown, type?: string) => void;
  onSubmit: (finalData?: Record<string, unknown>) => Promise<boolean>;
  isLoading: boolean;
  submitLabel?: string;
  onFileUpload?: (file: File, fieldId: string) => Promise<string>;
}

// Identity field IDs that should be excluded from custom fields
const IDENTITY_FIELD_IDS = ['phone', 'name', 'full_name', 'email', 'zip_code', 'zip'];

export function CustomFieldsStage({
  schema,
  identityValues,
  onFieldChange,
  onFieldBlur,
  onSubmit,
  isLoading,
  submitLabel = 'Submit',
  onFileUpload,
}: CustomFieldsStageProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fieldFocusTime = useRef<Record<string, number>>({});

  // Get custom fields (excluding identity fields)
  const customFields = (schema.fields || []).filter(
    (field) => !IDENTITY_FIELD_IDS.includes(field.id.toLowerCase())
  );

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

    // Combine identity values with custom field values
    const finalData = {
      ...identityValues,
      ...formData,
    };

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
        </div>
      )}
    </form>
  );
}
