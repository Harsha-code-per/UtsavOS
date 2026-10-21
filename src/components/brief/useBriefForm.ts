"use client";

import { useCallback, useState } from "react";
import type { BriefPatch } from "@/lib/ai/types";
import type { Brief } from "@/lib/domain/schema";
import { localToday } from "@/lib/domain/timeline";
import {
  applyPatch,
  emptyForm,
  patchedFields,
  validateFields,
  type BriefField,
  type BriefForm,
  type FieldErrors,
} from "./brief-form";

export type SetField = <K extends BriefField>(key: K, value: BriefForm[K]) => void;
export type FieldProps = (field: BriefField) => {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
  "data-filled": "" | undefined;
};

/** Form values, inline errors and which fields quick-fill just set. */
export function useBriefForm(initialType?: Brief["type"]) {
  const [form, setForm] = useState(() => emptyForm(initialType));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [filled, setFilled] = useState<BriefField[]>([]);

  const set: SetField = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }, []);

  /** Applies a quick-fill patch; returns how many fields it filled. */
  const fill = useCallback((patch: BriefPatch) => {
    const fields = patchedFields(patch);
    setForm((f) => applyPatch(f, patch));
    setFilled(fields);
    setErrors({});
    return fields.length;
  }, []);

  /** Shows errors for `fields` and focuses the first invalid one. */
  function validate(fields: BriefField[]): FieldErrors {
    const next = validateFields(form, fields, localToday());
    setErrors(next);
    const first = fields.find((f) => next[f]);
    if (first) document.getElementById(`brief-${first}`)?.focus();
    return next;
  }

  const fieldProps: FieldProps = (field) => ({
    id: `brief-${field}`,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `brief-${field}-error` : undefined,
    "data-filled": filled.includes(field) ? "" : undefined,
  });

  return { form, set, errors, fill, validate, fieldProps };
}
