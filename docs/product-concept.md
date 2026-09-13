# Dubai Saathi — Product Concept & MVP Blueprint

**Document revision:** Hindi-only MVP + technical stack + offline STT evaluation

**Working concept:** A Dubai-savvy Indian friend in your pocket  
**Launch market:** Indian travellers visiting Dubai  
**Initial platform:** PWA-first, offline-first  
**MVP language:** Hindi only  
**Initial geography:** Dubai; Sharjah/Abu Dhabi later

## 1. Product Vision

Dubai Saathi is a travel companion designed specifically for Indian travellers in Dubai, with the MVP focused on Hindi-speaking travellers.

It is **not a conventional itinerary planner**. The traveller decides where they want to go; Dubai Saathi helps them execute that trip or destination choice simply.

> **“A Dubai-savvy Indian friend in your pocket.”**

### Core principle

> **Offline-first. Not offline-enabled.**

The product is one application that is always capable of working offline. Internet is used for freshness, payments, updates, synchronisation and optional cloud services — not as a prerequisite for the core experience.

## 2. Target User

Primary users:
- Indian travellers going to Dubai
- Families and first-time visitors
- Budget-conscious travellers
- Hindi/Hinglish speakers
- Vegetarian/Jain/Sattvik travellers
- Travellers who may not have reliable roaming/data
- Travellers who need help communicating with taxi drivers or restaurant staff

The user should be acquired **before leaving India**, so they can install and test the product before flying.

## 3. Core Product Promise

> **You speak your language. Dubai understands you.**

Supporting message:

> **Dubai. In your language. Offline.**

Strong marketing demonstration:

> **Turn off your internet in India and try Dubai Saathi.**

## 4. Core Features

### 4.1 Language

### MVP
- Hindi only

### Future:
- Hinglish/mixed Hindi-English
- Telugu
- Tamil
- Malayalam
- Gujarati
- Marathi
- Bengali
- Kannada
- Punjabi

The app responds in the user's language.

### 4.2 Transport

User asks where they want to go.

Dubai Saathi suggests practical options:
- Taxi
- Metro
- Tram
- Bus
- Walking
- Multimodal combinations

Example:

> Walk → Metro → Walk → Bus → Walk

Show:
- Approximate time
- Approximate cost
- Walking component
- Interchanges
- Simpler alternative

The product should answer **“How do I get there?”**, not create forced itineraries.

### 4.3 Food

A specialised Indian-traveller food layer.

Dietary categories:
- Vegetarian
- Jain
- Sattvik
- No onion
- No garlic
- Eggless
- Vrat / fasting
- Indian vegetarian
- Quick Indian snacks

Examples:
- Vada pav
- Samosa
- Dosa
- Thali
- Jain meals
- South Indian breakfast
- Vegetarian Gujarati food

Restaurant/menu information can initially be manually curated, including menu photographs.

### 4.4 Communication / Translation

Example:

User says in Hindi:

> “Please take me to this hotel. How much will it cost?”

Dubai Saathi:
1. Understands Hindi/Hinglish.
2. Converts to Arabic.
3. Displays Arabic.
4. Optionally speaks Arabic.

Useful for taxi drivers, restaurants, shops and hotels.

Key modes:
- **Say it for me**
- **Show this to the driver**

### 4.5 Emergency Layer

Always-available:
- Police
- Ambulance
- Fire
- Hospitals
- Pharmacies
- Emergency phrases
- Saved hotel information
- Embassy/consular information where appropriate

## 5. Offline Architecture

The product should not have separate online and offline versions.

There is only one Dubai Saathi.

### Local/offline layer

Potentially stored on device:
- Dubai map data
- Metro, tram and bus networks
- Walking network
- Routing graph
- Restaurant database
- Food categories
- Restaurant/menu photographs
- Hindi/English/Arabic phrase database
- Emergency information
- Saved locations
- Local search index
- Basic intent recognition

