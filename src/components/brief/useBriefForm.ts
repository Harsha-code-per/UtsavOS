"use client";

import { useCallback, useRef, useState } from "react";
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
  ref: (element: HTMLElement | null) => void;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
  "data-filled": "" | undefined;
};

/** Form values, inline errors and which fields quick-fill just set. */
export function useBriefForm(initialType?: Brief["type"]) {
  const [form, setForm] = useState(() => emptyForm(initialType));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [filled, setFilled] = useState<BriefField[]>([]);
  const fields = useRef(new Map<BriefField, HTMLElement>());

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

  /** Shows errors for `checked` fields and focuses the first invalid one. */
  const validate = useCallback(
    (checked: BriefField[]): FieldErrors => {
      const next = validateFields(form, checked, localToday());
      setErrors(next);
      const first = checked.find((f) => next[f]);
      if (first) fields.current.get(first)?.focus();
      return next;
    },
    [form],
  );

  const fieldProps: FieldProps = useCallback(
    (field) => ({
      id: `brief-${field}`,
      ref: (element) => {
        if (element) fields.current.set(field, element);
        else fields.current.delete(field);
      },
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": errors[field] ? `brief-${field}-error` : undefined,
      "data-filled": filled.includes(field) ? "" : undefined,
    }),
    [errors, filled],
  );

  return { form, set, errors, fill, validate, fieldProps };
}
