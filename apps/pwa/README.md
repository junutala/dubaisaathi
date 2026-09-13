# apps/pwa — the traveller's app

```sh
npm run dev --workspace @saathi/pwa     # localhost:5173
npm run verify                          # the gate: format, lint, types, screens, tests, build
```

## What is here today

The shell and the बोलना flow, end to end and fully offline:

- **2 · घर** — four tiles and the mic
- **3.1 · क्या कहना है?** — the mic, and ready sentences by situation
- **3.2 · अरबी में** — the Arabic, large, with device speech
- **3.3 · ड्राइवर को दिखाएँ** — the Arabic at arm's length, listen button in Arabic

रास्ता, खाना and ज़रूरी जानकारी are designed but not built: their tiles open a screen that
says so, rather than something half-working.

## Testing the translation

Open 3.1, pick a situation, tap a sentence. **अरबी में सुनाएँ** uses the phone's own Arabic
voice — which exists on most iPhones and on Android with Google TTS, and on nothing else. The
button disables itself and says so when there is no voice, rather than failing silently.

To test offline: load once, turn the radio off, reload. Nothing leaves the device.

## Layout of the source

| Path                            | What                                          |
| ------------------------------- | --------------------------------------------- |
| `src/app/`                      | shell, routing, the settings context          |
| `src/app/shell/`                | status strip, screen header, quick bar, icons |
| `src/features/phrases/`         | 3.1–3.3 and the Arabic speech module          |
| `src/features/voice/`           | the `VoiceEvent` learning loop                |
| `src/db/`                       | Dexie schema and the content loader           |
| `src/i18n/`                     | the Hindi and English catalogues              |
| `src/fonts.css`, `public/fonts` | self-hosted faces — see `docs/decisions/008`  |
