/**
 * What a hotel's reception card says, pulled out of the lines the phone read off it
 * (decision 032). Pure: the lines go in, the fields come out, and nothing here knows about a
 * camera, an engine or a screen — so every rule below is tested against real readings.
 *
 * It fills three fields and no others. The room is never on a card. The pin is never taken from
 * one (decision 024): a street on a card is not a place the traveller stood.
 *
 * Every guess is a proposal. The traveller sees it on the next screen, in a box they can
 * correct, under a line saying it was read from the card — so a field left empty is always
 * better than a field filled with the manager's name or his mobile.
 */

/** One line of text the phone read, with how tall its letters were. */
export interface CardLine {
  readonly text: string;
  readonly height: number;
}

export interface CardFields {
  readonly name?: string;
  readonly phone?: string;
  readonly address?: string;
}

/** A person on the card, not the hotel: the manager's title sits right under their name. */
const TITLE =
  /\b(manager|executive|director|officer|supervisor|sales|reservations?|front\s*office|guest\s*relations?|concierge|agent|assistant|head|chief|coordinator|receptionist|accountant|owner|partner|ceo|gm)\b/i;

/** What a hotel calls itself. */
const HOTEL_WORD =
  /\b(hotel|hotels|apartments?|apts|residence|residences|suites?|inn|resort|hostel|lodge|palace|plaza|tower|towers|grand|stay|rooms)\b/i;

/** Words that make a line an address, and the Dubai areas a card names. */
const ADDRESS_WORD =
  /\b(street|st|road|rd|building|bldg|floor|near|opp|opposite|behind|area|avenue|lane|block|plot|junction|signal|metro|station)\b/i;
const AREA =
  /\b(al\s+)?(karama|rigga|deira|bur\s+dubai|muraqqabat|naif|nahda|qusais|satwa|barsha|garhoud|mankhool|oud\s+metha|jaddaf|souk|sabkha|baniyas|port\s+saeed|hor\s+al\s+anz|international\s+city|discovery\s+gardens|jumeirah|marina|jlt|jbr|business\s+bay|downtown|tecom|al\s+quoz|mamzar|mizhar|rashidiya|warqa|silicon\s+oasis|sports\s+city|motor\s+city|dubai\s+land|dubailand|creek)\b/i;

/** The labels a card prints in front of its numbers and addresses, never part of a street. */
const CONTACT_LABEL = /^(t|tel|m|mob|mobile|f|fax|e|email|w|web|p|ph|phone|cell)[:.]?$/i;

const LEGAL_SUFFIX =
  /[\s,.-]*\b(l\.?\s?l\.?\s?c\.?|fz[- ]?llc|fze|fzco|est\.?|establishment|co\.?|br\.?|branch)\s*$/i;

const EMAIL = /[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/i;
const WEB = /\b(?:https?:\/\/)?(?:www[.\s-]+)([\w-]+(?:\.[\w-]+)+)/i;

export function cardFields(lines: readonly CardLine[]): CardFields {
  const texts = lines.map((line) => tidy(line.text)).filter((text) => text.length > 0);
  const name = hotelName(texts);
  const phone = deskPhone(texts);
  const address = streetAddress(texts, name, domains(texts));
  return {
    ...(name !== undefined && { name }),
    ...(phone !== undefined && { phone }),
    ...(address !== undefined && { address }),
  };
}

/** Collapses the spacing a reading leaves behind and drops stray marks at either end. */
function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}+(]+|[^\p{L}\p{N}).]+$/gu, '')
    .trim();
}

function letters(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, '');
}

/** The share of a line that is Latin letters — Arabic read as Latin is mostly punctuation. */
function letterShare(text: string): number {
  const all = text.replace(/\s/g, '').length;
  return all === 0 ? 0 : text.replace(/[^A-Za-z]/g, '').length / all;
}

/**
 * Real words, not the confetti a misread logo, a wood-grain table or an Arabic line becomes
 * ("f eee oe aay Ps ae es ee", "UAL crawl] G29"). Most of a line's words must be three letters
 * or more and carry a vowel, the way a name printed on a card does.
 */
