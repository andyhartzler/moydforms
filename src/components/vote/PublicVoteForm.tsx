'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { VoteSchema, VoteOption } from '@/lib/vote-types';

interface PublicVoteFormProps {
  schema: VoteSchema;
  voteTitle: string;
  memberName: string;
  onSubmit: (voteData: Record<string, unknown>) => Promise<void>;
  disabled?: boolean;
}

// Determine button color based on label
function getButtonColor(label: string): 'green' | 'red' | 'yellow' | 'default' {
  const lowerLabel = label.toLowerCase().trim();

  // Green: affirmative votes
  const greenKeywords = ['yes', 'aye', 'agree', 'affirm', 'approve', 'accept', 'support', 'for', 'in favor'];
  if (greenKeywords.some(keyword => lowerLabel === keyword || lowerLabel.includes(keyword))) {
    return 'green';
  }

  // Red: negative votes
  const redKeywords = ['no', 'nay', 'negative', 'deny', 'reject', 'oppose', 'against', 'disapprove', 'decline'];
  if (redKeywords.some(keyword => lowerLabel === keyword || lowerLabel.includes(keyword))) {
    return 'red';
  }

  // Yellow: neutral votes
  const yellowKeywords = ['present', 'abstain', 'neutral', 'pass', 'skip', 'none', 'undecided'];
  if (yellowKeywords.some(keyword => lowerLabel === keyword || lowerLabel.includes(keyword))) {
    return 'yellow';
  }

  return 'default';
}

// Get button styles based on color and selected state
function getButtonStyles(color: 'green' | 'red' | 'yellow' | 'default', isSelected: boolean): string {
  const baseStyles = 'w-40 py-3 px-4 rounded-lg font-semibold text-center transition-all duration-200 cursor-pointer border-2';

  if (isSelected) {
    switch (color) {
      case 'green':
        return `${baseStyles} bg-green-600 border-green-600 text-white shadow-lg scale-105`;
      case 'red':
        return `${baseStyles} bg-red-600 border-red-600 text-white shadow-lg scale-105`;
      case 'yellow':
        return `${baseStyles} bg-yellow-500 border-yellow-500 text-gray-900 shadow-lg scale-105`;
      default:
        return `${baseStyles} bg-primary border-primary text-white shadow-lg scale-105`;
    }
  } else {
    switch (color) {
      case 'green':
        return `${baseStyles} bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400`;
      case 'red':
        return `${baseStyles} bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400`;
      case 'yellow':
        return `${baseStyles} bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-400`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400`;
    }
  }
}

export function PublicVoteForm({ schema, voteTitle, memberName, onSubmit, disabled }: PublicVoteFormProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const firstName = memberName.split(' ')[0];

  const handleOptionSelect = (optionId: string) => {
    if (disabled) return;
    setSelectedOption(optionId);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOption) {
      setError('Please select an option to vote');
      return;
    }

    setSubmitting(true);
    try {
      // Submit with the selected option ID
      await onSubmit({ selected_option: selectedOption });
    } finally {
      setSubmitting(false);
    }
  };

  const renderVoteOption = (option: VoteOption) => {
    const isSelected = selectedOption === option.id;
    const buttonColor = getButtonColor(option.label);
    const buttonStyles = getButtonStyles(buttonColor, isSelected);

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => handleOptionSelect(option.id)}
        disabled={disabled}
        className={`${buttonStyles} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {option.label}
      </button>
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Compact Voting Card */}
      <div className="bg-white rounded-xl shadow-lg p-5 max-w-sm mx-auto">
        {/* Welcome + Verified inline */}
        <div className="flex items-center justify-center gap-2 text-sm text-green-700 mb-3">
          <CheckCircle className="w-4 h-4" />
          <span>Welcome, {firstName}!</span>
        </div>

        {/* Vote Title */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
          {voteTitle}
        </h2>

        {/* Vote Options */}
        <div className="flex flex-col items-center gap-3 mb-4">
          {schema.fields.map(renderVoteOption)}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || disabled || !selectedOption}
          className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Submit Vote
            </>
          )}
        </button>
      </div>
    </form>
  );
}
