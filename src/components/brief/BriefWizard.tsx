"use client";

import { useRef, useState } from "react";
import { BriefSchema, type Brief } from "@/lib/domain/schema";
import { BasicsStep } from "./BasicsStep";
import { ALL_FIELDS, BASICS_FIELDS, draftStages, toBrief } from "./brief-form";
import styles from "./BriefWizard.module.css";
import { GeneratingDialog } from "./GeneratingDialog";
import { QuickFillPanel } from "./QuickFillPanel";
import { StyleStep } from "./StyleStep";
import { useBriefForm } from "./useBriefForm";
import { usePlanGeneration } from "./usePlanGeneration";
import { useQuickFill } from "./useQuickFill";

interface Props {
  initialType?: Brief["type"];
  fromDescription: boolean;
}

/** The two-step brief, with AI quick-fill beside it and plan generation at the end. */
export function BriefWizard({ initialType, fromDescription }: Props) {
  const { form, set, errors, fill, validate, fieldProps } = useBriefForm(initialType);
  const quick = useQuickFill(fill, fromDescription);
  const generation = usePlanGeneration();
  const [step, setStep] = useState<"basics" | "style">("basics");
  const headingRef = useRef<HTMLHeadingElement>(null);

  function goTo(next: typeof step) {
    setStep(next);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "basics") {
      if (!Object.keys(validate(BASICS_FIELDS)).length) goTo("style");
      return;
    }
    const problems = validate(ALL_FIELDS);
    if (BASICS_FIELDS.some((f) => problems[f])) setStep("basics");
    if (!Object.keys(problems).length) void generation.start(BriefSchema.parse(toBrief(form)));
  }

  const stepProps = { form, set, errors, fieldProps, headingRef };
  return (
    <main id="main" className={`container ${styles.layout}`}>
      <QuickFillPanel
        description={quick.description}
        status={quick.status}
        onDescription={quick.setDescription}
        onRun={() => void quick.run(quick.description)}
      />
      <section className={styles.card} aria-labelledby="step-title">
        <ol className={styles.progress} aria-label="Brief progress">
          <li aria-current={step === "basics" ? "step" : undefined}>Basics</li>
          <li aria-current={step === "style" ? "step" : undefined}>Style and traditions</li>
        </ol>
        <form noValidate onSubmit={submit}>
          {step === "basics" ? (
            <BasicsStep {...stepProps} />
          ) : (
            <StyleStep
              {...stepProps}
              submitError={generation.error}
              onBack={() => goTo("basics")}
            />
          )}
        </form>
      </section>
      {generation.generating && (
        <GeneratingDialog
          stages={draftStages(form)}
          done={generation.generating.done}
          onFinished={generation.finish}
          onStop={generation.stop}
        />
      )}
    </main>
  );
}
