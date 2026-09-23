import { useCallback, useSyncExternalStore } from 'react';

/**
 * The collectors' app in the two languages the collectors read. There are two of them and one
 * asked for Hindi, so this is a catalogue and a toggle, not a framework: every key in both, a
 * test that says so, and the choice remembered on the phone. Dish names, areas and the name on
 * the board stay as they are written, in whichever script the board uses.
 */

export type Lang = 'hi' | 'en';

const en = {
  appSub: 'Outlets',
  start: 'Start',
  whoTitle: 'Saathi · Outlets',
  whoHint: 'Every outlet you save is recorded against your name.',
  yourName: 'Your name',
  waiting: '{n} waiting to upload',
  allUploaded: 'all uploaded',
  savedOnServer: 'Form {serial} is on the server, {n} menu page(s). Next one.',
  saveSending: 'Sending… {done} of {total} pages on the server',
  saveNotSent: 'Not on the server yet ({why}). It is kept here: press Save again.',
  needed: 'needed',
  where: 'Where it is',
  pickPin: 'Which form is this?',
  pinsWaiting: '{n} forms waiting',
  noPins: 'No forms waiting. This one is being captured here and now.',
  fromPin: 'Form {serial} · {when}',
  pinPlace: 'Pinned here on {when}. The place comes from the pin, never from this desk.',
  changePin: 'Change',
  nameOnBoard: 'Name on the board',
  asWritten: 'As written outside',
  inHindi: 'In Hindi (optional)',
  whichArea: 'Which area',
  somewhereElse: 'Somewhere else — write it',
  areaHint: 'It is the word on the traveller\'s row: "करामा · 650 m".',
  fillItNow: 'Fill this one in now',
  modeForm: 'Fill a form',
  modePin: 'Pin',
  kitchenKind: 'Kind of kitchen',
  pureVeg: 'Pure veg',
  mixed: 'Veg + non-veg',
  nonVeg: 'Non-veg',
  askThem: 'Ask them — do they do these?',
  jain: 'Jain',
  vrat: 'Vrat / fasting',
  sattvik: 'Sattvik',
  noOnionGarlic: 'No onion / garlic',
  eggless: 'Eggless',
  yes: 'yes',
  onRequest: 'on request',
  no: 'no',
  askPerson: 'Ask a person. Do not read it off a sign.',
  dishesNamed: 'Dishes they named',
  dishExample: 'e.g. Jain sambar',
  add: 'Add',
  dishHint:
    "A dish they will actually make is worth more than a tick box. The price is what the traveller's menu shows next to it.",
  hours: 'Hours',
  open24: 'Open 24 hours',
  to: 'to',
  hoursHint: 'A 3am close is fine — put 03:00. Late places are the ones nobody else has.',
  phoneDelivery: 'Phone and delivery',
  phoneOnBoard: 'Phone on the board',
  phoneHint: "The traveller's card has a call button; this is the number behind it.",
  theRest: 'The rest',
  priceForOne: 'Price for one (AED)',
  spokeTo: 'Who you spoke to — Suresh, manager',
  menuHint: 'Hold the menu straight and fill the frame — it reads far better.',
  menuPhotos: 'Menu photos',
  menuCount: '{n} menu photo(s) · {size}',
  menuPdfOpening: 'Opening the PDF, page by page…',
  saveOpening: 'Wait — the menu is still opening',
  menuPdfFailed: 'This PDF would not open ({why}). Photograph the pages instead.',
  readingMenu: 'Reading the menu…',
  readMenu: 'Read the menu',
  couldNotRead: 'Could not read it. Type the dishes above instead.',
  tapServed:
    'Tap the ones they actually serve. Do it here, with the board in front of you — nobody can check this later.',
  notes: 'Anything a friend would mention',
  save: 'Save this outlet',
  saveFirst: 'Pick the form number first (top)',
  theMenu: 'The menu',
  moreOptional: 'More, if you know it (optional — read off the menu later)',
  savesFirst: 'It saves on the phone first. Uploading can wait for signal.',
} as const;

export type Key = keyof typeof en;

