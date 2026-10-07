# Panoramax Quality Gate

Frontend Vite + React + TypeScript + Tailwind per testare foto Panoramax prima dell'upload pubblico.

## Cosa include

- Modalità test con anteprima immagine
- Overlay dei difetti con bounding box
- Modalità upload quando la foto supera il controllo qualità
- UI pronta per agganciare un backend Express o FastAPI

## Avvio

1. Installa Node.js 18.19+ e npm.
2. Se avevi già installato le dipendenze, elimina `node_modules` e un eventuale `package-lock.json` locale.
3. Copia `.env.example` in `.env` se vuoi cambiare l'endpoint backend.
4. Installa le dipendenze con `npm install`.
5. Avvia il frontend con `npm run dev`.

## Note tecniche

- Il progetto usa Tailwind CSS v4 tramite `@tailwindcss/vite`.
- La tipografia usa Atkinson Hyperlegible Next, il font incluso nel web-viewer ufficiale Panoramax.
- La palette segue il brand Panoramax ed è definita come token `@theme` in `src/styles.css` (Tailwind v4 non usa `tailwind.config.js`):
  - **Panoramax Blue** `#1F419B` (`pnx-blue`): colore primario per header, bottoni principali e testi importanti.
  - **Panoramax Purple** `#A92FB4` (`pnx-purple`): stati attivi, focus ring e accenti visivi.
  - **Neutri**: scala `slate` di Tailwind.
  - **Semantici** (`status-success`, `status-warning`, `status-error`): solo per l'esito dei test del motore C++.
- La preview dell'immagine locale usa un object URL con cleanup automatico.
- `VITE_API_BASE_URL` definisce l'endpoint del backend che riceverà il file e il JSON di analisi.

## Prossimo passo suggerito

- Collegare il frontend al backend di upload/analisi e sostituire i dati demo con la risposta reale del motore C++.