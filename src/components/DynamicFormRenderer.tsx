'use client';

import { useState } from 'react';

interface DynamicFormRendererProps {
  schema: any;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  submitting?: boolean;
}

export default function DynamicFormRenderer({
  schema,
  onSubmit,
  submitLabel = 'Submit',
  submitting = false
}: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    schema.fields.forEach((field: any) => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }

      // Additional validation
      if (field.validation) {
        const value = formData[field.id];

        if (value && field.validation.minLength && value.length < field.validation.minLength) {
          newErrors[field.id] = `Minimum length is ${field.validation.minLength}`;
        }

        if (value && field.validation.maxLength && value.length > field.validation.maxLength) {
          newErrors[field.id] = `Maximum length is ${field.validation.maxLength}`;
        }

        if (value && field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            newErrors[field.id] = field.validation.message || 'Invalid format';
          }
        }

        if (field.type === 'email' && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[field.id] = 'Invalid email address';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    await onSubmit(formData);
  }

  function renderField(field: any) {
    const value = formData[field.id];
    const error = errors[field.id];

    const baseClasses = "mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500";
    const errorClasses = error ? "border-red-300" : "border-gray-300";

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
        return (
          <div key={field.id} className="mb-6">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.help && <p className="mt-1 text-sm text-gray-500">{field.help}</p>}
            <input
              type={field.type}
              id={field.id}
              value={value || ''}
              onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
              className={`${baseClasses} ${errorClasses}`}
              required={field.required}
              placeholder={field.placeholder}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="mb-6">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.help && <p className="mt-1 text-sm text-gray-500">{field.help}</p>}
            <textarea
              id={field.id}
              value={value || ''}
              onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
              rows={field.rows || 4}
              className={`${baseClasses} ${errorClasses}`}
              required={field.required}
              placeholder={field.placeholder}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}
            <div className="space-y-3">
              {field.options.map((option: any) => (
                <div key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    id={`${field.id}-${option.value}`}
                    name={field.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    required={field.required}
                  />
                  <label
                    htmlFor={`${field.id}-${option.value}`}
                    className="ml-3 text-sm text-gray-700"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.help && <p className="mb-2 text-sm text-gray-500">{field.help}</p>}
            <div className="space-y-3">
              {field.options.map((option: any) => (
                <div key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`${field.id}-${option.value}`}
                    checked={(value || []).includes(option.value)}
                    onChange={(e) => {
                      const currentValues = value || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v: string) => v !== option.value);
                      setFormData({ ...formData, [field.id]: newValues });
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`${field.id}-${option.value}`}
                    className="ml-3 text-sm text-gray-700"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="mb-6">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.help && <p className="mt-1 text-sm text-gray-500">{field.help}</p>}
            <select
              id={field.id}
              value={value || ''}
              onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
              className={`${baseClasses} ${errorClasses}`}
              required={field.required}
            >
              <option value="">Select...</option>
              {field.options.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="mb-6">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.help && <p className="mt-1 text-sm text-gray-500">{field.help}</p>}
            <input
              type="date"
              id={field.id}
              value={value || ''}
              onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
              className={`${baseClasses} ${errorClasses}`}
              required={field.required}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
      {schema.fields.map(renderField)}

      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
