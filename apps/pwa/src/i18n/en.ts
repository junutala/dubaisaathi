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
  'home.micHint': 'Or just say it — “Marina Mall jaana hai”',

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
  'arabic.show': 'Show the driver',

  'driver.title': 'Show the driver',
  'driver.youSaid': 'You said — “{text}”',
  'driver.listenArabic': 'اسمع',

  'listen.title': 'Listening…',
  'listen.trail': 'Ask Saathi',
  'listen.hint': 'Hindi or Hinglish — both work',
  'listen.cancel': 'Cancel',
  'listen.heard': 'You said',
  'listen.type': 'Type it instead',
  'listen.typeHint': 'Like — “Marina Mall jaana hai”',
  'listen.send': 'Go',
  'listen.again': 'Say it again',
  'listen.thinking': 'Working it out…',

  'listen.noPermission': 'The mic was not allowed',
  'listen.noPermissionWhy': 'Turn the mic on in your phone settings, or type it instead.',
  'listen.noSpeech': 'Nothing was heard',
  'listen.noEngine': 'This phone cannot recognise Hindi speech',
  'listen.noEngineWhy': 'Type it instead — everything else works the same.',
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
