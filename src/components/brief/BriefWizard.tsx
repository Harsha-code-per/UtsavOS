"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, localToday } from "@/lib/api/client";
import type { BriefPatch } from "@/lib/ai/planner";
import { formatDate, formatMoney } from "@/lib/domain/format";
import {
  BriefSchema,
  CURRENCIES,
  EVENT_TYPES,
  LANGUAGES,
  type Brief,
  type Plan,
} from "@/lib/domain/schema";
import { TRADITIONS } from "@/lib/domain/traditions";
import { takeDescription } from "@/lib/store/handoff";
import { usePlanActions } from "@/lib/store/usePlans";
import { GeneratingDialog } from "./GeneratingDialog";
import styles from "./BriefWizard.module.css";

type EventType = Brief["type"];

interface Form {
  type: EventType;
  name: string;
  date: string;
  city: string;
  guests: string;
  budget: string;
  currency: Brief["currency"];
  vibe: string;
  traditions: string[];
  diet: string;
  language: Brief["language"];
}

type Field = keyof Form;
const STEP_FIELDS: Field[][] = [
  ["type", "name", "date", "city", "guests", "budget", "currency"],
  ["vibe", "traditions", "diet", "language"],
];

const TYPE_CARDS: Record<EventType, { label: string; hint: string }> = {
  wedding: { label: "Wedding", hint: "Roka to reception" },
  birthday: { label: "Birthday", hint: "First to fiftieth" },
  community: { label: "Community", hint: "Pandals, meetups, drives" },
  festival: { label: "Festival", hint: "Diwali, Eid, Onam, Christmas" },
};

const MESSAGES: Partial<Record<Field, string>> = {
  name: "Give the celebration a name.",
  date: "Pick the date.",
  city: "Add the city.",
  guests: "Enter the number of guests, from 1 to 5,000.",
  budget: "Enter the total budget as a whole number.",
};

const DIETS = ["Vegetarian", "Veg and non-veg", "Jain options needed", "Vegan options needed"];

function toBrief(form: Form): unknown {
  return {
    ...form,
    guests: Number(form.guests.replace(/[^\d]/g, "")) || 0,
    budget: Number(form.budget.replace(/[^\d]/g, "")) || 0,
  };
}

const FIELDS = new Set<string>(STEP_FIELDS.flat());

/** Brief fields present in a quick-fill patch. */
const patchedFields = (patch: BriefPatch) =>
  Object.keys(patch).filter(
    (k): k is Field => FIELDS.has(k) && patch[k as keyof BriefPatch] !== undefined,
  );

function applyPatch(form: Form, patch: BriefPatch): Form {
  const next = { ...form };
  for (const key of patchedFields(patch)) {
    const value = patch[key as keyof BriefPatch];
    if (key === "guests" || key === "budget") next[key] = String(value);
    else if (key === "traditions") {
      next.traditions = [...new Set([...form.traditions, ...(value as string[])])].slice(0, 12);
    } else (next as Record<Field, unknown>)[key] = value;
  }
  return next;
}

const DRAFT_STAGES = (form: Form) => [
  `Splitting your ${form.budget ? formatMoney(Number(form.budget), form.currency) : ""} budget…`,
  `Counting back from ${form.date ? formatDate(form.date) : "the big day"}…`,
  "Choosing the vendors you'll need…",
  `Gathering ideas for ${form.city || "your city"}…`,
];

