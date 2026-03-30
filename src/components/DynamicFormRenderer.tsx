'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormFieldConfig, FormSchema, ConditionalOperator, normalizeFieldType, ValidationConfig, FieldType, FileUploadResult } from '@/types/forms';
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
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react';
import { AnimatedProgressBar, PageDots, StepCounter } from './motion/AnimatedProgress';
import { pageVariants, pageTransition, staggerContainer, fieldEntrance } from '@/lib/motion';

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
  'section_header': 'text',
};

// Question format from new schema
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
  if (schema.fields && schema.fields.length > 0) {
    return schema.fields;
  }

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
        conditionalFieldId: q.condition && 'field' in q.condition ? q.condition.field : undefined,
        conditionalValue: q.condition && 'value' in q.condition ? q.condition.value : undefined,
        showWhenConditionMet: q.condition ? true : undefined,
        pageNumber: q.page,
        allowedExtensions: q.file_config?.accept as string[] | undefined,
        maxFileSizeMB: q.file_config?.max_size_mb as number | undefined,
      }));
  }

  return [];
}

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
  onFileUpload?: (file: File, fieldId: string) => Promise<FileUploadResult>;
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
  const [direction, setDirection] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const fieldFocusTime = useRef<Record<string, number>>({});

  const fields = normalizeSchemaToFields(schema as ExtendedSchema);
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
        if (typeof watchedValue === 'string') conditionMet = watchedValue.includes(targetValue);
        else if (Array.isArray(watchedValue)) conditionMet = watchedValue.includes(targetValue);
        break;
      case 'notContains':
        if (typeof watchedValue === 'string') conditionMet = !watchedValue.includes(targetValue);
        else if (Array.isArray(watchedValue)) conditionMet = !watchedValue.includes(targetValue);
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

  const currentPageFields = fields
    .filter(field => (field.pageNumber ?? 0) === currentPage)
    .filter(field => shouldShowField(field));

  // Validation logic
  const validateField = (field: FormFieldConfig, value: any): string | null => {
    if (!shouldShowField(field)) return null;

    if (field.required) {
      if (value === undefined || value === null || value === '') {
        return `${field.label} is required`;
      }
      if (Array.isArray(value) && value.length === 0) {
        return `${field.label} is required`;
      }
    }

    if (!value && !field.required) return null;

    const validation = field.validation || {};
    const validators = field.validatorTypes || [];

    if (field.type === 'email' || validators.includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) return 'Invalid email address';
    }

    if (field.type === 'url' || validators.includes('url')) {
      try { new URL(value); } catch { return 'Invalid URL'; }
    }

    if ((field.type === 'phone' || field.type === 'tel' || validators.includes('phoneNumber')) && value) {
      const phoneRegex = /^[\d\s\-+()]+$/;
      if (!phoneRegex.test(value)) return 'Invalid phone number';
    }

    const minLength = validation.minLength ?? (validators.includes('minLength') ? validation.minLength : undefined);
    if (minLength != null && typeof value === 'string' && value.length < minLength) {
      return `Minimum length is ${minLength} characters`;
    }

    const maxLength = validation.maxLength ?? field.maxLength;
    if (maxLength != null && typeof value === 'string' && value.length > maxLength) {
      return `Maximum length is ${maxLength} characters`;
    }

    if (validation.minWordsCount != null && typeof value === 'string') {
      const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < validation.minWordsCount) return `Minimum ${validation.minWordsCount} words required`;
    }

    if (validation.maxWordsCount != null && typeof value === 'string') {
      const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > validation.maxWordsCount) return `Maximum ${validation.maxWordsCount} words allowed`;
    }

    if (validators.includes('numeric') && isNaN(Number(value))) return 'Must be a number';
    if (validators.includes('integer') && !Number.isInteger(Number(value))) return 'Must be a whole number';

    const minValue = validation.min ?? field.minValue;
    if (minValue != null && Number(value) < minValue) return `Minimum value is ${minValue}`;

    const maxValue = validation.max ?? field.maxValue;
    if (maxValue != null && Number(value) > maxValue) return `Maximum value is ${maxValue}`;

    if (validators.includes('alphabetical') && value) {
      if (!/^[a-zA-Z\s]+$/.test(value)) return 'Only letters allowed';
    }

    const pattern = validation.match || validation.pattern;
    if (pattern && value) {
      try {
        if (!new RegExp(pattern).test(value)) return validation.message || 'Invalid format';
      } catch { /* skip */ }
    }

    if (validation.contains && value && !String(value).includes(validation.contains)) {
      return `Must contain "${validation.contains}"`;
    }
    if (validation.startsWith && value && !String(value).startsWith(validation.startsWith)) {
      return `Must start with "${validation.startsWith}"`;
    }
    if (validation.endsWith && value && !String(value).endsWith(validation.endsWith)) {
      return `Must end with "${validation.endsWith}"`;
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

    // Auto-scroll to first error
    if (Object.keys(newErrors).length > 0) {
      const firstErrorId = Object.keys(newErrors)[0];
      const el = document.getElementById(firstErrorId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return Object.keys(newErrors).length === 0;
  };

  const validateAllPages = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.filter(field => shouldShowField(field)).forEach((field) => {
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
    if (!hasStarted) {
      setHasStarted(true);
      onFormStart?.();
    }
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
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
      if (seconds > 0.5) onFieldTimeSpent?.(fieldId, fieldType, seconds);
      delete fieldFocusTime.current[fieldId];
    }
  };

  const goToNextPage = () => {
    if (validateCurrentPage()) {
      setDirection(1);
      const nextPage = Math.min(currentPage + 1, totalPages - 1);
      setCurrentPage(nextPage);
      onPageChange?.(nextPage);
    }
  };

  const goToPrevPage = () => {
    setDirection(-1);
    const prevPage = Math.max(currentPage - 1, 0);
    setCurrentPage(prevPage);
    onPageChange?.(prevPage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAllPages()) {
      const firstErrorField = fields.find(f => errors[f.id]);
      if (firstErrorField) {
        const errorPage = firstErrorField.pageNumber ?? 0;
        if (errorPage !== currentPage) {
          setDirection(errorPage > currentPage ? 1 : -1);
          setCurrentPage(errorPage);
          onPageChange?.(errorPage);
        }
      }
      return;
    }
    await onSubmit(formData);
  };

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
      case 'text': case 'email': case 'phone': case 'tel': case 'url': case 'number': case 'cupertino_text_field':
        return <TextInput key={field.id} {...commonProps} />;
      case 'textarea':
        return <TextArea key={field.id} {...commonProps} />;
      case 'dropdown': case 'select': case 'searchable_dropdown':
        return <Select key={field.id} {...commonProps} />;
      case 'radio':
        return <RadioGroup key={field.id} {...commonProps} />;
      case 'checkbox': case 'cupertino_checkbox':
        if (!field.options || field.options.length === 0) return <Checkbox key={field.id} {...commonProps} />;
        return <CheckboxGroup key={field.id} {...commonProps} />;
      case 'checkbox_group':
        return <CheckboxGroup key={field.id} {...commonProps} />;
      case 'switch': case 'cupertino_switch':
        return <Switch key={field.id} {...commonProps} />;
      case 'choice_chips': case 'cupertino_segmented_control': case 'cupertino_sliding_segmented_control':
        return <ChipSelect key={field.id} {...commonProps} multiple={false} />;
      case 'filter_chips':
        return <ChipSelect key={field.id} {...commonProps} multiple={true} />;
      case 'date_picker': case 'date': case 'time_picker': case 'date_time_picker':
        return <DatePicker key={field.id} {...commonProps} />;
      case 'date_range_picker':
        return <DateRangePicker key={field.id} {...commonProps} />;
      case 'slider': case 'cupertino_slider':
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
        console.warn(`Unknown field type: ${field.type}, falling back to text input`);
        return <TextInput key={field.id} {...commonProps} />;
    }
  };

  const progressPercent = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Animated progress bar for multi-page forms */}
      {totalPages > 1 && (
        <div className="px-6 sm:px-8 pt-6">
          <div className="flex justify-between items-center text-sm mb-3">
            <StepCounter current={currentPage + 1} total={totalPages} />
            <motion.span
              key={Math.round(progressPercent)}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-gray-500"
            >
              {Math.round(progressPercent)}% complete
            </motion.span>
          </div>
          <AnimatedProgressBar percent={progressPercent} />
          <PageDots total={totalPages} current={currentPage} />
        </div>
      )}

      {/* Animated form fields with page transitions */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPage}
          custom={direction}
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

      {/* Navigation — sticky on mobile */}
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4 border-t border-gray-100 bg-gray-50/50 md:relative sticky-bottom-nav md:static md:bg-gray-50/50 md:border-t md:border-gray-100">
        <div className="flex justify-between gap-3 max-w-2xl mx-auto">
          {totalPages > 1 && currentPage > 0 ? (
            <motion.button
              type="button"
              onClick={goToPrevPage}
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 min-h-[48px]"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Previous</span>
            </motion.button>
          ) : (
            <div />
          )}

          {totalPages > 1 && currentPage < totalPages - 1 ? (
            <motion.button
              type="button"
              onClick={goToNextPage}
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-3.5 bg-primary-600 rounded-xl text-white font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg min-h-[48px]"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          ) : (
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={!submitting ? { scale: 1.02 } : {}}
              whileTap={!submitting ? { scale: 0.97 } : {}}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white font-semibold text-base hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-md hover:shadow-lg min-w-[140px] min-h-[48px]"
            >
              {submitting ? (
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
    </form>
  );
}
