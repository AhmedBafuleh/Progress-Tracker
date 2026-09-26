import { useEffect, useState } from 'react';

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

  useEffect(() => {
    setDisplay(isoToDisplay(value));
  }, [value]);

  return (
    <input
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
          onChange('');
          return;
        }
        const parsed = displayToIso(next);
        if (parsed) onChange(parsed);
      }}
    />
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

  useEffect(() => {
    setDisplay(isoDateTimeToDisplay(value));
  }, [value]);

  return (
    <input
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
          onChange('');
          return;
        }
        const parsed = displayToLocalDateTime(next);
        if (parsed) onChange(parsed);
      }}
    />
  );
}