export function BriefWizard({
  initialType,
  fromDescription,
}: {
  initialType?: EventType;
  fromDescription: boolean;
}) {
  const router = useRouter();
  const { save } = usePlanActions();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    type: initialType ?? "wedding",
    name: "",
    date: "",
    city: "",
    guests: "",
    budget: "",
    currency: "INR",
    vibe: "",
    traditions: [],
    diet: DIETS[1]!,
    language: "en",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [filled, setFilled] = useState<Field[]>([]);
  const [customTradition, setCustomTradition] = useState("");

  const [description, setDescription] = useState("");
  const [quickFill, setQuickFill] = useState<{
    state: "idle" | "busy" | "done" | "error";
    message?: string;
  }>({
    state: "idle",
  });

  const [generating, setGenerating] = useState<{
    done: boolean;
    plan?: Plan;
    notice?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);

  const set = <K extends Field>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const runQuickFill = useCallback(async (text: string) => {
    if (text.trim().length < 3) {
      setQuickFill({ state: "error", message: "Describe the celebration in a few words first." });
      return;
    }
    setQuickFill({ state: "busy" });
    try {
      const { patch } = await api.parseBrief(text);
      const fields = patchedFields(patch);
      const count = fields.length;
      setForm((f) => applyPatch(f, patch));
      setFilled(fields);
      setErrors({});
      setQuickFill({
        state: "done",
        message: count
          ? `Filled ${count} field${count === 1 ? "" : "s"} from your description. Check them below.`
          : "Couldn't find details to fill. Try adding the date, city or guest count.",
      });
    } catch (e) {
      setQuickFill({ state: "error", message: (e as Error).message });
    }
  }, []);

  // Arriving from the landing page with a description: fill the form straight away.
  useEffect(() => {
    if (!fromDescription) return;
    const text = takeDescription();
    if (!text) return;
    void Promise.resolve().then(() => {
      setDescription(text);
      return runQuickFill(text);
    });
  }, [fromDescription, runQuickFill]);

  /** Checks the given fields, shows their errors, focuses the first invalid one. */
  function validate(fields: Field[]): Partial<Record<Field, string>> {
    const result = BriefSchema.safeParse(toBrief(form));
    const next: Partial<Record<Field, string>> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as Field;
        if (fields.includes(field) && !next[field]) {
          next[field] = MESSAGES[field] ?? "Check this field.";
        }
      }
    }
    if (fields.includes("date") && form.date && form.date < localToday()) {
      next.date = "Pick a date from today onwards.";
    }
    setErrors(next);
    const first = fields.find((f) => next[f]);
    if (first) document.getElementById(`brief-${first}`)?.focus();
    return next;
  }

  function goTo(nextStep: number) {
    setStep(nextStep);
    requestAnimationFrame(() => stepHeading.current?.focus());
  }

  async function generate() {
    const problems = validate(STEP_FIELDS.flat());
    if (Object.keys(problems).length) {
      if (STEP_FIELDS[0]!.some((f) => problems[f])) setStep(0);
      return;
    }
    setSubmitError(null);
    const controller = new AbortController();
    abort.current = controller;
    setGenerating({ done: false });
    try {
      const brief = BriefSchema.parse(toBrief(form));
      const { plan, notice } = await api.draftPlan(brief, controller.signal);
      save(plan);
      setGenerating({ done: true, plan, notice });
    } catch (e) {
      setGenerating(null);
      if ((e as Error).name !== "AbortError") setSubmitError((e as Error).message);
    }
  }

  const finish = useCallback(() => {
    if (!generating?.plan) return;
    router.push(`/plan/${generating.plan.id}${generating.notice ? "?starter=1" : ""}`);
  }, [generating, router]);

  const fieldProps = (field: Field) => ({
    id: `brief-${field}`,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `brief-${field}-error` : undefined,
    "data-filled": filled.includes(field) ? "" : undefined,
  });

  const error = (field: Field) =>
    errors[field] && (
      <p id={`brief-${field}-error`} className="field-error">
        {errors[field]}
      </p>
    );

  const traditionOptions = [...new Set([...TRADITIONS[form.type], ...form.traditions])];

  return (
    <main id="main" className={`container ${styles.layout}`}>
      <aside className={styles.side} aria-labelledby="quick-title">
        <h1 className={styles.title}>Tell us about the celebration.</h1>
        <p className={styles.lead}>
          Fill in the brief, or describe it and let Gemini fill it in. You can change anything
          later.
        </p>

        <form
          className={styles.quick}
          onSubmit={(e) => {
            e.preventDefault();
            void runQuickFill(description);
          }}
        >
          <h2 id="quick-title" className={styles.quickTitle}>
            Quick-fill with AI
          </h2>
          <label htmlFor="describe" className={styles.quickLabel}>
            Describe it in any language
          </label>
          <textarea
            id="describe"
            className={styles.quickInput}
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beti ka pehla birthday, Pune mein, 60 log, 1.5 lakh budget, jungle theme"
          />
          <button type="submit" className="btn btn-primary" disabled={quickFill.state === "busy"}>
            {quickFill.state === "busy" ? "Reading your description…" : "Fill the form for me"}
          </button>
          <p
            className={styles.quickStatus}
            role="status"
            aria-live="polite"
            data-state={quickFill.state}
          >
            {quickFill.message}
          </p>
        </form>
      </aside>

      <section className={styles.card} aria-labelledby="step-title">
        <ol className={styles.progress} aria-label="Brief progress">
          <li aria-current={step === 0 ? "step" : undefined}>Basics</li>
          <li aria-current={step === 1 ? "step" : undefined}>Style and traditions</li>
        </ol>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 0) {
              if (!Object.keys(validate(STEP_FIELDS[0]!)).length) goTo(1);
            } else void generate();
          }}
        >
          {step === 0 ? (
            <>
              <h2 id="step-title" ref={stepHeading} tabIndex={-1} className={styles.stepTitle}>
                What are we celebrating?
              </h2>
              <fieldset className={styles.types}>
                <legend className="visually-hidden">Event type</legend>
                {EVENT_TYPES.map((type) => (
                  <label key={type} className={styles.typeCard}>
                    <input
                      type="radio"
                      name="type"
                      value={type}
                      checked={form.type === type}
                      onChange={() => {
                        set("type", type);
                        set("traditions", []);
                      }}
                    />
                    <span className={styles.typeLabel}>{TYPE_CARDS[type].label}</span>
                    <span className={styles.typeHint}>{TYPE_CARDS[type].hint}</span>
                  </label>
                ))}
              </fieldset>

              <div className={styles.grid}>
                <div className={`field ${styles.span2}`}>
                  <label htmlFor="brief-name">Event name</label>
                  <input
                    className="input"
                    {...fieldProps("name")}
                    value={form.name}
                    maxLength={80}
                    placeholder="Ananya and Rohan's wedding"
                    onChange={(e) => set("name", e.target.value)}
                  />
                  {error("name")}
                </div>
                <div className="field">
                  <label htmlFor="brief-date">Date</label>
                  <input
                    className="input"
                    type="date"
                    min={localToday()}
                    {...fieldProps("date")}
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                  />
                  {error("date")}
                </div>
                <div className="field">
                  <label htmlFor="brief-city">City</label>
                  <input
                    className="input"
                    {...fieldProps("city")}
                    value={form.city}
                    maxLength={60}
                    autoComplete="address-level2"
                    onChange={(e) => set("city", e.target.value)}
                  />
                  {error("city")}
                </div>
                <div className="field">
                  <label htmlFor="brief-guests">Guests</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    {...fieldProps("guests")}
                    value={form.guests}
                    onChange={(e) => set("guests", e.target.value)}
                  />
                  {error("guests")}
                </div>
                <div className="field">
                  <label htmlFor="brief-budget">Total budget</label>
                  <div className={styles.money}>
                    <label htmlFor="brief-currency" className="visually-hidden">
                      Currency
                    </label>
                    <select
                      className="input"
                      {...fieldProps("currency")}
                      value={form.currency}
                      onChange={(e) => set("currency", e.target.value as Form["currency"])}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      className="input"
                      inputMode="numeric"
                      {...fieldProps("budget")}
                      value={form.budget}
                      onChange={(e) => set("budget", e.target.value)}
                    />
                  </div>
                  {error("budget") ||
                    (Number(form.budget) > 0 && (
                      <p className="field-hint">
                        {formatMoney(Number(form.budget), form.currency)}
                      </p>
                    ))}
                </div>
              </div>
              <div className={styles.actions}>
                <button type="submit" className="btn btn-ink">
                  Continue to style
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 id="step-title" ref={stepHeading} tabIndex={-1} className={styles.stepTitle}>
                Traditions and moments to plan for
              </h2>
              <p className="field-hint">
                Each one becomes timeline tasks, vendors and budget lines. Pick all that apply.
              </p>
              <div className={styles.chips} role="group" aria-label="Traditions">
                {traditionOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="chip"
                    aria-pressed={form.traditions.includes(t)}
                    onClick={() =>
                      set(
                        "traditions",
                        form.traditions.includes(t)
                          ? form.traditions.filter((x) => x !== t)
                          : [...form.traditions, t].slice(0, 12),
                      )
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className={styles.addTradition}>
                <label htmlFor="custom-tradition" className="visually-hidden">
                  Add your own tradition
                </label>
                <input
                  id="custom-tradition"
                  className="input"
                  placeholder="Add your own, like Annaprashan"
                  maxLength={40}
                  value={customTradition}
                  onChange={(e) => setCustomTradition(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const t = customTradition.trim();
                    if (t) set("traditions", [...new Set([...form.traditions, t])].slice(0, 12));
                    setCustomTradition("");
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  onClick={() => {
                    const t = customTradition.trim();
                    if (t) set("traditions", [...new Set([...form.traditions, t])].slice(0, 12));
                    setCustomTradition("");
                  }}
                >
                  Add
                </button>
              </div>

              <div className={styles.grid}>
                <div className={`field ${styles.span2}`}>
                  <label htmlFor="brief-vibe">Vibe</label>
                  <input
                    className="input"
                    {...fieldProps("vibe")}
                    value={form.vibe}
                    maxLength={200}
                    placeholder="Marigolds and moonlight, intimate, lots of music"
                    onChange={(e) => set("vibe", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="brief-diet">Food</label>
                  <select
                    className="input"
                    {...fieldProps("diet")}
                    value={form.diet}
                    onChange={(e) => set("diet", e.target.value)}
                  >
                    {[...new Set([...DIETS, form.diet])].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="brief-language">Plan language</label>
                  <select
                    className="input"
                    {...fieldProps("language")}
                    value={form.language}
                    onChange={(e) => set("language", e.target.value as Form["language"])}
                  >
                    {Object.entries(LANGUAGES).map(([code, label]) => (
                      <option key={code} value={code} lang={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {submitError && (
                <p role="alert" className={styles.submitError}>
                  {submitError}
                </p>
              )}
              <div className={styles.actions}>
                <button type="button" className="btn btn-outline" onClick={() => goTo(0)}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate my plan
                </button>
              </div>
            </>
          )}
        </form>
      </section>

      {generating && (
        <GeneratingDialog
          stages={DRAFT_STAGES(form)}
          done={generating.done}
          onFinished={finish}
          onStop={() => {
            abort.current?.abort();
            setGenerating(null);
          }}
        />
      )}
    </main>
  );
}
