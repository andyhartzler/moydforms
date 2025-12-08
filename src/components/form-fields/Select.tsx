'use client';

import { useState, useRef, useEffect } from 'react';
import { FormFieldConfig } from '@/types/forms';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface SelectProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function Select({ field, value, onChange, error, onBlur, onFocus }: SelectProps) {
  const isSearchable = field.type === 'searchable_dropdown';
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = field.options || [];
  const filteredOptions = isSearchable
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isSearchable) {
    return (
      <div className="mb-5">
        <label
          htmlFor={field.id}
          className="block text-sm font-semibold text-gray-800 mb-2"
        >
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.help && (
          <p className="text-sm text-gray-500 mb-2">{field.help}</p>
        )}
        <div className="relative">
          <select
            id={field.id}
            name={field.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            className={`
              block w-full px-4 py-3 pr-10
              bg-white appearance-none
              border-2 rounded-xl
              text-gray-900 text-base
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-0
              disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
              ${error
                ? 'border-red-400 focus:border-red-500 bg-red-50/30'
                : 'border-gray-200 hover:border-gray-300 focus:border-primary-500'
              }
            `}
            disabled={field.enabled === false}
          >
            <option value="" className="text-gray-400">
              {field.placeholder || 'Select an option...'}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-5" ref={dropdownRef}>
      <label
        htmlFor={field.id}
        className="block text-sm font-semibold text-gray-800 mb-2"
      >
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && (
        <p className="text-sm text-gray-500 mb-2">{field.help}</p>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onFocus={onFocus}
          className={`
            relative w-full px-4 py-3 pr-10
            bg-white text-left
            border-2 rounded-xl
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-0
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error
              ? 'border-red-400 focus:border-red-500 bg-red-50/30'
              : 'border-gray-200 hover:border-gray-300 focus:border-primary-500'
            }
          `}
          disabled={field.enabled === false}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
            {selectedOption?.label || field.placeholder || 'Select an option...'}
          </span>
          <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 text-sm"
                  placeholder="Search options..."
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <ul className="max-h-60 overflow-auto py-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm('');
                      onBlur?.();
                    }}
                    className={`
                      flex items-center justify-between cursor-pointer px-4 py-2.5 mx-2 rounded-lg
                      transition-colors duration-150
                      ${value === option.value
                        ? 'bg-primary-100 text-primary-900'
                        : 'hover:bg-gray-50 text-gray-700'
                      }
                    `}
                  >
                    <span>{option.label}</span>
                    {value === option.value && (
                      <Check className="h-4 w-4 text-primary-600" />
                    )}
                  </li>
                ))
              ) : (
                <li className="px-4 py-3 text-gray-500 text-sm text-center">
                  No options found
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
