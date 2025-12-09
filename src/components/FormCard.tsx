import Link from 'next/link';
import { FormRecord } from '@/types/forms';

interface FormCardProps {
  form: FormRecord;
}

export default function FormCard({ form }: FormCardProps) {
  const typeColors: Record<string, { border: string; badge: string; button: string }> = {
    survey: {
      border: 'border-t-4 border-blue-500',
      badge: 'bg-blue-100 text-blue-800',
      button: 'text-blue-600 hover:text-blue-700'
    },
    registration: {
      border: 'border-t-4 border-green-500',
      badge: 'bg-green-100 text-green-800',
      button: 'text-green-600 hover:text-green-700'
    },
    feedback: {
      border: 'border-t-4 border-purple-500',
      badge: 'bg-purple-100 text-purple-800',
      button: 'text-purple-600 hover:text-purple-700'
    },
    vote: {
      border: 'border-t-4 border-red-500',
      badge: 'bg-red-100 text-red-800',
      button: 'text-red-600 hover:text-red-700'
    }
  };

  const colors = typeColors[form.form_type] || typeColors.survey;

  // Use slug-based URL if available, otherwise fall back to ID
  const formUrl = form.slug ? `/f/${form.slug}` : `/${form.id}`;

  return (
    <Link href={formUrl}>
      <div className={`bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full flex flex-col hover:scale-105 ${colors.border}`}>
        <div className="p-6 flex flex-col h-full">
          {/* Header with badge */}
          <div className="flex items-start justify-between mb-4">
            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${colors.badge}`}>
              {form.form_type.charAt(0).toUpperCase() + form.form_type.slice(1)}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3 normal-case leading-snug">
            {form.title}
          </h3>

          {/* Description */}
          {form.description && (
            <p className="text-gray-600 text-sm mb-6 flex-grow line-clamp-3 normal-case">
              {form.description}
            </p>
          )}

          {/* CTA Button */}
          <div className={`mt-auto font-medium flex items-center ${colors.button} transition-colors`}>
            Start Form
            <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
