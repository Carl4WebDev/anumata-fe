import type { LocalizedLine } from "./rapportUtils";

/**
 * Live crisis detection: words in the patient's answers that may mean thoughts
 * of suicide or self-harm, in English, Tagalog and Bisaya.
 *
 * Simple phrase matching, on purpose: instant, no AI call, and it errs on the
 * side of showing help ("I would never kill myself" also matches) — the help
 * card is gentle and the therapist decides what it means.
 */

const CRISIS_PHRASES = [
  // English
  "kill myself", "killing myself", "end my life", "ending my life", "take my own life", "take my life",
  "suicide", "suicidal", "want to die", "wanna die", "wish i was dead", "wish i were dead", "better off dead",
  "dont want to live", "dont want to be alive", "no reason to live", "nothing to live for", "not worth living",
  "hurt myself", "hurting myself", "harm myself", "harming myself", "cut myself", "cutting myself", "end it all",
  // Tagalog
  "magpakamatay", "nagpapakamatay", "pagpapakamatay", "magpatiwakal", "patayin ang sarili",
  "patayin ko ang sarili ko", "papatayin ko ang sarili ko", "gusto ko nang mamatay", "gusto ko ng mamatay",
  "gusto ko na mamatay", "gusto ko nalang mamatay", "gusto ko na lang mamatay", "sana mamatay na ako",
  "sana mamatay na lang ako", "ayoko nang mabuhay", "ayoko ng mabuhay", "ayaw ko nang mabuhay",
  "ayaw ko ng mabuhay", "saktan ang sarili", "saktan ko ang sarili ko", "sasaktan ko ang sarili ko",
  "sinasaktan ko ang sarili ko", "wakasan ang buhay ko", "tapusin ang buhay ko", "wala nang saysay ang buhay",
  // Bisaya
  "maghikog", "naghikog", "paghikog", "mag hikog", "patyon nako akong kaugalingon", "patyon ko akong kaugalingon",
  "gusto na ko mamatay", "gusto nako mamatay", "gusto na lang ko mamatay", "ayaw na ko mabuhi",
  "dili na ko gusto mabuhi", "samaran akong kaugalingon", "samaran nako akong kaugalingon",
  "tapuson nako akong kinabuhi", "tapuson akong kinabuhi",
  // More English
  "kill my self", "unalive myself", "wish i could die", "dont want to wake up", "hang myself", "overdose",
  "slit my wrist", "slit my wrists", "want to disappear forever",
];

/**
 * Word patterns, for the many ways Tagalog and Bisaya can say the same thing
 * (verb forms, word order, "sarili" / "kaugalingon"). Run on normalized text.
 */
const CRISIS_PATTERNS: RegExp[] = [
  // Any form of hikog (Bisaya), pakamatay / patiwakal (Tagalog): maghikog, mohikog, nagpakamatay…
  /\b\w*hikog\b/,
  /\b\w*pakamatay\b/,
  /\b\w*patiwakal\b/,
  // Kill or hurt + oneself: "gusto na nako patayon akong sarili", "papatayin ko na lang ang sarili ko"
  /\b(patyon|patayon|pamatyon|mopatay|magpatay|samaran|samadon|pasakitan|patayin|papatayin|pinapatay|saktan|sasaktan|sinasaktan|sugatan)\b(\s+\w+){0,4}\s+(kaugalingon|sarili)\b/,
  // End one's life: "tapuson na nako akong kinabuhi", "tatapusin ko na ang buhay ko"
  /\b(tapuson|tapusin|tatapusin|wakasan|wawakasan)\b(\s+\w+){0,4}\s+(kinabuhi|buhay)\b/,
  // Want to die: "gusto na nako mamatay", "gusto ko na lang mamatay", "gustong-gusto ko nang mamatay"
  /\b(gusto|gustong|nais|ganahan)\b(\s+\w+){0,4}\s+(mamatay|mangamatay)\b/,
  // Don't want to live: "ayaw na nako mabuhi", "dili na ko gusto mabuhi", "ayoko na talagang mabuhay"
  // (said about oneself, so "dili na mabuhi ang tanom" doesn't count)
  /\b(ayaw|dili|di)\s+na\s+(ko|kong|ako|nako|nakong)\b(\s+\w+){0,2}\s+(mabuhi|mabuhay)\b/,
  /\b(ayoko|ayaw ko|ayaw nako)\b(\s+\w+){0,3}\s+(mabuhi|mabuhay)\b/,
  // Better off dead: "mas maayo pa nga mamatay ko", "mas mabuti pang mamatay na lang ako"
  /\b(maayo|mabuti|mainam)\s+pa(ng)?\b(\s+\w+){0,3}\s+(mamatay|mapatay)\b/,
  // "mamatay na lang ko", "unta mamatay na ko"
  /\bmamatay\s+na\s+(lang|lng|lamang)\s+(ko|ako)\b/,
  /\bunta\s+mamatay\s+na\b/,
];