### Online layer

Internet is primarily used for:
- Content updates
- Payment
- Entitlement validation
- Account/device management
- Analytics
- Synchronisation
- Fresh information
- Optional cloud AI
- Optional cloud speech/translation fallback

## 6. PWA-First Strategy

Recommended initial platform: **Progressive Web App**.

Advantages:
- Avoid initial App Store / Play Store complexity
- Faster iteration
- One codebase
- Easier payment flow
- Strong offline capability
- Easy QR family activation
- Existing PWA development experience can be leveraged

The objective is not to build a website. It should feel like:

> **A native-feeling application delivered as a PWA.**

Native apps can be considered later if a proven requirement emerges.

## 7. Biggest Technical Risk

The main technical risk is:

> **Offline Hindi/Hinglish voice recognition across Android and iPhone.**

First technical spike:

**Android Chrome PWA:** Hindi/Hinglish speech → intent → Arabic text → Arabic speech

**iPhone Safari PWA:** Hindi/Hinglish speech → intent → Arabic text → Arabic speech

Preferred architecture:
1. On-device speech recognition where available
2. Local intent engine
3. Local phrase/translation database
4. Local TTS where possible
5. Cloud fallback when connectivity exists


## 6A. MVP Technical Stack

The MVP should remain **PWA-first**, but the architecture must be chosen around the product's strongest promise: reliable offline operation.

### Recommended stack

| Layer | MVP recommendation | Purpose |
|---|---|---|
| Frontend | React + TypeScript | Main PWA application |
| PWA | Service Worker + Workbox | Offline caching, app-shell and asset management |
| Local database | IndexedDB + Dexie.js | Offline Dubai data, user state and downloaded content |
| Local search | FlexSearch or MiniSearch | Fast offline place/food search |
| Maps | MapLibre GL JS | Map rendering without dependence on Google Maps |
| Map data | OpenStreetMap-derived data + licensed offline vector tiles | Offline Dubai map |
| Routing | Local/precomputed routing graph | Offline transport and walking routes |
| Backend API | Node.js + TypeScript | Accounts, payments, entitlement and content updates |
| Database | PostgreSQL + PostGIS | Places, geography, transport and content |
| Authentication | Phone/email OTP initially | Simple user identity |
| Payments | INR gateway supporting UPI + cards | Trip-pass purchase |
| Analytics | Lightweight event analytics | Funnel and product usage measurement |
| Hindi STT | **sherpa-onnx / IndicConformer — primary evaluation** | Offline Hindi speech recognition |
| Hindi STT baseline | **Vosk Hindi** | Lightweight offline benchmark |
| Accuracy benchmark | **Whisper-family model / WhisperKit where native testing is possible** | Accuracy comparison |
| Local TTS | Device TTS first; sherpa-onnx evaluation as needed | Offline Arabic/other speech output |
| AI | Optional cloud LLM fallback | Complex queries only when online |

### Architectural rule

The local client should contain enough information to answer the most common traveller requests without a server.

The backend should primarily handle:

- User accounts
- Payment
- Pass activation
- Family/device entitlements
- Content updates
- Analytics
- Optional online fallback

This keeps the recurring cost and failure surface low.

---

## 7A. Hindi-Only MVP: Offline Speech-to-Text

The MVP should deliberately be **Hindi-only**.

Do not attempt to solve Hindi + English + Telugu + Tamil + Malayalam + other languages at the same time.

The initial speech pipeline should be:

**Hindi speech → offline STT → local intent detection → local Dubai data → response**

For example:

> “Mujhe Bur Dubai se Karama jaana hai.”

becomes a structured request such as:

- Origin: Bur Dubai
- Destination: Karama
- Intent: transport

Another example:

> “Mujhe Jain khana kahaan milega?”

becomes:

- Intent: food search
- Dietary preference: Jain
- Location: current location

### Why this matters

We do not need a general-purpose Hindi conversational AI to prove the product.

