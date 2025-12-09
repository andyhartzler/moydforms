'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, Star } from 'lucide-react';
import type { VoteSchema, VoteQuestion, VoteOption, SupportingDocument, QuestionType } from '@/lib/vote-types';

// Helper function to extract text from HTML
function stripHtmlTags(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// Helper function to clean and format description text
function cleanDescription(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

interface PublicVoteFormProps {
  schema: VoteSchema;
  voteTitle: string;
  memberName: string;
  voteDescription?: string | null;
  supportingDocuments?: SupportingDocument[] | null;
  onSubmit: (voteData: Record<string, unknown>) => Promise<void>;
  disabled?: boolean;
}

// Determine button color based on label
function getButtonColor(label: string): 'green' | 'red' | 'yellow' | 'default' {
  const lowerLabel = label.toLowerCase().trim();
  const greenKeywords = ['yes', 'aye', 'agree', 'affirm', 'approve', 'accept', 'support', 'for', 'in favor'];
  if (greenKeywords.some(keyword => lowerLabel === keyword || lowerLabel.includes(keyword))) {
    return 'green';
  }
  const redKeywords = ['no', 'nay', 'negative', 'deny', 'reject', 'oppose', 'against', 'disapprove', 'decline'];
  if (redKeywords.some(keyword => lowerLabel === keyword || lowerLabel.includes(keyword))) {
    return 'red';
  }
  const yellowKeywords = ['present', 'abstain', 'neutral', 'pass', 'skip', 'none', 'undecided'];
  if (yellowKeywords.some(keyword => lowerLabel === keyword || lowerLabel.includes(keyword))) {
    return 'yellow';
  }
  return 'default';
}

function getButtonStyles(color: 'green' | 'red' | 'yellow' | 'default', isSelected: boolean): string {
  const baseStyles = 'w-full py-3 px-4 rounded-lg font-semibold text-center transition-all duration-200 cursor-pointer border-2';
  if (isSelected) {
    switch (color) {
      case 'green':
        return `${baseStyles} bg-green-600 border-green-600 text-white shadow-lg scale-105`;
      case 'red':
        return `${baseStyles} bg-red-600 border-red-600 text-white shadow-lg scale-105`;
      case 'yellow':
        return `${baseStyles} bg-yellow-500 border-yellow-500 text-gray-900 shadow-lg scale-105`;
      default:
        return `${baseStyles} bg-blue-600 border-blue-600 text-white shadow-lg scale-105`;
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

// Multiple Choice Question
function MultipleChoiceQuestion({ question, value, onChange }: { question: VoteQuestion; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      {question.options?.map((option) => {
        const isSelected = value === option.id;
        const buttonColor = getButtonColor(option.label);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={getButtonStyles(buttonColor, isSelected)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Rating Scale Question
function RatingScaleQuestion({ question, value, onChange }: { question: VoteQuestion; value: number | null; onChange: (v: number) => void }) {
  const maxRating = question.max_rating || 5;
  const minRating = question.min_rating || 1;
  const range = Array.from({ length: maxRating - minRating + 1 }, (_, i) => minRating + i);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap justify-center">
        {range.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`w-12 h-12 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-1 border-2 ${
              value === rating
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
            }`}
          >
            <Star className="w-4 h-4" fill={value === rating ? 'currentColor' : 'none'} />
            {rating}
          </button>
        ))}
      </div>
      {value && <p className="text-center text-sm text-gray-600">You selected: {value} / {maxRating}</p>}
    </div>
  );
}

// Multiple Select Question
function MultipleSelectQuestion({ question, value, onChange }: { question: VoteQuestion; value: string[]; onChange: (v: string[]) => void }) {
  const handleToggle = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter((id) => id !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };

  return (
    <div className="space-y-3">
      {question.options?.map((option) => {
        const isSelected = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => handleToggle(option.id)}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-center transition-all duration-200 cursor-pointer border-2 flex items-center gap-3 ${
              isSelected
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
            }`}
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isSelected ? 'bg-white border-white' : 'border-gray-400'
              }`}
            >
              {isSelected && <span className="text-blue-600 font-bold">✓</span>}
            </div>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Short Answer Question
function ShortAnswerQuestion({ question, value, onChange }: { question: VoteQuestion; value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer here..."
      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-600 focus:outline-none transition-colors resize-none"
      rows={4}
    />
  );
}

// Ranked Choice Question
function RankedChoiceQuestion({ question, value, onChange }: { question: VoteQuestion; value: string[]; onChange: (v: string[]) => void }) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const rankedItems = value.length > 0 ? value : [];
  const unrankedItems = question.options?.filter((opt) => !value.includes(opt.id)) || [];

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    const index = rankedItems.indexOf(itemId);
    if ((direction === 'up' && index > 0) || (direction === 'down' && index < rankedItems.length - 1)) {
      const newRanked = [...rankedItems];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newRanked[index], newRanked[targetIndex]] = [newRanked[targetIndex], newRanked[index]];
      onChange(newRanked);
    }
  };

  const addToRanked = (itemId: string) => {
    onChange([...rankedItems, itemId]);
  };

  const removeFromRanked = (itemId: string) => {
    onChange(rankedItems.filter((id) => id !== itemId));
  };

  return (
    <div className="space-y-4">
      {/* Ranked Items */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-2 border-2 border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-3">Your Ranking:</p>
        {rankedItems.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Drag items here to rank them</p>
        ) : (
          rankedItems.map((itemId, index) => {
            const item = question.options?.find((opt) => opt.id === itemId);
            return (
              <div key={itemId} className="flex items-center gap-2 bg-white rounded-lg p-3 border border-blue-200">
                <span className="font-bold text-blue-600 w-6">{index + 1}.</span>
                <span className="flex-grow">{item?.label}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(itemId, 'up')}
                    disabled={index === 0}
                    className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(itemId, 'down')}
                    disabled={index === rankedItems.length - 1}
                    className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromRanked(itemId)}
                    className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Available Items */}
      {unrankedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Available Items:</p>
          <div className="space-y-2">
            {unrankedItems.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => addToRanked(option.id)}
                className="w-full py-2 px-3 rounded-lg bg-gray-50 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all text-left"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Yes/No Question
function YesNoQuestion({ question, value, onChange }: { question: VoteQuestion; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 border-2 ${
          value === true
            ? 'bg-green-600 border-green-600 text-white shadow-lg scale-105'
            : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 border-2 ${
          value === false
            ? 'bg-red-600 border-red-600 text-white shadow-lg scale-105'
            : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400'
        }`}
      >
        No
      </button>
    </div>
  );
}

// Main Form Component
export function PublicVoteForm({ schema, voteTitle, memberName, voteDescription, supportingDocuments, onSubmit, disabled }: PublicVoteFormProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const firstName = memberName.split(' ')[0];

  // Determine if this is a new multi-question vote or legacy single-question vote
  const questions = schema.questions || (schema.fields ? [{
    id: 'default',
    text: voteTitle,
    question_type: 'multiple_choice' as QuestionType,
    required: true,
    options: schema.fields,
  }] : []);

  const validateAnswers = (): boolean => {
    const newErrors: Record<string, string> = {};

    questions.forEach((question) => {
      if (question.required) {
        const answer = answers[question.id];
        const isEmpty = answer === undefined || answer === null || (Array.isArray(answer) && answer.length === 0) || (typeof answer === 'string' && answer.trim() === '');

        if (isEmpty) {
          newErrors[question.id] = `Please answer: ${question.text}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAnswers()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(answers);
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: VoteQuestion) => {
    const questionErrors = errors[question.id];

    return (
      <div key={question.id} className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {question.text}
            {question.required && <span className="text-red-500">*</span>}
          </h3>
          {questionErrors && <p className="text-sm text-red-600 mt-1">{questionErrors}</p>}
        </div>

        {question.question_type === 'multiple_choice' && (
          <MultipleChoiceQuestion
            question={question}
            value={(answers[question.id] as string) || null}
            onChange={(v) => setAnswers({ ...answers, [question.id]: v })}
          />
        )}

        {question.question_type === 'rating_scale' && (
          <RatingScaleQuestion
            question={question}
            value={(answers[question.id] as number) || null}
            onChange={(v) => setAnswers({ ...answers, [question.id]: v })}
          />
        )}

        {question.question_type === 'multiple_select' && (
          <MultipleSelectQuestion
            question={question}
            value={(answers[question.id] as string[]) || []}
            onChange={(v) => setAnswers({ ...answers, [question.id]: v })}
          />
        )}

        {question.question_type === 'short_answer' && (
          <ShortAnswerQuestion
            question={question}
            value={(answers[question.id] as string) || ''}
            onChange={(v) => setAnswers({ ...answers, [question.id]: v })}
          />
        )}

        {question.question_type === 'ranked_choice' && (
          <RankedChoiceQuestion
            question={question}
            value={(answers[question.id] as string[]) || []}
            onChange={(v) => setAnswers({ ...answers, [question.id]: v })}
          />
        )}

        {question.question_type === 'yes_no' && (
          <YesNoQuestion
            question={question}
            value={(answers[question.id] as boolean) || null}
            onChange={(v) => setAnswers({ ...answers, [question.id]: v })}
          />
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 max-w-2xl mx-auto">
        {/* Welcome */}
        <div className="flex items-center justify-center gap-2 text-sm text-green-700 mb-4">
          <CheckCircle className="w-4 h-4" />
          <span>Welcome, {firstName}!</span>
        </div>

        {/* Vote Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">{voteTitle}</h2>

        {/* Vote Description */}
        {voteDescription && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {cleanDescription(stripHtmlTags(voteDescription))}
            </p>
          </div>
        )}

        {/* Supporting Documents */}
        {supportingDocuments && Array.isArray(supportingDocuments) && supportingDocuments.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Supporting Documents</p>
            <div className="space-y-1.5">
              {supportingDocuments.map((doc, index) => (
                <a
                  key={doc.id || index}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                  </svg>
                  <span className="truncate">{doc.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="max-w-2xl mx-auto">
        {questions.map(renderQuestion)}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || disabled}
          className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Submit Vote
            </>
          )}
        </button>
      </div>
    </form>
  );
}