function looksLikeWords(text: string): boolean {
  if (letterShare(text) < 0.85) return false;
  const words = text.split(' ');
  const real = words.filter(
    (word) => /^[A-Za-z][A-Za-z&'.-]{2,}$/.test(word) && /[aeiouy]/i.test(word),
  );
  return real.length > 0 && real.length * 2 > words.length;
}

function isContact(text: string): boolean {
  return (
    EMAIL.test(text) ||
    WEB.test(text) ||
    /\d{3}/.test(text) ||
    // A web address read without its www: "alwasmiresidence.ae".
    /[a-z0-9-]\.(com|ae|net|org|co|in|biz|info|hotel|travel)\b/i.test(text)
  );
}

/** The hotel's own name for itself, from its email or website: `alwasmiresidence`. */
function domains(lines: readonly string[]): string[] {
  const found: string[] = [];
  for (const text of lines) {
    for (const host of [EMAIL.exec(text)?.[1], WEB.exec(text)?.[1]]) {
      const label = host
        ?.toLowerCase()
        .split('.')[0]
        ?.replace(/[^a-z]/g, '');
      if (
        label !== undefined &&
        label.length >= 5 &&
        !/^(gmail|hotmail|yahoo|outlook|icloud)$/.test(label)
      ) {
        found.push(label);
      }
    }
  }
  return found;
}

function hotelName(lines: readonly string[]): string | undefined {
  const candidates = lines.filter(
    (text) =>
      looksLikeWords(text) &&
      !isContact(text) &&
      !TITLE.test(text) &&
      !/p\.?\s?o\.?\s?box/i.test(text),
  );

  // 1. The name the hotel gave its own email and website. "Saffron Crest" is in
  //    saffroncresthotel.com; the manager's name is not. On 23 September every name read
  //    correctly off a photographed card was found this way and no other.
  for (const domain of domains(lines)) {
    for (const text of candidates) {
      const matched = inDomain(text, domain);
      if (matched === undefined) continue;
      // A chain's domain is its brand, not this hotel: "ROTANA" is in rotana.com, and the card's
      // own name is the fuller line that carries the brand — "Al Bandar Rotana".
      // The part before a dash is the name: "Al Bandar Rotana - Dubai Creek".
      const own = (line: string) => line.split(/\s+[-–—|]\s+/)[0] ?? line;
      const fuller = candidates
        .map(own)
        .find(
          (other) =>
            other !== text &&
            letters(other).includes(letters(matched)) &&
            other.split(' ').length > matched.split(' ').length &&
            !ADDRESS_WORD.test(other) &&
            !AREA.test(other),
        );
      const found = fuller ?? matched;
      // "Marjan Pearl" over "HOTEL APARTMENTS": a line that is only the kind of hotel belongs to
      // the name above it — unless the domain already said so ("Saffron Crest Hotel" + "HOTEL").
      const after = lines[lines.indexOf(text) + 1]?.replace(LEGAL_SUFFIX, '');
      const kind =
        after !== undefined && KIND_ONLY.test(after) && !letters(found).endsWith(letters(after))
          ? ` ${after}`
          : '';
      return present(`${found}${kind}`);
    }
  }

  // 2. A line that says what it is — "… HOTEL APARTMENTS L.L.C" — with a name in it as well as
  //    the kind: "Residence" alone, or "Hotel Apartments", is not a hotel's name. Only when
  //    there is exactly one such line: two are a card that could be either, and an empty box
  //    serves the traveller better than a coin toss.
  const named = candidates.filter(
    (text) =>
      HOTEL_WORD.test(text) &&
      // "Near Clock Tower", "Opp. BurJuman Tower": a tower named in an address is not the hotel.
      !ADDRESS_WORD.test(text) &&
      !AREA.test(text) &&
      text
        .replace(LEGAL_SUFFIX, '')
        .split(' ')
        .some((word) => letters(word).length >= 4 && !HOTEL_WORD.test(word)),
  );
  const only = named.length === 1 ? named[0] : undefined;
  return only === undefined ? undefined : present(only);
}

/** A line that is nothing but the kind of hotel: "HOTEL APARTMENTS", "Suites". */
const KIND_ONLY = /^(hotel|hotel apartments|apartments|residence|residences|suites|inn|resort)$/i;

/** What a domain's leftover letters mean, when they are the kind of hotel it is. */
const DOMAIN_KIND: readonly (readonly [string, string])[] = [
  ['hotelapartments', 'Hotel Apartments'],
  ['hotelapts', 'Hotel Apartments'],
  ['hotelsuites', 'Hotel Suites'],
  ['apartments', 'Apartments'],
  ['apts', 'Apartments'],
  ['residence', 'Residence'],
  ['suites', 'Suites'],
  ['hotel', 'Hotel'],
  ['inn', 'Inn'],
];

/**
 * The part of a printed line that is also the hotel's domain, as the card prints it.
 *
 * - The whole line is in the domain: that is the name ("AL WASMI RESIDENCE", alwasmiresidence).
 * - The line's first words are, and the rest is only the kind of hotel: the whole line
 *   ("… TABIR HOTEL APARTMENTS L.L.C", …tabirhotelapts).
 * - The line's first words are, and the rest is something else — a street read into the same
 *   line from the next column: those first words, and the kind of hotel the domain goes on to
 *   say ("Saffron Crest" + saffroncrest·hotel → "Saffron Crest Hotel").
 */
function inDomain(text: string, domain: string): string | undefined {
  const words = text.replace(LEGAL_SUFFIX, '').split(' ');
  let taken = 0;
  for (let count = 1; count <= words.length; count += 1) {
    if (domain.includes(letters(words.slice(0, count).join(' ')))) taken = count;
    else break;
  }
  const head = words.slice(0, taken).join(' ');
  // The name begins the domain (after a "the" at most): "smi residence" is inside
  // alwasmiresidence, and a torn piece of the name is not the name. And it is more than the kind
  // of hotel — "HOTEL" is in saffroncresthotel, and is nobody's name.
  if (letters(head).length < 5 || domain.indexOf(letters(head)) > 3) return undefined;
  if (words.slice(0, taken).every((word) => HOTEL_WORD.test(word))) return undefined;
  const rest = words.slice(taken);
  if (rest.length > 0 && rest.every((word) => HOTEL_WORD.test(word))) return words.join(' ');
  if (HOTEL_WORD.test(head)) return head;
  const leftover = domain.slice(domain.indexOf(letters(head)) + letters(head).length);
  const kind = DOMAIN_KIND.find(([spelled]) => leftover.startsWith(spelled));
  return kind === undefined ? head : `${head} ${kind[1]}`;
}

/**
 * Without the company's legal form, and in the case a person would write it: a word printed in
 * capitals is written with one ("MARJAN PEARL HOTEL APARTMENTS" → "Marjan Pearl Hotel Apartments").
 */
function present(name: string): string | undefined {
  const bare = name.replace(LEGAL_SUFFIX, '').replace(LEGAL_SUFFIX, '').trim();
  if (letters(bare).length < 4) return undefined;
  return bare
    .split(' ')
    .map((word) =>
      word.length > 1 && word === word.toUpperCase()
        ? `${word.charAt(0)}${word.slice(1).toLowerCase()}`
        : word,
    )
    .join(' ');
}

/**
 * The reception's number, and only the reception's. A card prints three — the desk, the
 * manager's mobile, the fax — and the one a traveller rings from a taxi at midnight is the desk:
 * a Dubai landline, +971 4. A mobile is the manager, who is off duty; a fax answers nobody; and
 * a number from another emirate is a misread 4. None of them is filled — an empty box the
 * traveller types into is better than a number that rings the wrong phone.
 */
function deskPhone(lines: readonly string[]): string | undefined {
  const NUMBER = /(\+|00)?\s?\(?\d[\d\s().-]{5,}\d/g;
  const desks: { e164: string; labelled: boolean }[] = [];
  for (const text of lines) {
    let since = 0;
    for (const match of text.matchAll(NUMBER)) {
      // The label is whatever was printed since the last number on the line — "Fax No.:",
      // "Telephone:", "T" — not a fixed few characters, which "Facsimile:" outgrows.
      const label = text.slice(Math.max(since, match.index - 24), match.index);
      since = match.index + match[0].length;
      if (/\b(fax|facsimile|f)\b[\s\w.]*:?\s*$/i.test(label)) continue;
      const labelled =
        /\b(t|tel|ph|phone|p|telephone|landline|reception)\b\.?\s*(no\.?|number)?\s*:?\s*$/i.test(
          label,
        );
      const e164 = dubaiLandline(match[0].replace(/\D/g, ''), labelled);
      if (e164 === undefined) continue;
      desks.push({ e164, labelled });
    }
  }
  const choice = desks.find((desk) => desk.labelled) ?? desks[0];
  if (choice === undefined) return undefined;
  const rest = choice.e164.slice(4);
  return `+971 4 ${rest.slice(0, 3)} ${rest.slice(3)}`;
}

/**
 * A number as Dubai dials it, if it is a Dubai landline: `97142586682`. A P.O. Box, a licence
 * number and a building number are digits too, and none of them has this shape once a code is
 * required of it.
 */
function dubaiLandline(digits: string, labelled: boolean): string | undefined {
  let local: string | undefined;
  if (digits.startsWith('00971')) local = digits.slice(5);
  else if (digits.startsWith('971')) local = digits.slice(3);
  else if (digits.startsWith('0')) local = digits.slice(1);
  // Printed without its code, the way a Dubai card often does — but only beside a telephone's
  // label: seven bare digits are as often a plot or a licence. And 800 is toll-free, not Dubai.
  else if (labelled && digits.length === 7 && !digits.startsWith('800')) local = `4${digits}`;
  return local !== undefined && /^4\d{7}$/.test(local) ? `971${local}` : undefined;
}

/**
 * The street and the area, which is what a driver asks for. The P.O. Box goes — no taxi has
 * ever driven to one — and so do the country, the phone numbers and their labels that share a
 * line with it when two columns are read as one.
 */
function streetAddress(
  lines: readonly string[],
  name: string | undefined,
  hotelDomains: readonly string[],
): string | undefined {
  const parts: string[] = [];
  for (const raw of lines) {
    if (EMAIL.test(raw) || WEB.test(raw) || TITLE.test(raw)) continue;
    if (!ADDRESS_WORD.test(raw) && !AREA.test(raw) && !/p\.?\s?o\.?\s?box/i.test(raw)) continue;
    // "RIGGA PALM" names an area and is the hotel, not its street.
    if (name !== undefined && letters(name).includes(letters(raw))) continue;
    let text = raw
      .replace(/p\.?\s?o\.?\s?box[\s.:#-]*\d*/gi, ' ')
      .replace(/\b(united\s+arab\s+emirates|u\.?a\.?e\.?)(?![a-z])/gi, ' ')
      .replace(/(\+|00)?\s?\(?\d[\d\s().-]{6,}\d/g, ' ');
    // Two columns read as one line: "Saffron Crest Khalid Bin Al Waleed Road" is the name and
    // the street side by side. The name is already in its own box.
    if (name !== undefined) {
      const words = text.trim().split(/\s+/);
      const own = name.toLowerCase().split(' ');
      let taken = 0;
      while (taken < words.length && own.includes((words[taken] ?? '').toLowerCase())) taken += 1;
      // "Al Rigga Hotel" on "Al Rigga Road": the words before "Road" are the street's name, and
      // stay. Only a name that runs into something else is the hotel's, read across columns.
      if (taken > 0 && !ADDRESS_WORD.test(words[taken] ?? '')) text = words.slice(taken).join(' ');
    }
    for (const piece of text.split(/\s*[,|•·–—:]\s*|\s+-\s+|\s-$/)) {
      const words = piece
        .trim()
        .split(/\s+/)
        .filter((word, index) => keepsInAddress(word, index));
      // The torn end of the hotel's name, read into the street's line from the next column
      // ("ffron rest Khalid Bin Al Waleed Road"): words of the domain, before the street begins.
      while (
        words.length > 1 &&
        letters(words[0] ?? '').length >= 4 &&
        !ADDRESS_WORD.test(words[0] ?? '') &&
        !AREA.test(words[0] ?? '') &&
        hotelDomains.some((domain) => domain.includes(letters(words[0] ?? '')))
      ) {
        words.shift();
      }
      const part = words.join(' ').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '');
      // A piece of an address names a street or an area; anything else on the line is the
      // manager's name or the grain of the table, read into it.
      if (!ADDRESS_WORD.test(part) && !AREA.test(part)) continue;
      if (!parts.some((seen) => seen.toLowerCase() === part.toLowerCase())) parts.push(part);
    }
  }
  // "Dubai" on its own after the P.O. Box is noise when the street already says Bur Dubai; added
  // once at the end otherwise, because a card that says only "Street 14A, Al Karama" is in Dubai.
  const streets = parts.filter((part) => !/^dubai$/i.test(part));
  if (streets.length === 0) return undefined;
  const joined = streets.join(', ');
  return /\bdubai\b/i.test(joined) ? joined : `${joined}, Dubai`;
}

/**
 * The words an address is made of — "Street 14A", "Al Rigga Road", "Building 18" — and not the
 * labels of the numbers beside it, nor the one- and two-letter fragments a photograph's noise
 * reads as text.
 */
function keepsInAddress(word: string, index: number): boolean {
  if (word === '' || CONTACT_LABEL.test(word)) return false;
  // A number with its letter is a street or a building; a lone digit opening the piece is noise.
  if (/^\d+[A-Za-z]?$/.test(word)) return !(index === 0 && word.length === 1);
  if (/^(al|st|rd|bin|no|el|bur|opp)\.?$/i.test(word)) return true;
  // "2nd Street", "14th Road".
  if (/^\d+(st|nd|rd|th)$/i.test(word)) return true;
  const plain = word.replace(/[.,]$/, '');
  // "Al-Rigga", "Za'abeel", and a letter the reader took for a digit ("Rigg2").
  return (
    /^[A-Za-z][A-Za-z'’-]*[A-Za-z]\d?[A-Za-z]*$/.test(plain) &&
    plain.length >= 3 &&
    /[aeiouy]/i.test(plain)
  );
}
