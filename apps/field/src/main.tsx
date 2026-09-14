import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CaptureScreen } from './CaptureScreen.js';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('no #root');

createRoot(root).render(
  <StrictMode>
    <CaptureScreen />
  </StrictMode>,
);
