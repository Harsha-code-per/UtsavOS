import type { Brief, EVENT_TYPES, PlanDraft } from "./schema";

type EventType = (typeof EVENT_TYPES)[number];

/**
 * Hand-written starting plans per event type. Used when Gemini is unavailable (or mocked in
 * tests) so the planner always returns something useful instead of an error.
 */
const TEMPLATES: Record<EventType, PlanDraft> = {
  wedding: {
    budget: [
      { category: "Venue", percent: 28 },
      { category: "Catering", percent: 30 },
      { category: "Decor", percent: 12 },
      { category: "Photography", percent: 8 },
      { category: "Attire & jewellery", percent: 10 },
      { category: "Entertainment", percent: 5 },
      { category: "Invitations", percent: 2 },
      { category: "Contingency", percent: 5 },
    ],
    milestones: [
      { title: "Shortlist and book the venue", daysBefore: 180 },
      { title: "Book photographer", daysBefore: 150 },
      { title: "Caterer tasting and booking", daysBefore: 120 },
      { title: "Finalise decor concept", daysBefore: 90 },
      { title: "Send invitations", daysBefore: 60 },
      { title: "Final headcount to caterer", daysBefore: 14 },
      { title: "Share run sheet with family and vendors", daysBefore: 3 },
    ],
    runSheet: [
      { time: "16:00", title: "Baraat assembles" },
      { time: "17:30", title: "Varmala" },
      { time: "18:30", title: "Pheras" },
      { time: "20:30", title: "Reception dinner" },
      { time: "23:00", title: "Vidaai" },
    ],
    vendors: [
      { category: "Venue", questions: ["Is power backup included?", "What time must music stop?"] },
      {
        category: "Catering",
        questions: [
          "Is the per-plate price fixed if headcount shifts?",
          "Are live counters staffed separately?",
        ],
      },
      {
        category: "Decor",
        questions: [
          "Does the quote include setup and teardown?",
          "Can ceremony decor be reused for the reception?",
        ],
      },
      {
        category: "Photography",
        questions: [
          "When will we receive the edited album?",
          "Is drone coverage allowed at the venue?",
        ],
      },
    ],
    ideas: [
      {
        kind: "theme",
        title: "Marigold & Moonlight",
        description:
          "Genda-phool torans, floating diyas in brass urlis and a starlit mandap canopy.",
      },
      {
        kind: "gift",
        title: "Seed paper thank-you cards",
        description: "Cards embedded with tulsi seeds that guests can plant at home.",
      },
    ],
  },
  birthday: {
    budget: [
      { category: "Venue", percent: 25 },
      { category: "Food & cake", percent: 35 },
      { category: "Decor", percent: 15 },
      { category: "Entertainment", percent: 12 },
      { category: "Return gifts", percent: 8 },
      { category: "Contingency", percent: 5 },
    ],
    milestones: [
      { title: "Book the venue", daysBefore: 45 },
      { title: "Send invitations", daysBefore: 30 },
      { title: "Order the cake", daysBefore: 14 },
      { title: "Buy return gifts", daysBefore: 10 },
      { title: "Confirm RSVPs and food count", daysBefore: 5 },
    ],
    runSheet: [
      { time: "16:00", title: "Guests arrive, welcome drinks" },
      { time: "16:30", title: "Games and activities" },
      { time: "17:30", title: "Cake cutting" },
      { time: "18:00", title: "Dinner" },
      { time: "19:00", title: "Return gifts and goodbyes" },
    ],
    vendors: [
      {
        category: "Cake",
        questions: ["Can you do an eggless version?", "When is the last day to change the design?"],
      },
      {
        category: "Decor",
        questions: ["How long does setup take?", "Are balloons and props reusable or bought?"],
      },
      {
        category: "Entertainer",
        questions: ["What age group is the act designed for?", "How long is the show?"],
      },
    ],
    ideas: [
      {
        kind: "theme",
        title: "Jungle safari",
        description: "Leafy backdrops, animal masks at the door and a treasure-hunt trail.",
      },
      {
        kind: "activity",
        title: "Memory wall",
        description: "Guests pin a photo and a wish for the year ahead.",
      },
    ],
  },
  community: {
    budget: [
      { category: "Venue & permits", percent: 20 },
      { category: "Food", percent: 30 },
      { category: "Sound & lighting", percent: 15 },
      { category: "Decor", percent: 15 },
      { category: "Volunteers & logistics", percent: 10 },
      { category: "Contingency", percent: 10 },
    ],
    milestones: [
      { title: "Apply for local permits", daysBefore: 60 },
      { title: "Form the volunteer committee", daysBefore: 45 },
      { title: "Book sound and lighting", daysBefore: 30 },
      { title: "Publicise the event", daysBefore: 21 },
      { title: "Publish volunteer rota", daysBefore: 7 },
    ],
    runSheet: [
      { time: "09:00", title: "Setup and safety check" },
      { time: "11:00", title: "Opening ceremony" },
      { time: "13:00", title: "Community meal" },
      { time: "18:00", title: "Cultural programme" },
      { time: "21:00", title: "Close and clean-up" },
    ],
    vendors: [
      {
        category: "Sound & lighting",
        questions: ["Is a technician on site all day?", "What is the generator backup?"],
      },
      {
        category: "Catering",
        questions: ["Can you serve 500+ people in under an hour?", "How is waste handled?"],
      },
      {
        category: "Tent & pandal",
        questions: ["Is the structure certified for wind and rain?", "Who handles teardown?"],
      },
    ],
    ideas: [
      {
        kind: "activity",
        title: "Neighbourhood talent hour",
        description: "Open stage slots for residents of every age, signed up in advance.",
      },
      {
        kind: "decor",
        title: "Zero-waste pandal",
        description: "Bamboo, cloth and flowers only; compost bins at every food counter.",
      },
    ],
  },
  festival: {
    budget: [
      { category: "Food & sweets", percent: 35 },
      { category: "Decor & lighting", percent: 25 },
      { category: "Gifts", percent: 20 },
      { category: "Puja & rituals", percent: 10 },
      { category: "Contingency", percent: 10 },
    ],
    milestones: [
      { title: "Deep-clean and plan decor", daysBefore: 21 },
      { title: "Order sweets and gift hampers", daysBefore: 14 },
      { title: "Buy puja samagri", daysBefore: 7 },
      { title: "Invite family and friends", daysBefore: 7 },
      { title: "Set up lights and rangoli", daysBefore: 1 },
    ],
    runSheet: [
      { time: "18:00", title: "Rangoli and diyas" },
      { time: "19:00", title: "Puja" },
      { time: "20:00", title: "Dinner with family" },
      { time: "21:30", title: "Sweets and gifting" },
    ],
    vendors: [
      {
        category: "Sweets",
        questions: ["Are sweets made with pure ghee?", "What is the shelf life?"],
      },
      {
        category: "Lighting",
        questions: ["Are the lights LED and outdoor-rated?", "Is installation included?"],
      },
      {
        category: "Florist",
        questions: [
          "Can you deliver on the morning of the festival?",
          "Are the flowers locally grown?",
        ],
      },
    ],
    ideas: [
      {
        kind: "decor",
        title: "Diya pathway",
        description: "Clay diyas lining the entrance, with a rangoli designed by the kids.",
      },
      {
        kind: "gift",
        title: "Local artisan hampers",
        description: "Handmade candles and dry fruits from neighbourhood makers.",
      },
    ],
  },
};

export function fallbackDraft(brief: Brief): PlanDraft {
  const base = TEMPLATES[brief.type];
  return {
    ...base,
    milestones: [
      ...base.milestones,
      ...brief.traditions.map((t) => ({ title: `Plan the ${t}`, daysBefore: 30 })),
    ],
  };
}

/** Moments people commonly plan for, offered as chips in the brief. Free text is allowed too. */
export const TRADITIONS: Record<EventType, string[]> = {
  wedding: [
    "Roka",
    "Haldi",
    "Mehendi",
    "Sangeet",
    "Baraat",
    "Pheras",
    "Nikah",
    "Reception",
    "Vidaai",
  ],
  birthday: [
    "Cake cutting",
    "First-year puja",
    "Kids' games",
    "Magic show",
    "Photo booth",
    "Return gifts",
  ],
  community: [
    "Pandal setup",
    "Aarti schedule",
    "Cultural night",
    "Community meal",
    "Volunteer rota",
    "Permits",
  ],
  festival: [
    "Lakshmi puja",
    "Rangoli",
    "Diyas and lighting",
    "Sweets and gifting",
    "Eid feast",
    "Onam sadhya",
  ],
};
