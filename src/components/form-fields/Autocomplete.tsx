'use client';

import { useState, useRef, useEffect } from 'react';
import { FormFieldConfig } from '@/types/forms';
import { Search, X } from 'lucide-react';

interface AutocompleteProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function Autocomplete({ field, value, onChange, error, onBlur, onFocus }: AutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(field.options || []);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const options = field.options || [];

  useEffect(() => {
    // Update input value when value prop changes
    if (value !== undefined && value !== inputValue) {
      const selectedOption = options.find(opt => opt.value === value);
      setInputValue(selectedOption?.label || value);
    }
  }, [value]);

  useEffect(() => {
    // Filter options based on input
    const filtered = options.filter(opt =>
      opt.label.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [inputValue, options]);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    // Allow free-form input - update the value
    onChange(newValue);
  };

  const handleSelect = (option: { value: string; label: string }) => {
    setInputValue(option.label);
    onChange(option.value);
    setIsOpen(false);
    onBlur?.();
  };

  const clearInput = () => {
    setInputValue('');
    onChange('');
    setIsOpen(false);
  };

  return (
    <div className="mb-6" ref={wrapperRef}>
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help && <p className="mt-1 text-sm text-gray-500">{field.help}</p>}

      <div className="mt-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>

        <input
          type="text"
          id={field.id}
          name={field.id}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => { setIsOpen(true); onFocus?.(); }}
          onBlur={() => {
            // Delay to allow click on option
            setTimeout(() => {
              if (!wrapperRef.current?.contains(document.activeElement)) {
                setIsOpen(false);
                onBlur?.();
              }
            }, 150);
          }}
          className={`block w-full pl-10 pr-10 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder={field.placeholder || 'Type to search...'}
          disabled={field.enabled === false}
          autoComplete="off"
        />

        {inputValue && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}

        {/* Dropdown */}
        {isOpen && filteredOptions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto border border-gray-200 focus:outline-none">
            {filteredOptions.map((option) => (
              <li
                key={option.value}
                onClick={() => handleSelect(option)}
                className={`cursor-pointer px-3 py-2 hover:bg-blue-50 ${
                  value === option.value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                }`}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}

        {/* No results */}
        {isOpen && inputValue && filteredOptions.length === 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-2 px-3 text-sm text-gray-500 border border-gray-200">
            No matches found
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
