import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Candidate Survey — Exec Committee Preview | MOYD',
  robots: { index: false, follow: false },
};

// 2026-06-10T02:00:00.000Z === 9:00 PM Central, June 9, 2026
const EXPIRY_MS = 1781056800000;

interface SchemaField {
  id: string;
  type: string;
  label?: string;
  help?: string;
  required?: boolean;
  pageNumber?: number;
  page?: number;
  placeholder?: string;
  options?: Array<{ label?: string; value?: string } | string>;
}

const TYPE_LABELS: Record<string, string> = {
  short_answer: 'Short answer',
  long_answer: 'Long answer',
  radio: 'Multiple choice (one)',
  checkbox_group: 'Checkboxes (multiple)',
  dropdown: 'Dropdown',
  phone: 'Phone',
  email: 'Email',
  number: 'Number',
  date_picker: 'Date',
  file_upload: 'File upload',
  prefilled_confirm: 'Prefilled (confirm)',
  section_header: 'Section header',
};

function Watermark() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-40 pointer-events-none select-none overflow-hidden"
    >
      <div
        className="absolute whitespace-nowrap"
        style={{
          top: '-60%',
          left: '-60%',
          width: '220%',
          height: '220%',
          transform: 'rotate(-30deg)',
        }}
      >
        {Array.from({ length: 40 }).map((_, row) => (
          <div
            key={row}
            className="font-bold tracking-widest whitespace-nowrap"
            style={{
              fontSize: '2.25rem',
              lineHeight: '6rem',
              color: 'rgba(55, 65, 81, 0.07)',
            }}
          >
            {Array.from({ length: 14 })
              .map(() => 'NOT FOR DISTRIBUTION')
              .join('      ')}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpiredPage() {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 text-center border border-white/40">
        <p className="text-xl font-semibold text-gray-900">
          This preview link has expired.
        </p>
      </div>
    </div>
  );
}

export default async function CandidateSurveyPreviewPage() {
  if (Date.now() >= EXPIRY_MS) {
    return <ExpiredPage />;
  }

  const supabase = createClient();
  const { data: form, error } = await supabase
    .from('form_schemas')
    .select('slug, title, schema, page_count')
    .eq('slug', 'endorsement-questionnaire-2026')
    .single();

  if (error || !form) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/95 rounded-3xl shadow-2xl p-10 text-center">
          <p className="text-xl font-semibold text-gray-900">
            Unable to load the survey preview. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const rawSchema = (form.schema ?? {}) as {
    fields?: SchemaField[];
    questions?: SchemaField[];
  };
  const fields: SchemaField[] = rawSchema.fields ?? rawSchema.questions ?? [];

  // Group by page, preserving original order within each page.
  const pages = new Map<number, SchemaField[]>();
  for (const f of fields) {
    const p = f.pageNumber ?? f.page ?? 1;
    if (!pages.has(p)) pages.set(p, []);
    pages.get(p)!.push(f);
  }
  const pageNumbers = Array.from(pages.keys()).sort((a, b) => a - b);

  let questionNumber = 0;

  return (
    <div className="relative z-10 min-h-screen pb-24">
      <Watermark />
      <div className="max-w-3xl mx-auto px-4 pt-10">
        {/* Branded header */}
        <div className="bg-moyd-unity rounded-3xl shadow-2xl border border-white/10 p-8 mb-8">
          <p className="text-moyd-sunrise text-sm font-semibold uppercase tracking-widest mb-2">
            Missouri Young Democrats
          </p>
          <h1 className="text-3xl font-bold text-white font-display">
            Candidate Survey — Exec Committee Preview
          </h1>
          <p className="text-white/80 mt-3 text-sm">
            {form.title} · {fields.length} items across {pageNumbers.length} pages ·
            read-only preview
          </p>
          <p className="text-moyd-sunrise/90 mt-1 text-sm font-medium">
            Link expires 9:00 PM Central, June 9, 2026
          </p>
        </div>

        {/* Survey content */}
        {pageNumbers.map((pageNum) => (
          <section key={pageNum} className="mb-10">
            <h2 className="text-white/90 text-sm font-bold uppercase tracking-widest mb-4 pl-1">
              Page {pageNum}
            </h2>
            <div className="space-y-4">
              {pages.get(pageNum)!.map((field) => {
                if (field.type === 'section_header') {
                  return (
                    <div
                      key={field.id}
                      className="bg-white/95 backdrop-blur rounded-2xl shadow-soft border-l-4 border-moyd-sunrise p-6"
                    >
                      <h3 className="text-xl font-bold text-gray-900 font-display">
                        {field.label}
                      </h3>
                      {field.help && (
                        <p className="text-gray-600 mt-2 text-sm leading-relaxed">
                          {field.help}
                        </p>
                      )}
                    </div>
                  );
                }

                questionNumber += 1;
                const options = (field.options ?? []).map((o) =>
                  typeof o === 'string' ? o : (o.label ?? o.value ?? '')
                );

                return (
                  <div
                    key={field.id}
                    className="bg-white/95 backdrop-blur rounded-2xl shadow-soft p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-semibold text-gray-900">
                        <span className="text-primary-600 mr-2">
                          {questionNumber}.
                        </span>
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1" title="Required">
                            *
                          </span>
                        )}
                      </p>
                      <span className="shrink-0 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2.5 py-1">
                        {TYPE_LABELS[field.type] ?? field.type}
                      </span>
                    </div>
                    {field.help && (
                      <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                        {field.help}
                      </p>
                    )}
                    {options.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {options.map((opt, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-sm text-gray-700"
                          >
                            <span
                              className={`inline-block w-3.5 h-3.5 border-2 border-gray-300 shrink-0 ${
                                field.type === 'checkbox_group'
                                  ? 'rounded'
                                  : 'rounded-full'
                              }`}
                            />
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <p className="text-center text-white/60 text-xs mt-12">
          Internal preview for the MOYD Executive Committee. Not for
          distribution.
        </p>
      </div>
    </div>
  );
}
