import { useEffect, useRef, useState } from 'react';

function two(value: number) {
  return String(value).padStart(2, '0');
}

function isoToDisplay(value: string) {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1].slice(-2)}`;
}

function displayToIso(value: string) {
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{2}|\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = Number(match[3]);
  const year = match[3].length === 2 ? 2000 + rawYear : rawYear;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${two(month)}-${two(day)}`;
}

function openNativePicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    input.showPicker?.();
  } catch {
    input.focus();
    input.click();
  }
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function DateField({
  value,
  onChange,
  required = false,
  placeholder = 'DD-MM-YY',
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const lastEmitted = useRef(value);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    setDisplay(isoToDisplay(value));
    lastEmitted.current = value;
  }, [value]);

  return (
    <div className="date-field">
      <input
        className="date-field-text"
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        required={required}
        maxLength={10}
        pattern="\d{2}-\d{2}-(\d{2}|\d{4})"
        title="DD-MM-YY"
        onChange={(event) => {
          const next = event.target.value.toUpperCase().replace(/[^0-9-]/g, '');
          setDisplay(next);
          if (!next) {
            lastEmitted.current = '';
            onChange('');
            return;
          }
          const parsed = displayToIso(next);
          lastEmitted.current = parsed ?? '';
          onChange(parsed ?? '');
        }}
      />
      <button
        className="date-picker-button"
        type="button"
        aria-label="اختيار التاريخ من التقويم"
        title="اختيار من التقويم"
        onClick={() => openNativePicker(pickerRef.current)}
      >
        <CalendarIcon />
      </button>
      <input
        ref={pickerRef}
        className="native-date-picker"
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ''}
        onChange={(event) => {
          const next = event.target.value;
          lastEmitted.current = next;
          setDisplay(isoToDisplay(next));
          onChange(next);
        }}
      />
    </div>
  );
}

function isoDateTimeToDisplay(value: string) {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1].slice(-2)} ${match[4]}:${match[5]}`;
}

function displayToLocalDateTime(value: string) {
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{2}|\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const datePart = displayToIso(`${match[1]}-${match[2]}-${match[3]}`);
  if (!datePart) return null;
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (hour > 23 || minute > 59) return null;
  return `${datePart}T${two(hour)}:${two(minute)}`;
}

export function DateTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [display, setDisplay] = useState(() => isoDateTimeToDisplay(value));
  const lastEmitted = useRef(value);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    setDisplay(isoDateTimeToDisplay(value));
    lastEmitted.current = value;
  }, [value]);

  return (
    <div className="date-field">
      <input
        className="date-field-text"
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD-MM-YY HH:MM"
        value={display}
        maxLength={16}
        pattern="\d{2}-\d{2}-(\d{2}|\d{4})\s\d{2}:\d{2}"
        title="DD-MM-YY HH:MM"
        onChange={(event) => {
          const next = event.target.value.toUpperCase().replace(/[^0-9:\-\s]/g, '');
          setDisplay(next);
          if (!next) {
            lastEmitted.current = '';
            onChange('');
            return;
          }
          const parsed = displayToLocalDateTime(next);
          lastEmitted.current = parsed ?? '';
          onChange(parsed ?? '');
        }}
      />
      <button
        className="date-picker-button"
        type="button"
        aria-label="اختيار التاريخ والوقت من التقويم"
        title="اختيار من التقويم"
        onClick={() => openNativePicker(pickerRef.current)}
      >
        <CalendarIcon />
      </button>
      <input
        ref={pickerRef}
        className="native-date-picker"
        type="datetime-local"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ''}
        onChange={(event) => {
          const next = event.target.value;
          lastEmitted.current = next;
          setDisplay(isoDateTimeToDisplay(next));
          onChange(next);
        }}
      />
    </div>
  );
}