/** Lowercase, no punctuation or apostrophes, hyphens as spaces ("Don't" → "dont"). */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Does this text contain a phrase that may mean suicidal thoughts or self-harm? */
export function detectCrisis(text: string): boolean {
  const normalized = normalize(text);
  const padded = ` ${normalized} `;
  return CRISIS_PHRASES.some((phrase) => padded.includes(` ${phrase} `)) || CRISIS_PATTERNS.some((p) => p.test(normalized));
}

/** The help card's wording, in the patient's language. */
export const CRISIS_TEXT: Record<"title" | "body" | "notified" | "emergency" | "carryOn", LocalizedLine> = {
  title: {
    en: "You're not alone",
    tl: "Hindi ka nag-iisa",
    ceb: "Dili ka nag-inusara",
  },
  body: {
    en: "If you're thinking about hurting yourself, please talk to someone right now. These lines are open 24/7:",
    tl: "Kung naiisip mong saktan ang sarili mo, makipag-usap ka sa isang tao ngayon din. Bukas 24/7 ang mga linyang ito:",
    ceb: "Kung naghunahuna ka nga samaran ang imong kaugalingon, palihug pakig-istorya og usa ka tawo karon dayon. Abli 24/7 kini nga mga linya:",
  },
  notified: {
    en: "Your therapist has also been told, so they can check on you.",
    tl: "Nasabihan na rin ang iyong therapist para makumusta ka nila.",
    ceb: "Gisultihan na usab ang imong therapist aron makakumusta sila nimo.",
  },
  emergency: {
    en: "In immediate danger? Call 911.",
    tl: "Nasa panganib ngayon? Tumawag sa 911.",
    ceb: "Anaa sa peligro karon? Tawag sa 911.",
  },
  carryOn: {
    en: "You can keep going with the interview, take a break, or stop at any time.",
    tl: "Puwede mong ituloy ang interview, magpahinga, o huminto anumang oras.",
    ceb: "Mahimo nimong ipadayon ang interview, mopahulay, o mohunong bisan unsang orasa.",
  },
};

export interface CrisisHotline {
  name: string;
  numbers: { label: string; tel: string }[];
}

/** Philippine crisis lines (the same ones the results page lists, plus NCMH). */
export const CRISIS_HOTLINES: CrisisHotline[] = [
  {
    name: "NCMH Crisis Hotline",
    numbers: [
      { label: "1553", tel: "1553" },
      { label: "0917-899-8727", tel: "09178998727" },
      { label: "0966-351-4518", tel: "09663514518" },
    ],
  },
  { name: "Hopeline PH", numbers: [{ label: "0917-558-4673", tel: "09175584673" }] },
  { name: "In Touch Crisis Line", numbers: [{ label: "0917-800-1123", tel: "09178001123" }] },
  { name: "Tawag Paglaum – Centro Bisaya", numbers: [{ label: "0939-936-5233", tel: "09399365233" }] },
];
