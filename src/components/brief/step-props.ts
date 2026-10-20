import type { BriefForm, FieldErrors } from "./brief-form";
import type { FieldProps, SetField } from "./useBriefForm";

/** What every wizard step receives from the form. */
export interface StepProps {
  form: BriefForm;
  set: SetField;
  errors: FieldErrors;
  fieldProps: FieldProps;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}
