'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FormFieldConfig, FormSchema, ConditionalOperator, normalizeFieldType, ValidationConfig } from '@/types/forms';
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
} from './form-fields';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface DynamicFormRendererProps {
  schema: FormSchema;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  submitting?: boolean;
  onPageChange?: (page: number) => void;
  onFormStart?: () => void;
  onFieldInteraction?: (fieldId: string, fieldType: string) => void;
  onValidationError?: (fieldId: string, fieldType: string, error: string) => void;
  onFieldTimeSpent?: (fieldId: string, fieldType: string, seconds: number) => void;
  onFileUpload?: (file: File, fieldId: string) => Promise<string>;
}

export default function DynamicFormRenderer({
  schema,
  onSubmit,
  submitLabel = 'Submit',
  submitting = false,
  onPageChange,
  onFormStart,
  onFieldInteraction,
  onValidationError,
  onFieldTimeSpent,
  onFileUpload,
}: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const fieldFocusTime = useRef<Record<string, number>>({});

  // Calculate total pages
  const fields = schema.fields || [];
  const pageNumbers = Array.from(new Set(fields.map(f => f.pageNumber ?? 0))).sort((a, b) => a - b);
  const totalPages = pageNumbers.length || 1;

  // Initialize default values
  useEffect(() => {
    const defaults: Record<string, any> = {};
    fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue;
      } else if (field.initialValue !== undefined) {
        defaults[field.id] = field.initialValue;
      }
    });
    if (Object.keys(defaults).length > 0) {
      setFormData(prev => ({ ...defaults, ...prev }));
    }
  }, []);

  // Conditional field logic
  const shouldShowField = useCallback((field: FormFieldConfig): boolean => {
    if (!field.conditionalFieldId || !field.conditionalOperator) {
      return true;
    }

    const watchedValue = formData[field.conditionalFieldId];
    const targetValue = field.conditionalValue;
    let conditionMet = false;

    switch (field.conditionalOperator as ConditionalOperator) {
      case 'equals':
        conditionMet = watchedValue === targetValue;
        break;
      case 'notEquals':
        conditionMet = watchedValue !== targetValue;
        break;
      case 'contains':
        if (typeof watchedValue === 'string') {
          conditionMet = watchedValue.includes(targetValue);
        } else if (Array.isArray(watchedValue)) {
          conditionMet = watchedValue.includes(targetValue);
        }
        break;
      case 'notContains':
        if (typeof watchedValue === 'string') {
          conditionMet = !watchedValue.includes(targetValue);
        } else if (Array.isArray(watchedValue)) {
          conditionMet = !watchedValue.includes(targetValue);
        }
        break;
      case 'greaterThan':
        conditionMet = Number(watchedValue) > Number(targetValue);
        break;
      case 'lessThan':
        conditionMet = Number(watchedValue) < Number(targetValue);
        break;
      case 'greaterThanOrEqual':
        conditionMet = Number(watchedValue) >= Number(targetValue);
        break;
      case 'lessThanOrEqual':
        conditionMet = Number(watchedValue) <= Number(targetValue);
        break;
      case 'isEmpty':
        conditionMet = !watchedValue ||
          (typeof watchedValue === 'string' && watchedValue.trim() === '') ||
          (Array.isArray(watchedValue) && watchedValue.length === 0);
        break;
      case 'isNotEmpty':
        conditionMet = !!watchedValue &&
          (typeof watchedValue !== 'string' || watchedValue.trim() !== '') &&
          (!Array.isArray(watchedValue) || watchedValue.length > 0);
        break;
    }

    return field.showWhenConditionMet !== false ? conditionMet : !conditionMet;
  }, [formData]);

  // Get fields for current page
  const currentPageFields = fields
    .filter(field => (field.pageNumber ?? 0) === currentPage)
    .filter(field => shouldShowField(field));

  // Validation logic
  const validateField = (field: FormFieldConfig, value: any): string | null => {
    // Skip validation for hidden fields
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
      if (value && !emailRegex.test(value)) {
        return 'Invalid email address';
      }
    }

    // URL validation
    if (field.type === 'url' || validators.includes('url')) {
      try {
        new URL(value);
      } catch {
        return 'Invalid URL';
      }
    }

    // Phone validation
    if ((field.type === 'phone' || field.type === 'tel' || validators.includes('phoneNumber')) && value) {
      const phoneRegex = /^[\d\s\-+()]+$/;
      if (!phoneRegex.test(value)) {
        return 'Invalid phone number';
      }
    }

    // Min length
    const minLength = validation.minLength ?? (validators.includes('minLength') ? validation.minLength : undefined);
    if (minLength !== undefined && typeof value === 'string' && value.length < minLength) {
      return `Minimum length is ${minLength} characters`;
    }

    // Max length
    const maxLength = validation.maxLength ?? field.maxLength;
    if (maxLength !== undefined && typeof value === 'string' && value.length > maxLength) {
      return `Maximum length is ${maxLength} characters`;
    }

    // Min words
    if (validation.minWordsCount !== undefined && typeof value === 'string') {
      const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < validation.minWordsCount) {
        return `Minimum ${validation.minWordsCount} words required`;
      }
    }

    // Max words
    if (validation.maxWordsCount !== undefined && typeof value === 'string') {
      const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > validation.maxWordsCount) {
        return `Maximum ${validation.maxWordsCount} words allowed`;
      }
    }

    // Numeric
    if (validators.includes('numeric') && isNaN(Number(value))) {
      return 'Must be a number';
    }

    // Integer
    if (validators.includes('integer') && !Number.isInteger(Number(value))) {
      return 'Must be a whole number';
    }

    // Min value
    const minValue = validation.min ?? field.minValue;
    if (minValue !== undefined && Number(value) < minValue) {
      return `Minimum value is ${minValue}`;
    }

    // Max value
    const maxValue = validation.max ?? field.maxValue;
    if (maxValue !== undefined && Number(value) > maxValue) {
      return `Maximum value is ${maxValue}`;
    }

    // Alphabetical
    if (validators.includes('alphabetical') && value) {
      const alphaRegex = /^[a-zA-Z\s]+$/;
      if (!alphaRegex.test(value)) {
        return 'Only letters allowed';
      }
    }

    // Pattern/Match (regex)
    const pattern = validation.match || validation.pattern;
    if (pattern && value) {
      try {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return validation.message || 'Invalid format';
        }
      } catch {
        // Invalid regex, skip validation
      }
    }

    // Contains
    if (validation.contains && value) {
      if (!String(value).includes(validation.contains)) {
        return `Must contain "${validation.contains}"`;
      }
    }

    // Starts with
    if (validation.startsWith && value) {
      if (!String(value).startsWith(validation.startsWith)) {
        return `Must start with "${validation.startsWith}"`;
      }
    }

    // Ends with
    if (validation.endsWith && value) {
      if (!String(value).endsWith(validation.endsWith)) {
        return `Must end with "${validation.endsWith}"`;
      }
    }

    return null;
  };

  const validateCurrentPage = (): boolean => {
    const newErrors: Record<string, string> = {};

    currentPageFields.forEach((field) => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
        onValidationError?.(field.id, field.type, error);
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAllPages = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields
      .filter(field => shouldShowField(field))
      .forEach((field) => {
        const error = validateField(field, formData[field.id]);
        if (error) {
          newErrors[field.id] = error;
          onValidationError?.(field.id, field.type, error);
        }
      });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    // Track form start
    if (!hasStarted) {
      setHasStarted(true);
      onFormStart?.();
    }

    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleFieldFocus = (fieldId: string, fieldType: string) => {
    fieldFocusTime.current[fieldId] = Date.now();
    onFieldInteraction?.(fieldId, fieldType);
  };

  const handleFieldBlur = (fieldId: string, fieldType: string) => {
    const startTime = fieldFocusTime.current[fieldId];
    if (startTime) {
      const seconds = (Date.now() - startTime) / 1000;
      if (seconds > 0.5) {
        onFieldTimeSpent?.(fieldId, fieldType, seconds);
      }
      delete fieldFocusTime.current[fieldId];
    }
  };

  const goToNextPage = () => {
    if (validateCurrentPage()) {
      const nextPage = Math.min(currentPage + 1, totalPages - 1);
      setCurrentPage(nextPage);
      onPageChange?.(nextPage);
    }
  };

  const goToPrevPage = () => {
    const prevPage = Math.max(currentPage - 1, 0);
    setCurrentPage(prevPage);
    onPageChange?.(prevPage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllPages()) {
      // If validation fails and we're not on the first error's page, navigate there
      const firstErrorField = fields.find(f => errors[f.id]);
      if (firstErrorField) {
        const errorPage = firstErrorField.pageNumber ?? 0;
        if (errorPage !== currentPage) {
          setCurrentPage(errorPage);
          onPageChange?.(errorPage);
        }
      }
      return;
    }

    await onSubmit(formData);
  };

  // Render a single field
  const renderField = (field: FormFieldConfig) => {
    const value = formData[field.id];
    const error = errors[field.id];
    const normalizedType = normalizeFieldType(field.type);

    const commonProps = {
      field,
      value,
      onChange: (val: any) => handleFieldChange(field.id, val),
      error,
      onFocus: () => handleFieldFocus(field.id, field.type),
      onBlur: () => handleFieldBlur(field.id, field.type),
    };

    switch (normalizedType) {
      // Text inputs
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

      // Selection
      case 'dropdown':
      case 'select':
      case 'searchable_dropdown':
        return <Select key={field.id} {...commonProps} />;

      case 'radio':
        return <RadioGroup key={field.id} {...commonProps} />;

      case 'checkbox':
      case 'cupertino_checkbox':
        // Single checkbox (no options) vs checkbox group (with options)
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

      // Date/Time
      case 'date_picker':
      case 'date':
      case 'time_picker':
      case 'date_time_picker':
        return <DatePicker key={field.id} {...commonProps} />;

      case 'date_range_picker':
        return <DateRangePicker key={field.id} {...commonProps} />;

      // Numeric
      case 'slider':
      case 'cupertino_slider':
        return <Slider key={field.id} {...commonProps} />;

      case 'range_slider':
        return <RangeSlider key={field.id} {...commonProps} />;

      case 'touch_spin':
        return <NumberStepper key={field.id} {...commonProps} />;

      case 'rating':
        return <StarRating key={field.id} {...commonProps} />;

      // Special
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
        // Fallback to text input for unknown types
        console.warn(`Unknown field type: ${field.type}, falling back to text input`);
        return <TextInput key={field.id} {...commonProps} />;
    }
  };

  const progressPercent = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
      {/* Progress bar for multi-page forms */}
      {totalPages > 1 && (
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Page {currentPage + 1} of {totalPages}</span>
            <span>{Math.round(progressPercent)}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-2">
        {currentPageFields.map(renderField)}
      </div>

      {/* Navigation and submit buttons */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between gap-4">
          {/* Previous button */}
          {totalPages > 1 && currentPage > 0 ? (
            <button
              type="button"
              onClick={goToPrevPage}
              disabled={submitting}
              className="flex items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Previous
            </button>
          ) : (
            <div />
          )}

          {/* Next/Submit button */}
          {totalPages > 1 && currentPage < totalPages - 1 ? (
            <button
              type="button"
              onClick={goToNextPage}
              disabled={submitting}
              className="flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-5 w-5 ml-1" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                submitLabel
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
