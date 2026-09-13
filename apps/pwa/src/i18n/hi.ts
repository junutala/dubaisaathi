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
  'arabic.tryAgain': 'इस बार आवाज़ नहीं आई ({reason})। फिर दबाइए।',
  'arabic.show': 'ड्राइवर को दिखाएँ',

  // 3.3 · बोलना › ड्राइवर को दिखाएँ
  'driver.title': 'ड्राइवर को दिखाएँ',
  'driver.youSaid': 'आपने कहा — “{text}”',
  'driver.listenArabic': 'اسمع',

  // 1.2 · रास्ता › सुन रहा हूँ — the mic, reachable from every screen
  'listen.title': 'सुन रहा हूँ…',
  'listen.trail': 'साथी से पूछिए',
  'listen.hint': 'हिंदी और हिंग्लिश — दोनों चलेंगे। कहकर रुक जाइए।',
  'listen.done': 'हो गया',
  'listen.cancel': 'रद्द करें',
  'listen.heard': 'आपने कहा',
  'listen.check': 'यही कहा था?',
  'listen.checkWhy': 'ग़लत हो तो सुधार लीजिए — हिंदी या अंग्रेज़ी, जो जल्दी टाइप हो।',
  'listen.type': 'टाइप करके बताइए',
  'listen.typeWhy': 'हिंदी और हिंग्लिश — दोनों चलेंगे।',
  'listen.orThis': 'या: “{text}”',
  'listen.typeHint': 'जैसे — “मरीना मॉल जाना है”',
  'listen.send': 'आगे बढ़िए',
  'listen.again': 'फिर बोलिए',
  'listen.thinking': 'समझ रहा हूँ…',

  // When the mic cannot do its job — every one of these ends in a way out, never a dead end
  'listen.noPermission': 'माइक की इजाज़त नहीं मिली',
  'listen.noPermissionWhy': 'फ़ोन की सेटिंग में माइक चालू कीजिए, या टाइप करके बताइए.',
  'listen.noSpeech': 'कुछ सुनाई नहीं दिया',
  'listen.noEngine': 'इस फ़ोन में हिंदी आवाज़ पहचान नहीं है',
  'listen.noEngineWhy': 'टाइप करके बताइए — बाक़ी सब वैसे ही चलेगा.',
  // The one-time voice download. This belongs on the landing page once that screen exists —
  // before the trip, on home wifi — and sits here meanwhile, where the need is discovered.
  'listen.preparing': 'आवाज़ तैयार हो रही है…',
  'listen.preparingWhy': 'पहली बार में कुछ सेकंड लगते हैं. अभी बोलिए मत.',
  'listen.getVoice': 'हिंदी आवाज़ डाउनलोड करें',
  'listen.getVoiceWhy': 'एक बार डाउनलोड ({size} MB) — फिर बिना इंटरनेट भी माइक चलेगा.',
  'listen.downloading': 'डाउनलोड हो रहा है… {percent}%',
  'listen.downloadFailed': 'डाउनलोड पूरा नहीं हुआ. दोबारा कोशिश कीजिए.',
  'listen.insecure': 'यह पेज सुरक्षित नहीं खुला',
  'listen.insecureWhy': 'सुरक्षित (https) पते पर खोलिए, तभी माइक चलेगा. अभी टाइप करके बताइए.',
  'listen.network': 'आवाज़ पहचानने के लिए इंटरनेट चाहिए था',
  'listen.networkWhy': 'यह फ़ोन आवाज़ ऑफ़लाइन नहीं पहचानता. टाइप करके बताइए.',
  'listen.failed': 'माइक से कुछ गड़बड़ हुई',

  // 1.2 › the two-button question, when one word could mean two things
  'listen.whichOne': '“{text}” — क्या करना है?',
  'listen.askRoute': 'वहाँ कैसे जाएँ',
  'listen.askFood': 'वहाँ खाना ढूँढें',
  'listen.notUnderstood': 'यह समझ नहीं आया',
  'listen.notUnderstoodWhy': 'फिर बोलिए, या नीचे से चुन लीजिए.',

  // Screens still to be built, named so the shell can route to them honestly
  'soon.title': 'अभी बन रहा है',
  'soon.body': 'यह हिस्सा अगले हफ़्ते आएगा. तब तक बोलना चलता है.',
} as const;

export type StringKey = keyof typeof hi;
