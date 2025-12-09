'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, Star, GripVertical, ChevronUp, ChevronDown, Check } from 'lucide-react';
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

function getButtonStyles(color: 'green' | 'red' | 'yellow' | 'default', isSelected: boolean, isDisabled?: boolean): string {
  const baseStyles = 'px-6 py-3 rounded-lg font-semibold text-center transition-all border-2 min-w-[100px] flex items-center justify-center gap-2';

  if (isDisabled && !isSelected) {
    return `${baseStyles} cursor-not-allowed opacity-60 bg-gray-100 border-gray-200 text-gray-500`;
  }

  if (isSelected) {
    switch (color) {
      case 'green':
        return `${baseStyles} bg-green-600 border-green-600 text-white shadow-lg`;
      case 'red':
        return `${baseStyles} bg-red-600 border-red-600 text-white shadow-lg`;
      case 'yellow':
        return `${baseStyles} bg-yellow-500 border-yellow-500 text-white shadow-lg`;
      default:
        return `${baseStyles} bg-blue-600 border-blue-600 text-white shadow-lg`;
    }
  } else {
    switch (color) {
      case 'green':
        return `${baseStyles} bg-green-50 border-green-300 text-green-700 hover:bg-green-100 hover:border-green-400 cursor-pointer`;
      case 'red':
        return `${baseStyles} bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 cursor-pointer`;
      case 'yellow':
        return `${baseStyles} bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-400 cursor-pointer`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 cursor-pointer`;
    }
  }
}

// Multiple Choice Question
function MultipleChoiceQuestion({ question, value, onChange }: { question: VoteQuestion; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-4">
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
            {isSelected && <Check className="w-5 h-5" />}
            <span>{option.label}</span>
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
    <div className="flex justify-center">
      <div className="flex gap-2">
        {range.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`p-2 transition-all ${value === rating ? 'cursor-pointer hover:scale-110' : 'cursor-pointer hover:scale-110'}`}
            aria-label={`Rate ${rating} out of ${maxRating}`}
          >
            <Star
              className={`w-10 h-10 transition-colors ${
                value && rating <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-200 text-gray-200'
              }`}
            />
          </button>
        ))}
      </div>
      {value && (
        <span className="ml-4 text-lg font-medium text-gray-700 self-center">
          {value}/{maxRating}
        </span>
      )}
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
      placeholder="Enter your response..."
      rows={4}
      className={`w-full p-4 border-2 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none`}
    />
  );
}

// Ranked Choice Question with Drag and Drop
function RankedChoiceQuestion({ question, value, onChange }: { question: VoteQuestion; value: string[]; onChange: (v: string[]) => void }) {
  const options = question.options || [];

  // Initialize with current order or default order
  const rankedIds = value && value.length > 0
    ? value
    : options.map(o => o.id);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...rankedIds];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onChange(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === rankedIds.length - 1) return;
    const newOrder = [...rankedIds];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onChange(newOrder);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...rankedIds];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    onChange(newOrder);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getOptionById = (id: string) => options.find(o => o.id === id);

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 text-center mb-4">
        Drag items or use arrows to rank from most preferred (1) to least preferred
      </p>
      {rankedIds.map((optionId, index) => {
        const option = getOptionById(optionId);
        if (!option) return null;

        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index && draggedIndex !== index;

        return (
          <div
            key={optionId}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 bg-white transition-all ${
              isDragging ? 'opacity-50 border-dashed' : ''
            } ${
              isDragOver ? 'border-blue-600 bg-blue-50 transform scale-[1.02]' : 'border-gray-200'
            } cursor-grab active:cursor-grabbing`}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex-shrink-0">
              {index + 1}
            </div>
            <GripVertical className="w-5 h-5 flex-shrink-0 text-gray-400" />
            <span className="flex-grow font-medium text-gray-800">{option.label}</span>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className={`p-1 rounded transition-colors ${
                  index === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
                }`}
                aria-label="Move up"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === rankedIds.length - 1}
                className={`p-1 rounded transition-colors ${
                  index === rankedIds.length - 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
                }`}
                aria-label="Move down"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Yes/No Question
function YesNoQuestion({ question, value, onChange }: { question: VoteQuestion; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-center gap-6">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={getButtonStyles('green', value === true)}
      >
        {value === true && <Check className="w-5 h-5" />}
        <span>Yes</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={getButtonStyles('red', value === false)}
      >
        {value === false && <Check className="w-5 h-5" />}
        <span>No</span>
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

  const getQuestionHelperText = (questionType: QuestionType): string => {
    switch (questionType) {
      case 'multiple_choice':
        return 'Select one option';
      case 'multiple_select':
        return 'Select all that apply';
      case 'yes_no':
        return 'Select Yes or No';
      case 'rating_scale':
        return 'Rate from 1 to 5 stars';
      case 'short_answer':
        return 'Enter your response';
      case 'ranked_choice':
        return 'Rank the options in order of preference';
      default:
        return '';
    }
  };

  const renderQuestion = (question: VoteQuestion, index: number) => {
    const questionErrors = errors[question.id];

    return (
      <div key={question.id} className="bg-white rounded-xl shadow-soft p-6">
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-bold text-sm flex-shrink-0">
              {index + 1}
            </span>
            <h3 className="text-lg font-bold text-gray-900">
              {question.text}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </h3>
          </div>
          <p className="text-sm text-gray-500 ml-10">
            {getQuestionHelperText(question.question_type)}
          </p>
          {questionErrors && <p className="text-sm text-red-600 mt-2 ml-10">{questionErrors}</p>}
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
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 max-w-3xl mx-auto">
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
      <div className="max-w-3xl mx-auto space-y-6">
        {questions.map((question, index) => renderQuestion(question, index))}

        {/* Submit Button */}
        <div className="flex justify-center pt-2">
          <button
            type="submit"
            disabled={submitting || disabled}
            className="btn-primary px-12 py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </form>
  );
}
