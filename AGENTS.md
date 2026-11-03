# Informatica Teorica — app di studio (PWA)

App per smartphone, stile Brilliant, per studiare Informatica Teorica (programma della triennale Federico II). È una PWA statica servita da GitHub Pages dalla radice del branch `main`. Tutto il testo è in italiano.

## Struttura

- `src/corso/lessons/NN.html` — le 27 lezioni. Prima riga: metadati JSON in un commento `<!--{...}-->`. Poi HTML con `<h2>` (sezioni), `<h3>` (sotto-argomenti), `<p>`, liste, riquadri `div.def | .thm | .proof | .example | .warn | .remark | .recap`, tabelle in `div.tblwrap`, simulatori come `<div data-w="nome"></div>`, esercizi in `section.exercises > div.ex`, domande d'orale in `section.oral`. Formule KaTeX con `\( ... \)` e `\[ ... \]`.
- `src/corso/engine.js`, `widgets.js`, `registry.js` — motori e simulatori interattivi (`WREG` mappa `data-w` → costruttore).
- `src/app/app.js` — l'app: percorso, player a schede, domande, XP/streak, ripasso, profilo. La funzione `buildDeck(n)` trasforma una lezione in un mazzo di schede.
- `src/app/quiz.txt` — banco delle domande a risposta multipla (formato descritto in testa al file).
- `src/app/app.css`, `src/app/index.html`, `src/app/icons/`, `src/app/sw.template.js`.
- `build.py` — genera nella radice i file serviti (`content.js`, `quiz.js`, copie dei sorgenti, `sw.js` con nuova versione).
- Nella radice: file generati + `vendor/` (KaTeX) + `manifest.webmanifest`. **Non modificare a mano i file generati**: modifica `src/` e lancia il build.

## Comandi

```
python3 build.py                      # rigenera l'app
python3 -m http.server 8000           # prova su http://localhost:8000
```

Prima di committare: `python3 build.py` deve terminare senza errori, e i file generati vanno committati insieme ai sorgenti (GitHub Pages serve la radice così com'è).

## Regole

- Lingua italiana, registro chiaro e didattico. Niente emoji.
- Le domande devono essere corrette: una sola opzione giusta, distrattori plausibili, spiegazione breve che dica perché.
- Non cambiare la chiave di localStorage (`it-app-v1`) né il formato dello stato salvato: gli utenti perderebbero i progressi. Gli id delle domande sono `lezione-indice` nell'ordine di `quiz.txt` dopo il sort per sezione: aggiungere domande nuove può spostare gli indici, quindi se cambi il formato degli id fai in modo che le domande già esistenti mantengano un id stabile (per esempio un id esplicito per domanda).

---

## Compito attuale

### 1. Impaginazione delle schede (`buildDeck` in `src/app/app.js`)

Problema: alcuni titoli e frasi introduttive finiscono in fondo a una scheda mentre il contenuto a cui si riferiscono è nella scheda successiva.

Correggi la suddivisione in modo che:
- una scheda **non finisca mai** con un `<h3>`: l'`<h3>` va sempre nella stessa scheda del contenuto che lo segue;
- un paragrafo introduttivo che termina con `:` (o che precede immediatamente un riquadro, una tabella, una formula a blocco o un simulatore) resti nella stessa scheda di ciò che introduce;
- ogni `<h3>` inizi preferibilmente una scheda nuova (è l'inizio di un micro-argomento);
- le schede restino brevi da leggere su telefono (circa 130–170 parole di testo, un riquadro lungo può stare da solo).

### 2. Domande più granulari

Oggi c'è circa una domanda ogni 5–6 schede, ancorata alla fine di una sezione `<h2>`. Vogliamo **una domanda a risposta multipla alla fine di ogni micro-argomento**:
- micro-argomento = ogni sotto-sezione `<h3>`, e ogni sezione `<h2>` senza `<h3>`; dove una sezione lunga contiene più riquadri importanti (definizione, teorema, esempio svolto), anche dopo ciascuno di essi;
- obiettivo indicativo: una domanda ogni 2–3 schede di contenuto;
- estendi il formato di `quiz.txt` per ancorare una domanda dopo una sotto-sezione, per esempio `@3.2` = dopo il secondo `<h3>` della sezione 3 (mantieni compatibile `@3` = fine della sezione 3);
- scrivi le domande nuove per tutte le lezioni da 1 a 25 (le 26–27 sono simulazioni d'esame, non servono), mantenendo quelle esistenti;
- ogni domanda deve verificare la comprensione del micro-argomento appena letto (non dettagli marginali), con 3–4 opzioni e spiegazione.

### 3. Verifica

- `python3 build.py` senza errori.
- Apri l'app in un viewport da telefono (circa 400×850), percorri almeno le lezioni 3, 8, 13 e 19 e controlla: nessun titolo isolato in fondo a una scheda, domande nei punti giusti, nessun errore in console.
- Committa sorgenti e file generati con un messaggio chiaro e fai push su `main`.