For the MVP, we need excellent recognition of the **small set of commands travellers actually use**.

That makes offline operation much more achievable.

---

## 7B. Offline Hindi STT Tools to Evaluate

### 1. sherpa-onnx + IndicConformer — Primary candidate

This should be the first technical evaluation.

Reasons:

- Designed for on-device/offline speech processing
- Supports Android and iOS
- Supports multiple deployment approaches
- ONNX-based models
- Suitable for streaming recognition
- IndicConformer models are particularly relevant to Indian languages
- Can potentially form part of a broader local speech stack

The evaluation should specifically look for a Hindi/IndicConformer model that can be packaged and run locally.

**Target:** Android Chrome/PWA feasibility first, followed by iPhone feasibility.

### 2. Vosk Hindi — Baseline

Vosk is worth testing because it is:

- Offline
- Lightweight
- Available on mobile platforms
- Streaming-capable
- Has Hindi models
- Mature enough to provide a useful benchmark

Its biggest value for us may be as a **low-resource baseline**.

If Vosk's recognition quality is good enough for our constrained command set, it could simplify the MVP.

### 3. Whisper-family models — Accuracy benchmark

Whisper should be included in the benchmark because it provides a strong reference point for multilingual speech recognition.

For iPhone/native experimentation, WhisperKit is particularly relevant because it uses Apple's on-device capabilities.

However, Whisper/WhisperKit should not automatically become the MVP choice because:

- Model size can be larger
- Resource requirements can be higher
- A native component may be needed
- It may complicate the pure-PWA architecture

Its role initially is:

> **“How accurate could we potentially make Hindi offline?”**

rather than:

> **“This must be our production architecture.”**

---

## 7C. Offline Hindi STT Evaluation Protocol

Do not select an STT engine based only on published benchmark scores.

Dubai Saathi needs a **product-specific benchmark**.

### Test speakers

Use at least:

- 5–10 Hindi speakers
- Male and female voices
- Different accents
- Different speaking speeds

### Test environments

Record speech:

1. Quiet room
2. Hotel room
3. Street
4. Taxi
5. Restaurant
6. Airport-like background noise

### Test vocabulary

The benchmark should contain real Dubai travel terms:

- Bur Dubai
- Deira
- Karama
- Jumeirah
- Dubai Mall
- Mall of the Emirates
- Marina
- Metro
- Tram
- Bus
- Taxi
- Jain
- vegetarian
- restaurant
- hotel
- airport

### Test sentences

Examples:

> “Mujhe Bur Dubai se Karama jaana hai.”

> “Mujhe Jain khana kahaan milega?”

> “Dubai Mall kaise jaana hai?”

> “Taxi se kitna lagega?”

> “Metro se jaana hai.”

> “Mujhe vegetarian restaurant chahiye.”

> “Mere hotel ke paas Indian restaurant hai kya?”

> “Driver ko bolo mujhe is hotel mein jaana hai.”

### Measure

For each engine record:

- Word Error Rate
- Intent recognition accuracy
- Destination recognition
- Food-category recognition
- Hindi-English mixed speech performance
- Dubai place-name accuracy
- Noise performance
- Recognition latency
- Model size
- RAM usage
- CPU usage
- Battery impact
- Android performance
- iPhone performance
- PWA/browser compatibility

### Most important KPI

For Dubai Saathi, **intent accuracy is more important than perfect transcription**.

If the user says:

> “Bhai mujhe Karama jaana hai, metro se kaise jaaun?”

we don't necessarily need a perfect transcript.

We need the system to understand:

**Destination = Karama  
Mode = Metro  
Intent = Route**

This distinction can make the offline voice problem substantially easier.

---

## 7D. Recommended Voice Architecture

### Stage 1 — MVP

**Microphone → Offline Hindi STT → Intent parser → Local database → Response**

No LLM required.

### Stage 2

Add:

**Offline STT → Intent parser → Local answer**

