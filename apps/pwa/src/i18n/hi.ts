/**
 * Every user-facing string in the app. Nothing is written in a component (CLAUDE.md working
 * conventions), so the whole surface can be read, reviewed and — when the MVP's one-language
 * rule lifts — translated, in one place.
 *
 * Keys are `screen.thing`, matching the screen numbers in `docs/field-ledger.md`.
 */
export const hi = {
  'app.name': 'दुबई साथी',

  // The status strip, on every screen after the landing page
  'strip.offline': 'ऑफ़लाइन',
  'strip.online': 'ऑनलाइन',
  'strip.recharge': 'रिचार्ज',
  'strip.theme': 'थीम बदलें',
  'strip.language': 'भाषा / Language',
  'strip.before': 'दुबई में 24 घंटे मुफ़्त',
  'strip.trial': '{hours} घंटे बाकी',
  'strip.pass': '{days} दिन बाकी',
  'strip.expired': 'पास ख़त्म',

  // Shared chrome
  'nav.back': 'वापस',
  'nav.home': 'घर',
  'nav.mic': 'साथी से पूछिए',

  // 2 · घर
  'tile.transport': 'रास्ता',
  'tile.transport.blurb': 'कहाँ जाना है?',
  'tile.food': 'खाना',
  'tile.food.blurb': 'वेज · जैन · आस-पास',
  'tile.talk': 'बोलना',
  'tile.talk.blurb': 'हिंदी बोलिए, अरबी दिखाइए',
  'tile.info': 'ज़रूरी जानकारी',
  'tile.info.blurb': 'होटल · दस्तावेज़ · कॉन्सुलेट',
  'home.micHint': 'या बोलकर पूछिए — “मरीना मॉल जाना है”',

  // 3.1 · बोलना › क्या कहना है?
  'say.title': 'क्या कहना है?',
  'say.speak': 'हिंदी में बोलिए',
  'say.example': 'जैसे — “इस होटल तक ले चलो”',
  'say.orPick': 'या तैयार वाक्य चुनिए',
  'say.situation.taxi': 'टैक्सी',
  'say.situation.hotel': 'होटल',
  'say.situation.shop': 'दुकान',
  'say.situation.food': 'खाना',

  // 3.2 · बोलना › अरबी में
  'arabic.title': 'अरबी में',
  'arabic.youSaid': 'आपने कहा',
  'arabic.showThis': 'ड्राइवर को यह दिखाएँ',
  'arabic.listen': 'अरबी में सुनाएँ',
  'arabic.speaking': 'बोल रहा हूँ…',
  'arabic.noVoice': 'इस फ़ोन में अरबी आवाज़ नहीं है — दिखाकर काम चल जाएगा',
  'arabic.show': 'ड्राइवर को दिखाएँ',

  // 3.3 · बोलना › ड्राइवर को दिखाएँ
  'driver.title': 'ड्राइवर को दिखाएँ',
  'driver.youSaid': 'आपने कहा — “{text}”',
  'driver.listenArabic': 'اسمع',

  // Screens still to be built, named so the shell can route to them honestly
  'soon.title': 'अभी बन रहा है',
  'soon.body': 'यह हिस्सा अगले हफ़्ते आएगा. तब तक बोलना चलता है.',
} as const;

export type StringKey = keyof typeof hi;
