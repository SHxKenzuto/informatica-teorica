"""Build dell'app: genera i file serviti da GitHub Pages (nella radice del repo) a partire da src/.

Uso:  python3 build.py
- src/corso/lessons/NN.html  -> content.js   (testo delle lezioni)
- src/app/quiz.txt           -> quiz.js      (domande a risposta multipla)
- src/corso/*.js, src/app/*  -> copiati nella radice
- sw.js rigenerato con l'elenco dei file e una versione nuova (così l'app installata si aggiorna)
"""
import glob, hashlib, json, os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')


def build_content():
    out = []
    for f in sorted(glob.glob(os.path.join(SRC, 'corso', 'lessons', '*.html'))):
        t = open(f, encoding='utf-8').read()
        m = re.match(r'\s*<!--(\{.*?\})-->\s*', t, re.S)
        if not m:
            raise SystemExit('metadati mancanti in ' + f)
        meta = json.loads(m.group(1))
        meta['html'] = t[m.end():]
        for a, b in [('\\(', '\\)'), ('\\[', '\\]')]:
            if meta['html'].count(a) != meta['html'].count(b):
                raise SystemExit(f'delimitatori KaTeX {a} {b} sbilanciati in {f}')
        out.append(meta)
    open(os.path.join(ROOT, 'content.js'), 'w', encoding='utf-8').write(
        '/* generato da build.py */\nconst LESSON_DATA = ' + json.dumps(out, ensure_ascii=False) + ';\n')
    return len(out)


def build_quiz():
    quiz, cur, q = {}, None, None
    for raw in open(os.path.join(SRC, 'app', 'quiz.txt'), encoding='utf-8'):
        line = raw.rstrip('\n')
        if not line.strip() or line.startswith('# '):
            continue
        m = re.match(r'^## (\d+)$', line)
        if m:
            cur = int(m.group(1)); quiz.setdefault(cur, []); continue
        m = re.match(r'^@(\d+) (.*)$', line)
        if m:
            q = {'s': int(m.group(1)), 'q': m.group(2), 'opts': [], 'correct': None, 'why': ''}
            quiz[cur].append(q); continue
        if line[:2] in ('+ ', '- '):
            if line[0] == '+':
                q['correct'] = len(q['opts'])
            q['opts'].append(line[2:]); continue
        if line.startswith('> '):
            q['why'] = line[2:]; continue
        raise SystemExit('riga non riconosciuta in quiz.txt: ' + line)
    for n, qs in quiz.items():
        qs.sort(key=lambda x: x['s'])  # sort stabile: l'ordine nel file è conservato a parità di sezione
        for x in qs:
            if x['correct'] is None:
                raise SystemExit(f'domanda senza risposta giusta (lezione {n}): {x["q"]}')
    open(os.path.join(ROOT, 'quiz.js'), 'w', encoding='utf-8').write(
        '/* generato da build.py */\nconst QUIZ_DATA = ' + json.dumps(quiz, ensure_ascii=False) + ';\n')
    return sum(len(v) for v in quiz.values())


def copy_sources():
    for f in ['engine.js', 'widgets.js', 'registry.js']:
        shutil.copy(os.path.join(SRC, 'corso', f), ROOT)
    for f in ['index.html', 'app.css', 'app.js']:
        shutil.copy(os.path.join(SRC, 'app', f), ROOT)
    for f in glob.glob(os.path.join(SRC, 'app', 'icons', '*.png')):
        shutil.copy(f, os.path.join(ROOT, 'icons'))


SERVED = ['index.html', 'app.css', 'app.js', 'engine.js', 'widgets.js', 'registry.js', 'content.js', 'quiz.js',
          'manifest.webmanifest']


def build_sw():
    files = SERVED + sorted(os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, 'icons', '*')))
    files += sorted(os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, 'vendor', '**', '*'), recursive=True) if os.path.isfile(p))
    files = [f.replace(os.sep, '/') for f in files]
    h = hashlib.sha1()
    for f in files:
        h.update(open(os.path.join(ROOT, f), 'rb').read())
    version = h.hexdigest()[:10]
    tpl = open(os.path.join(SRC, 'app', 'sw.template.js'), encoding='utf-8').read()
    sw = tpl.replace('__VERSION__', version).replace('__FILES__', json.dumps(['./'] + files))
    open(os.path.join(ROOT, 'sw.js'), 'w', encoding='utf-8').write(sw)
    return version


if __name__ == '__main__':
    n = build_content()
    q = build_quiz()
    copy_sources()
    v = build_sw()
    print(f'{n} lezioni, {q} domande, versione {v}')
