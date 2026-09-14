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
  'ask.label': 'साथी से पूछिए',
  'ask.placeholder': 'साथी से पूछिए…',
  'ask.hint': 'हिंदी या हिंग्लिश में लिखिए — “करामा जाना है”',
  'ask.mic': 'बोलकर भरिए',
  'ask.rewrite': 'फिर से लिखिए',

  // 1.1 · रास्ता › कहाँ जाना है? — the front door of the tile (decision 014)
  'transport.title': 'कहाँ जाना है?',
  'transport.locationWhy': 'रास्ता बताने के लिए साथी को आपकी जगह चाहिए.',
  'transport.placeholder': 'जगह का नाम लिखिए…',
  'transport.label': 'कहाँ जाना है',
  'transport.areaIsBig':
    '{area} काफ़ी बड़ा इलाक़ा है. इमारत या पास की कोई मशहूर जगह भी लिख दीजिए — ड्राइवर को आसानी होगी.',
  'transport.quick': 'जल्दी से',
  'transport.hotel': 'मेरा होटल',
  'transport.recent': 'हाल में',
  'transport.options': 'कैसे जाएँ',
  'transport.translate': 'ड्राइवर को दिखाएँ',
  'transport.unknownPlace': '“{text}” — यह जगह अभी साथी के पास नहीं है.',
  'transport.unknownPlaceWhy': 'दूसरा नाम लिखकर देखिए — जैसे “करामा” या “दुबई मॉल”.',
  'transport.noArabic': 'इस जगह का अरबी नाम साथी के पास नहीं है. विकल्प फिर भी दिखेंगे.',

  // 1.1b · रास्ता › जगह की इजाज़त नहीं
  'noLocation.title': 'जगह की इजाज़त नहीं',
  'noLocation.heading': 'बिना जगह की इजाज़त के ये नहीं चलेंगे',
  'noLocation.route': 'यहाँ से रास्ता',
  'noLocation.food': 'आस-पास का खाना',
  'noLocation.hotel': 'होटल का पिन',
  'noLocation.settings': 'सेटिंग खोलें',
  'noLocation.stillRefused':
    'फ़ोन ने अभी भी मना किया. फ़ोन की सेटिंग › साइट › जगह में साथी को चालू कीजिए, फिर यही बटन दबाइए.',
  'noLocation.rest': 'बाक़ी सब चलेगा — बोलना, ज़रूरी जानकारी और तैयार वाक्य.',

  // 1.3 · रास्ता › विकल्प
  'options.trail': 'कहाँ जाना है? › विकल्प',
  'options.title': '{place} — कैसे जाएँ?',
  'options.from': 'यहाँ से',
  'options.estimate': 'किराया और समय अनुमानित',
  'options.easiest': 'सबसे आसान',
  'options.fastest': 'सबसे तेज़',
  'options.cheapest': 'सबसे सस्ता',
  'options.planning': 'रास्ता देख रहा हूँ…',
  'options.noRoute': 'यहाँ से रास्ता नहीं निकल पाया',
  'options.noRouteWhy': 'साथी को आपकी जगह नहीं मिली, या आप दुबई से बाहर हैं.',
  'options.showDriver': 'ड्राइवर को दिखाएँ',

  // 1.4 · रास्ता › क़दम दर क़दम
  'steps.trail': 'विकल्प › क़दम दर क़दम',
  'steps.title': '{mode} से {place}',
  'steps.totalTime': 'कुल समय',
  'steps.fare': 'किराया',
  'steps.walking': 'पैदल',
  'steps.walk': 'पैदल चलिए',
  'steps.ride': '{line} लीजिए',
  'steps.taxiRide': 'टैक्सी लीजिए',
  'steps.toPlace': '{place} तक',
  'steps.between': '{from} → {to} · {count}',
  'steps.here': 'यहाँ से',

  // Shared by 1.3 and 1.4 — the words a journey is measured in
  'mode.metro': 'मेट्रो',
  'mode.bus': 'बस',
  'mode.tram': 'ट्राम',
  'mode.taxi': 'टैक्सी',
  'mode.walk': 'पैदल',
  'unit.minutes': '{count} मिनट',
  'unit.fare': 'AED {amount}',
  'unit.fareRange': 'AED {min}–{max}',
  'unit.noFare': 'कोई किराया नहीं',
  'unit.stations': '{count} स्टेशन',
  'unit.stops': '{count} स्टॉप',
  'unit.direct': 'सीधे · {km} km',

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

  // 4.1 · ज़रूरी जानकारी — the calm shelf. Nothing here is medical and nothing here is red
  // (design rule 16a); the numbers line is knowledge, not a button.
  'info.title': 'होटल और दस्तावेज़',
  'info.hotel': 'मेरा होटल',
  'info.hotel.add': 'जोड़ लीजिए — पिन, कार्ड या गेट की फ़ोटो',
  'info.hotel.card': 'कार्ड की फ़ोटो',
  'info.hotel.gate': 'गेट की फ़ोटो',
  'info.hotel.pinned': 'पिन लगा है',
  'info.hotel.back': 'होटल वापस जाएँ',
  'info.hotel.show': 'ड्राइवर को दिखाएँ',
  'info.docs': 'दस्तावेज़',
  'info.docs.none': 'अभी कोई नहीं — बीमा, पासपोर्ट, वापसी की फ़्लाइट, जो ज़रूरी लगे',
  'info.docs.add': 'दस्तावेज़ जोड़ें',
  'info.docs.added': 'जोड़ा {date}',
  'info.consulate.call': 'कॉन्सुलेट को फ़ोन करें',
  'info.numbers': 'पुलिस 999 · एम्बुलेंस 998 · दमकल 997',

  // 4.2 · ज़रूरी जानकारी › होटल जोड़ें — captured, never typed (design rule 14)
  'info.hotelAdd.title': 'होटल जोड़ें',
  'info.hotelAdd.trail': 'होटल',
  'info.hotelAdd.anyOne': 'कोई एक काफ़ी है. टाइप कुछ नहीं करना.',
  'info.hotelAdd.pin': 'यहीं पिन करें',
  'info.hotelAdd.pinWhy': 'होटल में खड़े होकर दबाएँ — GPS से जगह याद रहेगी',
  'info.hotelAdd.pinning': 'जगह ढूँढ रहा हूँ…',
  'info.hotelAdd.pinDenied':
    'जगह की इजाज़त नहीं मिली. फ़ोन की सेटिंग में चालू कीजिए, या नीचे से फ़ोटो ले लीजिए.',
  'info.hotelAdd.pinUnavailable': 'अभी जगह नहीं मिली. नीचे से फ़ोटो ले लीजिए — वह भी काफ़ी है.',
  'info.hotelAdd.pinTimeout': 'जगह मिलने में देर लगी. फिर दबाइए, या नीचे से फ़ोटो ले लीजिए.',
  'info.hotelAdd.card': 'कार्ड की फ़ोटो',
  'info.hotelAdd.cardWhy': 'रिसेप्शन का बिज़नेस कार्ड — यही ड्राइवर को दिखेगा',
  'info.hotelAdd.gate': 'गेट की फ़ोटो',
  'info.hotelAdd.gateWhy': 'सामने से — वापस आते समय पहचान के लिए',

  // 4.3 · ज़रूरी जानकारी › दस्तावेज़ जोड़ें
  'info.docAdd.title': 'दस्तावेज़ जोड़ें',
  'info.docAdd.trail': 'दस्तावेज़',
  'info.docAdd.photo': 'फ़ोटो लें',
  'info.docAdd.photoAlt': 'दस्तावेज़ की फ़ोटो',
  'info.docAdd.retake': 'बदलने के लिए फ़ोटो पर दबाइए',
  'info.docAdd.name': 'नाम',
  'info.docAdd.nameHint': 'जैसे — यात्रा बीमा',
  'info.docAdd.onlyHere':
    'सिर्फ़ इसी फ़ोन में रहेगा — कहीं नहीं भेजा जाएगा, और जब तक आप न हटाएँ, रहेगा.',
  'info.docAdd.needBoth': 'फ़ोटो लीजिए और नाम लिखिए — फिर रख लेंगे.',
  'info.docAdd.save': 'रख लें',

  // 4.4 · ज़रूरी जानकारी › दस्तावेज़
  'info.docView.trail': 'दस्तावेज़',
  'info.docView.footer': 'जोड़ा {date} · सिर्फ़ इस फ़ोन में',
  'info.docView.delete': 'हटाएँ',
  'info.docView.gone': 'यह दस्तावेज़ अब इस फ़ोन में नहीं है.',

  // Screens still to be built, named so the shell can route to them honestly
  // ---- 2 · खाना -------------------------------------------------------------------------
  'food.title': 'खाना',
  'food.label': 'क्या खाना है?',
  'food.placeholder': 'डोसा, थाली, जैन, चाय…',
  'food.hint': 'हिंदी या हिंग्लिश में लिखिए — “jain khana”',
  'food.nearby': 'आस-पास · {count} जगह',
  'food.within': '{area} के आस-पास · {count} जगह',
  'food.found': '{count} जगह मिलीं',
  'food.none': 'यह आस-पास नहीं मिला.',
  'food.noneWhy': 'हमारे पास अभी इतनी ही जगहें हैं. नीचे आस-पास की सब जगहें हैं.',
  'food.notFood': '“{text}” समझ नहीं आया. नीचे आस-पास की सब जगहें हैं.',
  'food.noLocation': 'जगह की इजाज़त नहीं है, इसलिए दूरी नहीं बता सकते.',
  'food.kitchen.pure-veg': 'शुद्ध शाकाहारी',
  'food.kitchen.mixed': 'वेज और नॉन-वेज',
  'food.kitchen.non-veg': 'नॉन-वेज',
  'food.price': 'एक के लिए ~AED {aed}',
  'food.km': '{km} km',
  'food.delivers': 'डिलीवरी है',
  'food.call': 'फ़ोन करें',
  'food.ask': 'पूछिए',
  'food.fixture': 'ये जगहें अभी जाँची नहीं गई हैं — असली जानकारी आनी बाक़ी है.',
  'food.tag.vegetarian': 'वेज',
  'food.tag.jain': 'जैन',
  'food.tag.sattvik': 'सात्विक',
  'food.tag.no-onion': 'बिना प्याज़',
  'food.tag.no-garlic': 'बिना लहसुन',
  'food.tag.eggless': 'बिना अंडा',
  'food.tag.vrat': 'व्रत',
  'food.tag.indian-vegetarian': 'भारतीय वेज',
  'food.tag.quick-snack': 'झटपट',
  'food.tag.south-indian': 'दक्षिण भारतीय',
  'food.tag.north-indian': 'उत्तर भारतीय',
  'food.tag.gujarati': 'गुजराती',
  'food.tag.punjabi': 'पंजाबी',
  'food.tag.chinese': 'चाइनीज़',
  'food.tag.arabic': 'अरबी',
  'food.tag.thali': 'थाली',
} as const;

export type StringKey = keyof typeof hi;
