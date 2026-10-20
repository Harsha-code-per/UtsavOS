import type { BriefField, FieldErrors } from "./brief-form";

/** The inline error under a field, linked to it by `aria-describedby`. */
export function FieldError({ field, errors }: { field: BriefField; errors: FieldErrors }) {
  const message = errors[field];
  if (!message) return null;
  return (
    <p id={`brief-${field}-error`} className="field-error">
      {message}
    </p>
  );
}
