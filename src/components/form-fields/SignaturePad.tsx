'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import SignaturePadLib from 'signature_pad';
import { FormFieldConfig, FileUploadResult } from '@/types/forms';
import FieldHelp from './FieldHelp';
import { Eraser, Check, Loader2 } from 'lucide-react';

interface SignaturePadProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  /** When provided, the drawn signature is uploaded as a real PNG file and the
   *  stored value is the file URL. Without it, we store a PNG data URL. */
  onFileUpload?: (file: File, fieldId: string) => Promise<FileUploadResult>;
}

const INK = '#263351'; // MOYD navy

/**
 * Best-in-class signature field. Uses the `signature_pad` library for smooth,
 * pressure-like bezier strokes; renders on a high-DPI, fully responsive canvas
 * that works with touch, pen, and mouse; disables page scroll while signing on
 * mobile; and exports a white-background PNG (uploaded as a real file when an
 * uploader is available, else stored as a PNG data URL).
 */
export default function SignaturePad({
  field, value, onChange, error, onBlur, onFocus, onFileUpload,
}: SignaturePadProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const saveRef = useRef<() => void>(() => {});
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasInk, setHasInk] = useState<boolean>(!!value);
  const [saved, setSaved] = useState<boolean>(!!value);
  const [uploading, setUploading] = useState(false);

  // Size the canvas to its container at the device pixel ratio so strokes are
  // crisp. Resizing clears the canvas, so preserve + restore the drawing.
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const pad = padRef.current;
    if (!canvas || !wrap || !pad) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const data = pad.toData();
    canvas.width = wrap.clientWidth * ratio;
    canvas.height = 200 * ratio;
    canvas.style.width = `${wrap.clientWidth}px`;
    canvas.style.height = '200px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(ratio, ratio);
    pad.clear(); // also resets internal state to the new size
    if (data.length) pad.fromData(data);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePadLib(canvas, {
      penColor: INK,
      backgroundColor: '#ffffff',
      minWidth: 0.9,
      maxWidth: 2.6,
      velocityFilterWeight: 0.7,
    });
    padRef.current = pad;
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    pad.addEventListener('beginStroke', () => { onFocus?.(); });
    pad.addEventListener('endStroke', () => {
      setHasInk(!pad.isEmpty());
      setSaved(false);
      // Auto-commit shortly after the pen lifts so a candidate who draws their
      // signature and hits Submit isn't told "signature required" with their
      // signature visibly on the canvas (the #1 rage-quit point). The Save
      // button remains as an explicit affordance.
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => { saveRef.current(); }, 650);
    });
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      pad.off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clear = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    padRef.current?.clear();
    setHasInk(false);
    setSaved(false);
    onChange('');
  };

  // Persist the signature: upload a PNG file if we can, else store a data URL.
  const save = async () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    const dataUrl = pad.toDataURL('image/png');
    if (onFileUpload) {
      try {
        setUploading(true);
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });
        const res = await onFileUpload(file, field.id);
        onChange(res.url);
      } catch {
        onChange(dataUrl); // fall back to inline PNG if the upload fails
      } finally {
        setUploading(false);
      }
    } else {
      onChange(dataUrl);
    }
    setSaved(true);
    onBlur?.();
  };
  // Keep the latest save closure reachable from the (mount-only) endStroke
  // auto-commit handler.
  saveRef.current = save;

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-800 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <FieldHelp html={field.help} className="text-sm text-gray-500 mb-2" />

      <div
        ref={wrapRef}
        className={`relative rounded-2xl border-2 bg-white overflow-hidden select-none
          ${error ? 'border-red-300' : saved ? 'border-green-400' : 'border-gray-200'}`}
      >
        {/* Signature baseline + hint (fade out once there's ink) */}
        <div
          className={`pointer-events-none absolute inset-x-6 bottom-9 flex items-center gap-3 transition-opacity duration-200 ${hasInk ? 'opacity-0' : 'opacity-100'}`}
        >
          <span className="text-gray-300 text-xl leading-none">✕</span>
          <span className="flex-1 border-b border-dashed border-gray-300" />
        </div>
        <span
          className={`pointer-events-none absolute left-6 bottom-3 text-xs font-medium text-gray-400 transition-opacity ${hasInk ? 'opacity-0' : 'opacity-100'}`}
        >
          Sign here
        </span>

        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          style={{ height: 200 }}
          aria-label="Signature canvas"
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk || uploading}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors"
        >
          <Eraser className="w-4 h-4" />
          Clear
        </button>

        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
            <Check className="w-4 h-4" /> Signature saved
          </span>
        ) : (
          <button
            type="button"
            onClick={save}
            disabled={!hasInk || uploading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Save signature</>}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
