import Link from 'next/link';
import { FormRecord, SupportingDocument } from '@/types/forms';

interface FormCardProps {
  form: FormRecord;
}


export default function FormCard({ form }: FormCardProps) {
  const typeConfig: Record<string, { accentColor: string; textColor: string; icon: React.ReactNode; label: string }> = {
    survey: {
      accentColor: 'from-white to-gray-200',
      textColor: 'text-white',
      label: 'Survey',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    registration: {
      accentColor: 'from-white to-gray-200',
      textColor: 'text-white',
      label: 'Registration',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      )
    },
    feedback: {
      accentColor: 'from-white to-gray-200',
      textColor: 'text-white',
      label: 'Feedback',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
        </svg>
      )
    },
    vote: {
      accentColor: 'from-white to-gray-200',
      textColor: 'text-white',
      label: 'Vote',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M15.528 15.5a2 2 0 01-1.06.63H3a2 2 0 01-2-2V7a2 2 0 012-2h11.468a2 2 0 011.06.63l2.04 1.86a1 1 0 010 1.46l-2.04 1.86zM6 11a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      )
    }
  };

  const config = typeConfig[form.form_type] || typeConfig.survey;

  // Use slug-based URL if available, otherwise fall back to ID
  const formUrl = `/${form.slug || form.id}`;

  return (
    <Link href={formUrl}>
      <div className="h-full group">
        <div className="relative h-full bg-gradient-to-br from-[#273351] to-[#1a2338] rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer hover:translate-y-[-4px]">
          {/* Accent bar - left side */}
          <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${config.accentColor}`} />

          {/* Content */}
          <div className="p-6 h-full flex flex-col relative z-10">
            {/* Header with icon and label */}
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center gap-2 ${config.textColor}`}>
                {config.icon}
                <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{config.label}</span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-3 normal-case leading-tight group-hover:text-white transition-colors">
              {form.title}
            </h3>

            {/* Preview text - shown on card tiles */}
            {form.preview_text && (
              <p className="text-gray-300 text-sm mb-6 flex-grow line-clamp-3 normal-case leading-relaxed">
                {form.preview_text}
              </p>
            )}

            {/* Supporting Documents */}
            {form.schema?.supporting_documents && Array.isArray(form.schema.supporting_documents) && form.schema.supporting_documents.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Supporting Documents</p>
                <div className="space-y-1">
                  {form.schema.supporting_documents.map((doc: SupportingDocument, index: number) => (
                    <a
                      key={doc.id || index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-white hover:text-blue-300 transition-colors break-all"
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                      </svg>
                      <span className="truncate">{doc.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="mt-auto">
              <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 ${config.textColor} font-semibold transition-all duration-200 group-hover:gap-3`}>
                Start Form
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Hover overlay glow effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
      </div>
    </Link>
  );
}
