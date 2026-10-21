import { z } from "zod";

// Never compile validators with eval: the strict CSP forbids it, and even zod's guarded probe
// is reported as a policy violation in the browser.
z.config({ jitless: true });

export const EVENT_TYPES = ["wedding", "birthday", "community", "festival"] as const;
export const CURRENCIES = ["INR", "USD", "GBP", "EUR", "AED"] as const;
export const LANGUAGE_CODES = ["en", "hi", "bn", "mr", "te", "ta", "gu", "kn", "ml", "pa"] as const;
/** Each plan language, named in its own script. */
export const LANGUAGES: Record<(typeof LANGUAGE_CODES)[number], string> = {
  en: "English",
  hi: "हिन्दी",
  bn: "বাংলা",
  mr: "मराठी",
  te: "తెలుగు",
  ta: "தமிழ்",
  gu: "ગુજરાતી",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  pa: "ਪੰਜਾਬੀ",
};
export const VENDOR_STATUSES = ["todo", "contacted", "booked"] as const;
export const IDEA_KINDS = ["theme", "decor", "menu", "activity", "gift"] as const;

/** Any plain object, for picking fields out of untrusted JSON without a cast. */
export const LooseObject = z.record(z.string(), z.unknown());

const text = (max: number) => z.string().trim().min(1).max(max);
const isoDate = z.iso.date();

export const BriefSchema = z.object({
  type: z.enum(EVENT_TYPES),
  name: text(80),
  date: isoDate,
  city: text(60),
  guests: z.int().min(1).max(5000),
  budget: z.int().min(1).max(10_000_000_000),
  currency: z.enum(CURRENCIES),
  vibe: z.string().trim().max(200),
  traditions: z.array(text(40)).max(12),
  diet: z.string().trim().max(60),
  language: z.enum(LANGUAGE_CODES),
});
export type Brief = z.infer<typeof BriefSchema>;

export const BudgetLineSchema = z.object({
  id: text(60),
  category: text(60),
  allocated: z.int().min(0),
  spent: z.int().min(0),
});
export type BudgetLine = z.infer<typeof BudgetLineSchema>;

export const MilestoneSchema = z.object({
  id: text(60),
  title: text(120),
  due: isoDate,
  done: z.boolean(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const RunSheetItemSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  title: text(120),
});
export type RunSheetItem = z.infer<typeof RunSheetItemSchema>;

export const VendorSchema = z.object({
  id: text(60),
  category: text(60),
  status: z.enum(VENDOR_STATUSES),
  quote: z.int().min(0).nullable(),
  questions: z.array(text(200)).max(8),
});
export type Vendor = z.infer<typeof VendorSchema>;

export const IdeaSchema = z.object({
  id: text(60),
  kind: z.enum(IDEA_KINDS),
  title: text(80),
  description: text(400),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const PlanSchema = z.object({
  id: text(60),
  brief: BriefSchema,
  budget: z.array(BudgetLineSchema).min(1).max(20),
  milestones: z.array(MilestoneSchema).max(60),
  runSheet: z.array(RunSheetItemSchema).max(30),
  vendors: z.array(VendorSchema).max(20),
  ideas: z.array(IdeaSchema).max(30),
  updatedAt: z.iso.datetime(),
});
export type Plan = z.infer<typeof PlanSchema>;

/** What Gemini returns: relative, unvalidated intent. Code turns it into a Plan (see plan.ts). */
export const DRAFT_ITEMS = {
  budget: z.object({ category: text(60), percent: z.number().min(0).max(100) }),
  milestones: z.object({ title: text(120), daysBefore: z.number().min(-30).max(730) }),
  runSheet: z.object({ time: z.string().max(10), title: text(120) }),
  vendors: z.object({ category: text(60), questions: z.array(text(200)).max(6) }),
  ideas: z.object({ kind: z.enum(IDEA_KINDS), title: text(80), description: text(400) }),
};
export const DRAFT_LIMITS = { budget: 15, milestones: 40, runSheet: 20, vendors: 15, ideas: 15 };

export const PlanDraftSchema = z.object({
  budget: z.array(DRAFT_ITEMS.budget).min(1).max(DRAFT_LIMITS.budget),
  milestones: z.array(DRAFT_ITEMS.milestones).max(DRAFT_LIMITS.milestones),
  runSheet: z.array(DRAFT_ITEMS.runSheet).max(DRAFT_LIMITS.runSheet),
  vendors: z.array(DRAFT_ITEMS.vendors).max(DRAFT_LIMITS.vendors),
  ideas: z.array(DRAFT_ITEMS.ideas).max(DRAFT_LIMITS.ideas),
});
export type PlanDraft = z.infer<typeof PlanDraftSchema>;

const id = text(60);
const amount = z.int().min(1).max(10_000_000_000);

/** Every edit to a plan, whether from the UI or the co-planner's function calls. */
export const PlanChangeSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("moveBudget"), from: id, to: id, amount }),
  z.object({ op: z.literal("logSpend"), id, amount }),
  z.object({ op: z.literal("addMilestone"), title: text(120), due: isoDate }),
  z.object({ op: z.literal("toggleMilestone"), id }),
  z.object({
    op: z.literal("addVendor"),
    category: text(60),
    questions: z.array(text(200)).max(6),
  }),
  z.object({
    op: z.literal("setVendorStatus"),
    id,
    status: z.enum(VENDOR_STATUSES),
    quote: z.int().min(0).nullable().optional(),
  }),
  z.object({
    op: z.literal("addIdea"),
    kind: z.enum(IDEA_KINDS),
    title: text(80),
    description: text(400),
  }),
]);
export type PlanChange = z.infer<typeof PlanChangeSchema>;

/** Each plan change keyed by its `op`, for exhaustive per-operation tables. */
export type PlanChangeMap = { [C in PlanChange as C["op"]]: C };
export type PlanChangeOp = keyof PlanChangeMap;