with cloud AI only when the user is online and asks something outside the supported intent set.

### Stage 3

Potentially:

**Offline STT → Local/Hybrid AI → Local answer**

once real-world usage demonstrates that a more conversational layer is valuable.

### Voice UX

Keep the interface extremely simple.

Large microphone button:

> **🎙 बोलिए**

Then:

> “Mujhe Jain khana kahaan milega?”

The app should answer in Hindi.

For communication:

> **“Driver ko bolo”**

The user speaks Hindi.

The app produces Arabic text and, where supported, Arabic speech.

---

## 7E. Important PWA Decision Gate

Offline speech is the one feature that could justify introducing a native component.

Therefore:

### Do not decide today that the product must remain 100% PWA.

Instead use this decision gate:

**If Android + iPhone browser/PWA offline Hindi STT is sufficiently accurate and reliable → remain PWA-first.**

**If browser limitations materially damage the voice experience → consider a thin native wrapper/native speech module while retaining the same application architecture and UX.**

The product's USP should win over architectural purity.


## 8. Maps and Routing

Map architecture needs care.

Public map tile services should not simply be bulk-downloaded for offline use unless their terms explicitly permit it.

Possible approaches:
- Self-hosted map tiles
- Providers supporting offline/prefetch
- Vector tiles
- Local routing graph
- MapLibre-based rendering
- OpenStreetMap-derived data with appropriate licensing and usage

Goal:

> **The traveller must still understand and navigate Dubai when the network disappears.**

## 9. User Experience

### Before the trip

1. Traveller sees Meta advertisement.
2. Opens Dubai Saathi.
3. Installs PWA.
4. Chooses language.
5. Activates/downloads Dubai knowledge pack.
6. App says:
   > “Try me without internet.”
7. Traveller switches off Wi-Fi/mobile data.
8. Tests search, transport, food and translation.
9. Traveller may purchase a pass before flying.
10. If purchased in India, pass can activate on arrival in Dubai.

## 10. Arrival Activation

Use GPS to determine when the traveller actually reaches Dubai.

Do not rely on a single GPS reading.

Use repeated readings/location confidence/geofencing to reduce false activation.

This is particularly important for travellers flying into Abu Dhabi and travelling to Dubai.

## 11. Free Trial

### Recommended model

**24-hour full offline trial after arrival in Dubai.**

Why not three days?

Three days may allow the traveller to postpone the purchase decision.

Twenty-four hours creates urgency while still allowing a meaningful experience.

### Flow

In India:
> Full product available for testing.

After arrival in Dubai:
> **First 24 hours are free.**

After 24 hours:
> Purchase a trip pass to continue.

A small emergency/core layer should remain available after expiry.

## 12. Pricing

No subscription.

Treat it like a travel/data pack.

### Solo

**₹199 / 7 days**

### Family

**₹399 / 7 days / up to 4 devices**

The family plan is deliberately attractive.

Instead of ₹199 × 4 = ₹796, the family pays ₹399.

## 13. Payment Strategy

Charge in:

> **INR**

Primary:
- UPI
- Cards

Payment requires connectivity, which is acceptable.

The traveller can purchase before leaving India or later when connected.

## 14. Family Device Activation

Recommended mechanism:

> **QR-based device pairing**

Owner:
- Buys ₹399 Family Pass
- Sees “3 of 4 devices available”
- Taps “+ Add Family Member”
- Generates temporary QR

Family member:
1. Opens PWA
2. Scans QR
3. Confirms “Join this Family Pass?”
4. Device becomes activated

Owner dashboard:
- Owner
- Family Member 1
- Family Member 2
- Family Member 3
- 4/4 devices

Include **Revoke Device**.

QR should contain only a short-lived, one-time activation token, not permanent entitlement.

All family devices share the same pass expiry.

## 15. Internal Architecture

