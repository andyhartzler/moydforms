import Link from 'next/link';
import { FormRecord } from '@/types/forms';

interface FormCardProps {
  form: FormRecord;
}

export default function FormCard({ form }: FormCardProps) {
  const typeIcons: Record<string, string> = {
    survey: '📊',
    registration: '📝',
    feedback: '💬',
    vote: '🗳️'
  };

  const typeColors: Record<string, string> = {
    survey: 'bg-blue-100 text-blue-800',
    registration: 'bg-green-100 text-green-800',
    feedback: 'bg-purple-100 text-purple-800',
    vote: 'bg-red-100 text-red-800'
  };

  // Use slug-based URL if available, otherwise fall back to ID
  const formUrl = form.slug ? `/f/${form.slug}` : `/${form.id}`;

  return (
    <Link href={formUrl}>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">
            {typeIcons[form.form_type] || '📋'}
          </span>
          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${typeColors[form.form_type]}`}>
            {form.form_type.charAt(0).toUpperCase() + form.form_type.slice(1)}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 normal-case">
          {form.title}
        </h3>

        {form.description && (
          <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3 normal-case">
            {form.description}
          </p>
        )}

        {/* Estimated time */}
        {form.schema?.fields && (
          <p className="text-xs text-gray-500">
            ⏱️ Approximately {Math.ceil(form.schema.fields.length / 2)} minutes
          </p>
        )}

        <div className="mt-4 text-blue-600 font-medium flex items-center">
          Start Form
          <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