const hi: Record<Key, string> = {
  appSub: 'आउटलेट',
  start: 'शुरू करें',
  whoTitle: 'साथी · आउटलेट',
  whoHint: 'आप जो भी आउटलेट सेव करेंगे, वह आपके नाम से दर्ज होगा।',
  yourName: 'आपका नाम',
  waiting: '{n} अपलोड बाक़ी',
  allUploaded: 'सब अपलोड हो गया',
  savedOnServer: 'फ़ॉर्म {serial} सर्वर पर है, मेन्यू के {n} पन्ने। अगला।',
  saveSending: 'भेज रहे हैं… {total} में से {done} पन्ने सर्वर पर',
  saveNotSent: 'अभी सर्वर पर नहीं है ({why})। यहीं रखा है: फिर से सेव दबाइए।',
  needed: 'ज़रूरी',
  where: 'यह कहाँ है',
  pickPin: 'कौन-सा फ़ॉर्म है?',
  pinsWaiting: '{n} फ़ॉर्म बाक़ी',
  noPins: 'कोई फ़ॉर्म बाक़ी नहीं. यह यहीं से दर्ज हो रहा है.',
  fromPin: 'फ़ॉर्म {serial} · {when}',
  pinPlace: '{when} को यहाँ पिन किया गया। जगह पिन से आती है, इस डेस्क से कभी नहीं।',
  changePin: 'बदलें',
  nameOnBoard: 'बोर्ड पर नाम',
  asWritten: 'जैसा बाहर लिखा है',
  inHindi: 'हिंदी में (वैकल्पिक)',
  whichArea: 'कौन-सा इलाक़ा',
  somewhereElse: 'कहीं और — लिखिए',
  areaHint: 'यही शब्द यात्री की लाइन में दिखता है: "करामा · 650 मी"।',
  fillItNow: 'यही अभी भरें',
  modeForm: 'फ़ॉर्म भरें',
  modePin: 'पिन',
  kitchenKind: 'रसोई किस तरह की',
  pureVeg: 'शुद्ध शाकाहारी',
  mixed: 'वेज + नॉन-वेज',
  nonVeg: 'नॉन-वेज',
  askThem: 'पूछिए — क्या ये बनाते हैं?',
  jain: 'जैन',
  vrat: 'व्रत / उपवास',
  sattvik: 'सात्विक',
  noOnionGarlic: 'बिना प्याज़-लहसुन',
  eggless: 'बिना अंडे',
  yes: 'हाँ',
  onRequest: 'कहने पर',
  no: 'नहीं',
  askPerson: 'किसी व्यक्ति से पूछिए। बोर्ड से पढ़कर मत लिखिए।',
  dishesNamed: 'जो व्यंजन उन्होंने बताए',
  dishExample: 'जैसे जैन सांभर',
  add: 'जोड़ें',
  dishHint:
    'जो व्यंजन वे सचमुच बनाते हैं, वह किसी टिक से ज़्यादा काम का है। दाम वही है जो यात्री के मेन्यू में उसके साथ दिखेगा।',
  hours: 'समय',
  open24: '24 घंटे खुला',
  to: 'से',
  hoursHint: 'रात 3 बजे बंद हो तो 03:00 लिखिए। देर तक खुली जगहें ही किसी और के पास नहीं हैं।',
  phoneDelivery: 'फ़ोन और डिलीवरी',
  phoneOnBoard: 'बोर्ड पर लिखा फ़ोन',
  phoneHint: 'यात्री के कार्ड पर कॉल का बटन है; यही नंबर उसके पीछे है।',
  theRest: 'बाक़ी बातें',
  priceForOne: 'एक व्यक्ति का दाम (AED)',
  spokeTo: 'किससे बात हुई — सुरेश, मैनेजर',
  menuHint: 'मेन्यू सीधा पकड़िए और पूरा फ़्रेम भरिए — तब बहुत बेहतर पढ़ा जाता है।',
  menuPhotos: 'मेन्यू की फ़ोटो',
  menuCount: '{n} मेन्यू फ़ोटो · {size}',
  menuPdfOpening: 'PDF खुल रहा है, एक-एक पन्ना…',
  saveOpening: 'रुकिए — मेन्यू अभी खुल रहा है',
  menuPdfFailed: 'यह PDF नहीं खुला ({why})। पन्नों की फ़ोटो ले लीजिए।',
  readingMenu: 'मेन्यू पढ़ रहे हैं…',
  readMenu: 'मेन्यू पढ़ें',
  couldNotRead: 'पढ़ नहीं पाए। ऊपर व्यंजन टाइप कर दीजिए।',
  tapServed:
    'जो सचमुच परोसते हैं उन पर टैप कीजिए। यहीं, बोर्ड सामने रखकर — बाद में कोई जाँच नहीं सकता।',
  notes: 'जो कोई दोस्त बताता',
  save: 'यह आउटलेट सेव करें',
  saveFirst: 'पहले फ़ॉर्म नंबर चुनिए (ऊपर)',
  theMenu: 'मेन्यू',
  moreOptional: 'और, अगर पता हो (वैकल्पिक — बाद में मेन्यू से पढ़ा जाएगा)',
  savesFirst: 'पहले फ़ोन पर सेव होता है। अपलोड सिग्नल आने पर हो जाएगा।',
};

export const CATALOGUES: Readonly<Record<Lang, Readonly<Record<Key, string>>>> = { en, hi };

const KEY = 'saathi.field.lang';
const listeners = new Set<() => void>();

function stored(): Lang {
  try {
    return localStorage.getItem(KEY) === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* the toggle still works for this open */
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let text: string = CATALOGUES[lang][key];
  for (const [name, value] of Object.entries(vars ?? {})) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

/** The current language and the sentence for a key, re-rendering when the toggle is pressed. */
export function useStrings(): {
  readonly lang: Lang;
  readonly t: (key: Key, vars?: Record<string, string | number>) => string;
} {
  const lang = useSyncExternalStore<Lang>(subscribe, stored, () => 'en');
  // Stable per language, so an effect that reads a message does not re-run on every keystroke.
  const t = useCallback(
    (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
  return { lang, t };
}