### Client
- Service Worker
- IndexedDB/local database
- Local search
- Local routing
- Local content
- Offline maps
- Local phrase/intent engine
- GPS
- Audio interface
- Home Screen installation

### Backend
- Authentication
- Payments
- Entitlements
- Family device management
- Content versioning
- Content updates
- Analytics
- Optional cloud AI
- Optional cloud translation/speech fallback

### Major data entities
- User
- Device
- Pass
- Family
- FamilyDevice
- DubaiPlace
- Restaurant
- FoodTag
- Menu
- TransportNode
- TransportEdge
- Route
- Phrase
- EmergencyPoint
- ContentVersion

## 16. Offline Data Pack

### Geography
- Dubai boundaries
- Roads
- Neighbourhoods
- Landmarks
- Airports
- Hotels
- Shopping areas

### Transport
- Metro stations
- Metro lines
- Tram
- Bus
- Walking connections
- Interchanges
- Fares where practical

### Food
- Curated restaurants
- Indian restaurants
- Jain-friendly restaurants
- Vegetarian restaurants
- Sattvik options
- Quick bites
- Menu photographs
- Dietary tags

### Communication
- Taxi phrases
- Restaurant phrases
- Shopping phrases
- Hotel phrases
- Emergency phrases
- Hindi/English → Arabic mappings

### Emergency
- Hospitals
- Pharmacies
- Emergency services
- Embassy/consular information
- Saved hotel details

## 17. AI Strategy

Do not make the entire application dependent on an LLM.

For predictable commands use:
- Intent classification
- Structured local data
- Rules
- Search
- Local phrase mappings

Example:

> “Mujhe Bur Dubai se Karama jaana hai.”

This should be handled locally.

AI is more useful for:
- Ambiguous natural-language questions
- Complex translation
- Explanations
- Cloud fallback
- Personalised responses

This reduces variable AI costs and improves offline reliability.

## 18. Indicative Unit Economics

These are **planning assumptions only**, not validated supplier quotes.

Variable-cost categories:
- Maps/routing
- AI
- Speech
- Translation
- TTS
- Hosting
- Database
- CDN
- Storage
- Payment processing
- Analytics

A preliminary internal planning assumption was roughly:

**₹40–₹50 variable cost per Solo user**

This must be validated through an actual technical cost model.

### ₹199 Solo

Revenue: ₹199  
Illustrative variable cost: ₹40–₹50  
Contribution before acquisition/overhead:

**₹149–₹159**

### ₹399 Family

Revenue: ₹399  
Up to four devices.

Because much of the content/map cost is shared rather than multiplied linearly, the family plan has potential for strong contribution margins.

## 19. Meta Acquisition Economics

Evaluate using:

> **Maximum affordable CAC**

The model should include:
- Solo purchases
- Family purchases
- Trial-to-paid conversion
- Pre-trip purchases
- Repeat Dubai trips
- Referral purchases
- Payment fees
- Cloud fallback usage
- Support

Build scenarios for:
- 10,000 users
- 100,000 users
- 1,000,000 users

Calculate:
- Revenue
- Variable cost
- Gross margin
- CAC ceiling
- Break-even CAC
- Meta advertising budget
- Trial conversion requirement

## 20. Differentiation

Generic offline Dubai guides already exist.

Jain food finders also exist.

The opportunity is the combination:

> **Indian traveller + offline-first + voice + food preferences + transport + communication**

Avoid claiming nobody has ever built it.

Better positioning:

> **A purpose-built Dubai companion for Indian travellers.**

## 21. What Dubai Saathi Should NOT Become

Avoid turning it into:
- Generic hotel booking
- Flight booking
- Food delivery
- Restaurant marketplace
- Conventional itinerary planner
- Giant travel content portal
- Generic AI chatbot

The product should remain focused.

The traveller asks:

> **“Where do I want to go?”**

Dubai Saathi answers:

> **“Here is the easiest way to get there, where you can eat on the way, and what you can say when you arrive.”**

