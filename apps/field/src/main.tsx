import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { sendAllPages } from './menusWanted.js';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('no #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Pages taken for a form on the menus-wanted list go as soon as there is a signal, whichever
// screen is open: at launch, and whenever the phone comes back online.
void sendAllPages();
window.addEventListener('online', () => void sendAllPages());
