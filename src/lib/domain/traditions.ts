import type { EVENT_TYPES } from "./schema";

type EventType = (typeof EVENT_TYPES)[number];

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