## 22. MVP

### Feature 1 — Ask / Search
“How do I get to Bur Dubai?”

### Feature 2 — Offline Transport
Metro, bus, walking, taxi estimate and multimodal route.

### Feature 3 — Indian Food
Vegetarian, Jain, Sattvik, Indian and quick snacks.

### Feature 4 — Communication
Hindi/Hinglish → Arabic text + optional voice.

### Feature 5 — Offline Map
Location and relevant route information without internet.

### Feature 6 — Emergency
Always available.

### Feature 7 — Trip Pass
24-hour Dubai trial; ₹199 Solo; ₹399 Family.

### Feature 8 — Family QR
Up to four devices.

## 23. First Technical Spike

Prove these four things first:

1. Android Chrome PWA + no internet: Hindi speech → intent
2. iPhone Safari PWA + no internet: Hindi speech → intent
3. Intent → Arabic phrase locally
4. Arabic phrase → Arabic voice locally

If these work reliably enough, the remaining architecture is substantially lower risk.

## 24. Go-To-Market

Funnel:

**Meta Ad → PWA → Install → Offline Demonstration → Dubai Trial → Paid Pass**

Potential advertisement:

> “Going to Dubai?”
>
> “Turn off your internet.”
>
> “Ask Dubai Saathi where to go.”
>
> “Ask where to eat.”
>
> “Ask it to speak to your taxi driver.”
>
> “No Wi-Fi. No roaming. Still works.”

## 25. Possible Landing Page

### Headline

**Dubai. In Your Language. Offline.**

### Supporting copy

**Meet Dubai Saathi — your Dubai-savvy Indian friend in your pocket.**

Find your way.  
Find Indian food.  
Ask for directions.  
Speak to your taxi driver.  
Get help when you need it.

**Even without internet.**

### CTA

**Try Dubai Saathi Free**

## 26. Product Principles

1. Offline-first.
2. Indian traveller first.
3. Simple beats feature-heavy.
4. Voice should feel natural.
5. No forced itineraries.
6. Local data before cloud AI.
7. One product, not separate online/offline products.
8. INR pricing.
9. Trip pass, not subscription.
10. Family sharing should be frictionless.
11. Emergency functionality should never disappear.
12. Prove the offline experience before scaling.

## 27. Immediate Next Steps

### Phase 1 — Technical feasibility
Build a small PWA prototype proving:
- Offline storage
- Offline search
- Offline Hindi/Hinglish input
- Local intent recognition
- Hindi/English → Arabic phrase mapping
- Arabic TTS
- GPS
- Basic Dubai map

### Phase 2 — Content prototype
Create a manually curated Dubai dataset:
- 100–200 useful places
- 50–100 Indian/Jain/vegetarian food options
- Core Metro network
- Key transport links
- 100–200 communication phrases
- Emergency information

### Phase 3 — Closed user test
Measure:
- Usage frequency
- First feature used
- Offline reliability
- Food-filter demand
- Voice trust
- Understanding of ₹199/₹399
- Whether 24 hours triggers purchase

### Phase 4 — Paid acquisition test
Measure:
- Cost per install
- Cost per activated traveller
- Trial usage
- Trial-to-paid conversion
- Solo vs family mix
- CAC
- Contribution after variable cost

## 28. Strategic End State

If Dubai Saathi succeeds, the model can later be replicated for other high-volume destinations used by Indian travellers:
- Abu Dhabi
- Sharjah
- Singapore
- Bangkok
- Kuala Lumpur
- Bali
- London
- Europe

But the initial strategy should remain:

> **Win Dubai first.**

The long-term asset is a reusable **offline travel companion platform for Indian travellers**, with destination-specific local knowledge packs.

---

## One-Line Product Definition

> **Dubai Saathi is an offline-first travel companion that helps Indian travellers navigate Dubai, find food suited to their needs, and communicate confidently — in their own language, even without internet.**
