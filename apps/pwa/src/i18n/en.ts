import type { StringKey } from './hi.js';

/**
 * The interface in English, for travellers who read it more comfortably than Hindi — and for
 * everyone else in the group who picks up the phone.
 *
 * This is the INTERFACE language only. What the app produces for a Dubai local is always
 * Arabic, and the phrase pack always carries Hindi, Hinglish, English and Arabic together.
 */
export const en: Record<StringKey, string> = {
  'app.name': 'Dubai Saathi',

  'strip.offline': 'Offline',
  'strip.online': 'Online',
  'strip.recharge': 'Recharge',
  'strip.theme': 'Switch theme',
  'strip.language': 'भाषा / Language',
  'strip.before': '24h free in Dubai',
  'strip.trial': '{hours} hrs left',
  'strip.pass': '{days} days left',
  'strip.expired': 'Pass ended',

  'nav.back': 'Back',
  'nav.home': 'Home',
  'nav.mic': 'Ask Saathi',

  'tile.transport': 'Getting around',
  'tile.transport.blurb': 'Where do you want to go?',
  'tile.food': 'Food',
  'tile.food.blurb': 'Veg · Jain · nearby',
  'tile.talk': 'Speaking',
  'tile.talk.blurb': 'Say it in Hindi, show it in Arabic',
  'tile.info': 'Important info',
  'tile.info.blurb': 'Hotel · documents · consulate',
  'ask.label': 'Ask Saathi',
  'ask.placeholder': 'Ask Saathi…',
  'ask.hint': 'Type in Hindi or Hinglish — “Karama jaana hai”',
  'ask.mic': 'Fill it by speaking',
  'ask.rewrite': 'Type it again',

  // 1.1 · रास्ता › कहाँ जाना है? — the front door of the tile (decision 014)
  'transport.title': 'Where do you want to go?',
  'transport.locationWhy': 'Saathi needs your location to work out the way from here.',
  'transport.placeholder': 'Type a place name…',
  'transport.label': 'Where you want to go',
  'transport.options': 'How to get there',
  'transport.translate': 'Show the driver',
  'transport.unknownPlace': '“{text}” — Saathi does not know this place yet.',
  'transport.unknownPlaceWhy': 'Try another name — for example “Karama” or “Dubai Mall”.',
  'transport.noArabic': 'Saathi has no Arabic name for this place. The options still work.',

  // 1.1b · रास्ता › जगह की इजाज़त नहीं
  'noLocation.title': 'No location permission',
  'noLocation.heading': 'These will not work without location',
  'noLocation.route': 'The way from here',
  'noLocation.food': 'Food nearby',
  'noLocation.hotel': 'The hotel pin',
  'noLocation.settings': 'Open settings',
  'noLocation.stillRefused':
    'The phone still said no. Turn Saathi on under Settings › Site › Location, then press this button again.',
  'noLocation.rest': 'Everything else works — speaking, important info and the ready sentences.',

  // 1.3 · रास्ता › विकल्प
  'options.trail': 'Where to? › Options',
  'options.title': '{place} — how to get there?',
  'options.from': 'From here',
  'options.estimate': 'Fares and times are estimates',
  'options.easiest': 'Easiest',
  'options.fastest': 'Fastest',
  'options.cheapest': 'Cheapest',
  'options.planning': 'Working out the way…',
  'options.noRoute': 'No way could be worked out from here',
  'options.noRouteWhy': 'Saathi could not find where you are, or you are outside Dubai.',
  'options.showDriver': 'Show the driver',

  // 1.4 · रास्ता › क़दम दर क़दम
  'steps.trail': 'Options › Step by step',
  'steps.title': '{place} by {mode}',
  'steps.totalTime': 'Total time',
  'steps.fare': 'Fare',
  'steps.walking': 'Walking',
  'steps.walk': 'Walk',
  'steps.ride': 'Take the {line}',
  'steps.taxiRide': 'Take a taxi',
  'steps.toPlace': 'to {place}',
  'steps.between': '{from} → {to} · {count}',
  'steps.here': 'from here',

  // Shared by 1.3 and 1.4 — the words a journey is measured in
  'mode.metro': 'Metro',
  'mode.bus': 'Bus',
  'mode.tram': 'Tram',
  'mode.taxi': 'Taxi',
  'mode.walk': 'Walk',
  'unit.minutes': '{count} min',
  'unit.fare': 'AED {amount}',
  'unit.fareRange': 'AED {min}–{max}',
  'unit.noFare': 'No fare',
  'unit.stations': '{count} stations',
  'unit.stops': '{count} stops',
  'unit.direct': 'direct · {km} km',

  'say.title': 'What do you want to say?',
  'say.speak': 'Say it in Hindi',
  'say.example': 'Like — “is hotel tak le chalo”',
  'say.orPick': 'Or pick a ready sentence',
  'say.situation.taxi': 'Taxi',
  'say.situation.hotel': 'Hotel',
  'say.situation.shop': 'Shopping',
  'say.situation.food': 'Food',

  'arabic.title': 'In Arabic',
  'arabic.youSaid': 'You said',
  'arabic.showThis': 'Show this to the driver',
  'arabic.listen': 'Play it in Arabic',
  'arabic.speaking': 'Speaking…',
  'arabic.noVoice': 'This phone has no Arabic voice — showing it will do',
  'arabic.tryAgain': 'It did not speak that time ({reason}). Tap again.',
  'arabic.show': 'Show the driver',

  'driver.title': 'Show the driver',
  'driver.youSaid': 'You said — “{text}”',
  'driver.listenArabic': 'اسمع',

  'listen.title': 'Listening…',
  'listen.trail': 'Ask Saathi',
  'listen.hint': 'Hindi or Hinglish — both work. Stop when you are finished.',
  'listen.done': 'Done',
  'listen.cancel': 'Cancel',
  'listen.heard': 'You said',
  'listen.check': 'Is this right?',
  'listen.checkWhy': 'Fix anything wrong — Hindi or English, whichever is quicker to type.',
  'listen.type': 'Type it instead',
  'listen.typeWhy': 'Hindi or Hinglish — both work.',
  'listen.orThis': 'Or: “{text}”',
  'listen.typeHint': 'Like — “Marina Mall jaana hai”',
  'listen.send': 'Go',
  'listen.again': 'Say it again',
  'listen.thinking': 'Working it out…',

  'listen.noPermission': 'The mic was not allowed',
  'listen.noPermissionWhy': 'Turn the mic on in your phone settings, or type it instead.',
  'listen.noSpeech': 'Nothing was heard',
  'listen.noEngine': 'This phone cannot recognise Hindi speech',
  'listen.noEngineWhy': 'Type it instead — everything else works the same.',
  'listen.preparing': 'Getting the voice ready…',
  'listen.preparingWhy': 'A few seconds the first time. Do not speak yet.',
  'listen.getVoice': 'Download the Hindi voice',
  'listen.getVoiceWhy': 'One download ({size} MB) — then the mic works with no internet.',
  'listen.downloading': 'Downloading… {percent}%',
  'listen.downloadFailed': 'The download did not finish. Try again.',
  'listen.insecure': 'This page did not open securely',
  'listen.insecureWhy':
    'Open it on the secure (https) address and the mic will work. For now, type it instead.',
  'listen.network': 'Recognising speech needed the internet',
  'listen.networkWhy': 'This phone cannot do it offline. Type it instead.',
  'listen.failed': 'Something went wrong with the mic',

  'listen.whichOne': '“{text}” — what would you like?',
  'listen.askRoute': 'How to get there',
  'listen.askFood': 'Find food there',
  'listen.notUnderstood': 'That did not come through',
  'listen.notUnderstoodWhy': 'Say it again, or pick from below.',

  'soon.title': 'Being built',
  'soon.body': 'This part lands next week. Speaking works today.',
};
