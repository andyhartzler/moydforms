'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { VoteSchema, VoteField } from '@/lib/vote-types';

interface PublicVoteFormProps {
  schema: VoteSchema;
  onSubmit: (voteData: Record<string, unknown>) => Promise<void>;
  disabled?: boolean;
}

export function PublicVoteForm({ schema, onSubmit, disabled }: PublicVoteFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData({ ...formData, [fieldId]: value });
    if (errors[fieldId]) {
      setErrors({ ...errors, [fieldId]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    schema.fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = 'This field is required';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: VoteField) => {
    const value = formData[field.id];
    const error = errors[field.id];

    return (
      <div key={field.id} className="bg-white rounded-xl shadow-soft p-6">
        <label className="block text-lg font-semibold text-gray-900 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.description && (
          <p className="text-gray-600 mb-4">{field.description}</p>
        )}

        <div className="space-y-3">
          {field.type === 'single_choice' || field.type === 'yes_no' ? (
            field.options?.map((option) => (
              <label
                key={option.id}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  value === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option.id}
                  checked={value === option.id}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  disabled={disabled}
                  className="mt-1 w-4 h-4 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium text-gray-900">{option.label}</span>
                  {option.description && (
                    <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                  )}
                </div>
              </label>
            ))
          ) : field.type === 'multiple_choice' ? (
            field.options?.map((option) => {
              const currentValues = (value as string[] | undefined) || [];
              return (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    currentValues.includes(option.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    value={option.id}
                    checked={currentValues.includes(option.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleFieldChange(field.id, [...currentValues, option.id]);
                      } else {
                        handleFieldChange(
                          field.id,
                          currentValues.filter((v: string) => v !== option.id)
                        );
                      }
                    }}
                    disabled={disabled}
                    className="mt-1 w-4 h-4 text-primary focus:ring-primary rounded"
                  />
                  <div>
                    <span className="font-medium text-gray-900">{option.label}</span>
                    {option.description && (
                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    )}
                  </div>
                </label>
              );
            })
          ) : null}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {schema.fields.map(renderField)}

      <button
        type="submit"
        disabled={submitting || disabled}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting Vote...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Submit Vote
          </>
        )}
      </button>
    </form>
  );
}
