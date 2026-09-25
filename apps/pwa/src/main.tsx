import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import { SettingsProvider } from './app/settings.js';
import { loadTransportPack } from './db/content.js';
import { parseTransportPack } from './features/transport/index.js';
import { requestPersistentStorage } from './db/schema.js';
import { applyPendingUpdate, startUpdateChecks } from './app/updates.js';
import { loadPacks, packBody, startPackSync } from './features/content/index.js';
import { startUsageRecording, startVoiceEventSync } from './features/ask/index.js';
import bundledTransport from '../../../data/transport/network.v1.json';
import './fonts.css';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('no #root');

// Before anything paints: if a new build was downloaded in an earlier session, this is the
// "next launch" it was waiting for. Reloads once and never returns.
await applyPendingUpdate();

// Ask whether there is a newer build, now and while the app stays open. Without this nothing is
// downloaded until the browser decides to look, which can be a day — which is how a release that
// was live on the server sat unseen on the owner's phone.
startUpdateChecks();

/**
 * Content before anything reads it (decision 030). The packs this phone has downloaded are
 * loaded from IndexedDB here, so the features that read them on first use see the newest thing
 * the phone holds rather than the copy compiled into this build. A phone that has downloaded
 * nothing — a first launch — finds nothing and every feature falls back to its bundled copy,
 * which is why this cannot make a fresh install worse.
 */
await loadPacks();

// The pack is content, loaded into IndexedDB once. Documents and the pack must survive a
// phone running low on space, so ask for persistence on the way in (decision 003).
void requestPersistentStorage();
// The downloaded network where there is one, the built-in one otherwise; `loadTransportPack`
// compares content versions and ignores anything that is not newer than what is already stored.
void loadTransportPack(parseTransportPack(packBody('transport') ?? bundledTransport));

// New content, asked for on launch and whenever the phone comes back to signal. What arrives is
// stored and taken up at the next launch — never mid-journey, the same rule a build follows.
startPackSync();

// The question log leaves the phone here, and only here. Nothing waits on it: it tries once on
// boot and again when the phone says it is back online, and a failure leaves the queue intact.
startVoiceEventSync();
startUsageRecording();

createRoot(root).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
