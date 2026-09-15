import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import { SettingsProvider } from './app/settings.js';
import { loadPhrasePack, loadTransportPack, parsePhrasePack } from './db/content.js';
import { parseTransportPack } from './features/transport/index.js';
import { requestPersistentStorage } from './db/schema.js';
import { applyPendingUpdate, startUpdateChecks } from './app/updates.js';
import { startVoiceEventSync } from './features/voice/sync.js';
import { forgetVosk } from './features/voice/modelCache.js';
import pack from '../../../data/phrases/phrases.v1.json';
import transport from '../../../data/transport/network.v1.json';
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

// The pack is content, loaded into IndexedDB once. Documents and the pack must survive a
// phone running low on space, so ask for persistence on the way in (decision 003).
void requestPersistentStorage();
void loadPhrasePack(parsePhrasePack(pack));
void loadTransportPack(parseTransportPack(transport));

// The learning loop leaves the phone here, and only here. Nothing waits on it: it tries once on
// boot and again when the phone says it is back online, and a failure leaves the queue intact.
startVoiceEventSync();
// Hands back the 42 MB the old recogniser left behind. Nothing can read those bytes any more —
// the engine is deleted and the archive is no longer served — so they are storage a traveller
// cannot find and cannot use. Best-effort and silent; a browser that refuses simply keeps them.
void forgetVosk();

createRoot(root).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
