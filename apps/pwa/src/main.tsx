import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.js';
import { SettingsProvider } from './app/settings.js';
import { loadPhrasePack, loadTransportPack, parsePhrasePack } from './db/content.js';
import { parseTransportPack } from './features/transport/index.js';
import { requestPersistentStorage } from './db/schema.js';
import { applyPendingUpdate } from './app/updates.js';
import pack from '../../../data/phrases/phrases.v1.json';
import transport from '../../../data/transport/network.v1.json';
import './fonts.css';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('no #root');

// Before anything paints: if a new build was downloaded in an earlier session, this is the
// "next launch" it was waiting for. Reloads once and never returns.
await applyPendingUpdate();

// The pack is content, loaded into IndexedDB once. Documents and the pack must survive a
// phone running low on space, so ask for persistence on the way in (decision 003).
void requestPersistentStorage();
void loadPhrasePack(parsePhrasePack(pack));
void loadTransportPack(parseTransportPack(transport));

createRoot(root).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
