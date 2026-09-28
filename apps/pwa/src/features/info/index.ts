/**
 * The hotel and the documents — the घर children. Anything outside this folder imports from
 * here, never from a file inside it.
 */
export { HotelScreen } from './HotelScreen.js';
export { DocumentsScreen } from './DocumentsScreen.js';
export { ContributeScreen } from './ContributeScreen.js';
export { ShareScreen } from './ShareScreen.js';
export { CONTACTS } from './contacts.js';
export { startOutboxSync } from './send.js';
export { startCardRetry } from './cardReading.js';
export { DocumentAddScreen } from './DocumentAddScreen.js';
export { DocumentScreen } from './DocumentScreen.js';
export { readHotel, watchHotel } from './storage.js';
export type { SavedHotel } from './records.js';
