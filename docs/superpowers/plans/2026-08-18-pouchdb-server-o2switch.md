# PouchDB Server sur o2switch — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en service la synchronisation multi-appareils de Babines en hébergeant `express-pouchdb` sur o2switch, sans toucher à la couche de données existante.

**Architecture:** `express-pouchdb` implémente l'API HTTP de CouchDB, donc `startReplication()` fonctionne tel quel. Le serveur Node est monté sur `/db`, même domaine que la SPA, ce qui supprime le CORS et évite tout secret dans le bundle. Seule modification cliente réelle : l'authentification par session, et la résolution d'une URL relative en URL absolue — sans quoi PouchDB créerait une base locale au lieu de répliquer.

**Tech Stack:** Vue 3, Pinia, PouchDB 9 (client) ; Node + Express 4 + express-pouchdb 4.2 (serveur) ; vitest ; prettier (`semi: false`, `singleQuote: true`, `printWidth: 100`).

**Spec:** [docs/superpowers/specs/2026-08-18-pouchdb-server-o2switch-design.md](../specs/2026-08-18-pouchdb-server-o2switch-design.md)

## Global Constraints

- **Le code de la couche de données ne change pas.** `merge.js`, `migrate.js`, `normalize.js`, `exportLibrary.js`, `library.js`, `import.js` ne sont pas touchés. Toute tâche qui croit devoir les modifier doit s'arrêter et le signaler.
- **Les 175 tests existants doivent rester verts** à chaque commit. Vérifier avec `npx vitest run`.
- **Aucun secret dans le dépôt.** Ni mot de passe, ni identifiant, ni URL absolue de production.
- **Tous les textes visibles sont en français**, avec apostrophes typographiques (`’`).
- **Convention d'apostrophes, par contexte et non par fichier** : chaînes visibles et titres de tests en typographique `’` (U+2019) ; commentaires de code (`//`, `/* */`, et dans `<template>`) en droite `'` (U+0027). Vérifier avec `cat -v`, qui rend U+2019 en `M-bM-^@M-^Y`.
- **Les commentaires sont en français** et expliquent *pourquoi*, jamais *quoi*.
- Prettier : pas de point-virgule, guillemets simples, 100 colonnes. Formater **uniquement les fichiers touchés** (`npx prettier --write <fichier>`) : `npm run format` reformate une vingtaine de fichiers sans rapport.
- Lint : vérifier avec `rtk proxy "npx eslint src/"` — la sortie de `npx eslint` est filtrée dans cet environnement et un résultat vide peut induire en erreur. Attendu : code 0, aucune sortie.

## État du dépôt

- Branche `new-bdd`, partie de `master` à `06b0f13`.
- Suite verte : 175 tests.
- `VITE_COUCHDB_URL` est **vide** dans `.env` : l'application tourne en local pur, `syncStatus` vaut `local-only`.

## Structure des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `src/services/db.js` | + `resolveRemoteUrl()`, utilisée par `startReplication()` | 1 |
| `src/services/__tests__/db.test.js` | Tests de la résolution d'URL | 1 |
| `server/app.js` | **Nouveau.** express + express-pouchdb, point d'entrée Passenger | 2 |
| `server/package.json` | **Nouveau.** Dépendances du serveur, isolées de la SPA | 2 |
| `server/.gitignore` | **Nouveau.** Exclut `node_modules/` et les données LevelDB | 2 |
| `server/README.md` | **Nouveau.** Procédure cPanel et création de l'administrateur | 2 |
| `vite.config.js` | + proxy `/db` en développement | 3 |
| `.env.example` | `VITE_COUCHDB_URL=/db` | 3 |
| `src/services/session.js` | **Nouveau.** Connexion, déconnexion, état de session | 4 |
| `src/services/__tests__/session.test.js` | **Nouveau.** Tests de la session | 4 |
| `src/components/LoginPanel.vue` | **Nouveau.** Écran de connexion | 4 |
| `src/main.js` | La réplication démarre après la session | 4 |
| `src/stores/library.js` | + `startReplication`, injectée au démarrage | 4 |
| `src/views/LibraryView.vue` | Monte `LoginPanel` à côté de `SyncIndicator` | 4 |
| `package.json` | + `pouchdb-authentication` | 4 |

Note sur `src/stores/library.js` : la contrainte globale dit que la couche de données n'est pas
touchée. L'ajout ici est une **référence de fonction dans l'état du store**, pas une modification de
sa logique — c'est ce qui permet à l'écran de connexion de relancer la réplication sans que les
composants connaissent PouchDB.

---

### Task 1: Résoudre l'URL relative en URL absolue

**Files:**
- Modify: `src/services/db.js` (ajouter avant `startReplication`, ligne 43)
- Test: `src/services/__tests__/db.test.js` (ajouter à la fin)

**Interfaces:**
- Consumes: rien.
- Produces: `resolveRemoteUrl(url, origin) → string`. Utilisée par `startReplication` dans la même tâche ; aucune tâche ultérieure ne l'appelle directement.

**Pourquoi cette tâche existe — à lire avant d'écrire**

PouchDB choisit son adaptateur d'après la **forme du nom** qu'on lui passe. Vérifié empiriquement sur la version du projet :

```
"/db/babines"               → adapter: leveldb   ← une base LOCALE
"http://babines.test/db/x"  → adapter: http
"https://babines.test/db/x" → adapter: https
```

Passer `/db` tel quel ne produirait aucune erreur : PouchDB créerait une **seconde base locale** et y répliquerait la première. L'indicateur afficherait « à jour » et rien n'atteindrait le serveur. C'est une panne silencieuse — pas de message, pas de donnée manquante à l'écran — qu'on ne découvrirait qu'en ouvrant l'application sur un autre appareil.

Ce test est le plus important de cette transition. Sans lui, la panne peut réapparaître à la première refactorisation.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter `resolveRemoteUrl` à l'import en tête de `src/services/__tests__/db.test.js`. Cet import est aujourd'hui, sur plusieurs lignes :

```js
import {
  createDb,
  ensureIndexes,
  classifyReplicationError,
  startReplication,
} from '@/services/db.js'
```

Ajouter `resolveRemoteUrl` à cette liste. Puis ajouter en fin de fichier :

```js
describe('resolveRemoteUrl', () => {
  const ORIGINE = 'https://babines.test'

  it('rend absolue une URL relative, en la rattachant à l’origine', () => {
    expect(resolveRemoteUrl('/db', ORIGINE)).toBe('https://babines.test/db')
  })

  it('laisse intacte une URL déjà absolue', () => {
    expect(resolveRemoteUrl('https://ailleurs.test/db', ORIGINE)).toBe('https://ailleurs.test/db')
    expect(resolveRemoteUrl('http://ailleurs.test/db', ORIGINE)).toBe('http://ailleurs.test/db')
  })

  it('produit une URL que PouchDB traite comme distante, non comme une base locale', () => {
    // C'est l'assertion qui compte. PouchDB choisit son adaptateur d'apres la
    // forme du nom : un chemin relatif donne « leveldb », donc une base LOCALE,
    // et la replication devient un aller-retour entre deux bases du navigateur
    // sans que rien ne le signale.
    //
    // Le cas relatif n'est volontairement PAS instancie ici : l'adaptateur
    // leveldb tenterait de creer /db a la racine du systeme de fichiers et
    // ferait echouer le test par « OpenError: /db/babines/LOCK ».
    const distante = new PouchDB(`${resolveRemoteUrl('/db', ORIGINE)}/babines`)
    expect(distante.adapter).toBe('https')
  })
})
```

Deux notes, toutes deux vérifiées empiriquement sur ce dépôt :

- `PouchDB` est déjà importé en tête de ce fichier de tests, avec l'adaptateur mémoire.
- **Le nom d'adaptateur suit le protocole** : `https` pour une URL en `https://`, `http` pour `http://`. C'est pourquoi l'assertion attend `'https'` et non `'http'` — `ORIGINE` est en `https`.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/services/__tests__/db.test.js`
Expected: FAIL — `resolveRemoteUrl is not a function` sur les trois tests.

- [ ] **Step 3: Écrire l'implémentation minimale**

Dans `src/services/db.js`, juste avant `startReplication` :

```js
/**
 * Rend absolue une URL de réplication relative.
 *
 * PouchDB choisit son adaptateur d'apres la forme du nom : tout ce qui ne
 * commence pas par http(s) devient une base LOCALE. Passer « /db » creerait
 * donc une seconde base locale et y repliquerait la premiere, sans erreur et
 * sans que l'indicateur de synchronisation s'en apercoive.
 */
export function resolveRemoteUrl(url, origin = globalThis.location?.origin ?? '') {
  return /^https?:/i.test(url) ? url : new URL(url, origin).href
}
```

Puis, dans `startReplication`, remplacer la ligne qui construit la base distante :

```js
  const remote = new PouchDB(`${resolveRemoteUrl(url).replace(/\/+$/, '')}/${dbName}`)
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/services/__tests__/db.test.js`
Expected: PASS, tous les tests du fichier — dont celui qui vérifiait déjà que `url: ''` renvoie `local-only` sans répliquer.

- [ ] **Step 5: Vérifier la suite entière**

Run: `npx vitest run`
Expected: PASS, 178 tests (175 + 3), 0 échec.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/services/db.js src/services/__tests__/db.test.js
git add src/services/db.js src/services/__tests__/db.test.js
git commit -m "fix: rendre absolue l'URL de réplication relative"
```

---

### Task 2: Le serveur express-pouchdb

**Files:**
- Create: `server/app.js`
- Create: `server/package.json`
- Create: `server/.gitignore`
- Create: `server/README.md`

**Interfaces:**
- Consumes: rien du code client.
- Produces: un serveur HTTP exposant l'API CouchDB sous `/`. La tâche 3 le joint via le proxy Vite ; la tâche 4 y active l'authentification.

**Notes de conception à respecter**

Le serveur a son **propre** `package.json` : cPanel installe les dépendances depuis le répertoire de l'application, et l'arbre du serveur (Express 4, `pouchdb-find@^7`) ne doit pas polluer celui de la SPA (PouchDB 9). Les deux vivent dans des processus distincts ; la réplication se fait au niveau du protocole HTTP CouchDB, stable entre ces versions.

Le port vient de `process.env.PORT` : Passenger l'impose. Le repli sur 5984 sert au développement local.

Les données LevelDB vivent dans un répertoire configurable, hors du dépôt.

**Cette tâche n'a pas de test automatisé** : elle assemble une bibliothèque tierce. Sa vérification est une suite de commandes à l'étape 4, dont la dernière — arrêter puis relancer le serveur et retrouver le document — est celle qui prouve la persistance.

- [ ] **Step 1: Créer `server/package.json`**

```json
{
  "name": "babines-server",
  "version": "1.0.0",
  "private": true,
  "description": "API CouchDB pour la synchronisation de Babines, via express-pouchdb",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "express-pouchdb": "^4.2.0",
    "pouchdb": "^9.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Créer `server/.gitignore`**

```gitignore
node_modules/
data/
config.json
```

`data/` contient les fichiers LevelDB, `config.json` la configuration qu'express-pouchdb persiste — dont les identifiants d'administrateur. Ni l'un ni l'autre n'entre dans le dépôt.

- [ ] **Step 3: Créer `server/app.js`**

```js
const path = require('path')
const express = require('express')
const PouchDB = require('pouchdb')
const expressPouchDB = require('express-pouchdb')

// Passenger impose le port ; 5984 est celui de CouchDB, pratique en local.
const PORT = process.env.PORT || 5984

// Les fichiers LevelDB vivent hors du depot. DATA_DIR permet de les placer
// ailleurs que dans le repertoire de l'application sur l'hebergement.
const DATA_DIR = process.env.BABINES_DATA_DIR || path.join(__dirname, 'data')

const BabinesPouch = PouchDB.defaults({ prefix: `${DATA_DIR}${path.sep}` })

const app = express()

// express-pouchdb persiste sa configuration — dont l'administrateur — dans ce
// fichier. Le placer avec les donnees le garde hors du depot.
app.use(
  '/',
  expressPouchDB(BabinesPouch, {
    configPath: path.join(DATA_DIR, 'config.json'),
  }),
)

app.listen(PORT, () => {
  console.log(`Babines server sur le port ${PORT}, données dans ${DATA_DIR}`)
})
```

- [ ] **Step 4: Vérifier que le serveur tourne et persiste**

Ces commandes se lancent depuis `server/`. Chacune a une sortie attendue précise ; si l'une diverge, s'arrêter et le signaler plutôt que de continuer.

```bash
cd server && npm install
```

Puis, dans un terminal :

```bash
node app.js
```

Attendu : `Babines server sur le port 5984, données dans …/server/data`

Dans un autre terminal — création de la base, écriture, relecture :

```bash
curl -s -X PUT http://127.0.0.1:5984/babines
```
Attendu : `{"ok":true}`

```bash
curl -s -X PUT http://127.0.0.1:5984/babines/test:1 -H 'Content-Type: application/json' -d '{"hello":"babines"}'
```
Attendu : un JSON contenant `"ok":true` et un `"rev"` commençant par `1-`

```bash
curl -s http://127.0.0.1:5984/babines/test:1
```
Attendu : le document, avec `"hello":"babines"`

**Le test qui compte** — arrêter le serveur (Ctrl-C), le relancer, puis :

```bash
curl -s http://127.0.0.1:5984/babines/test:1
```
Attendu : le même document. S'il a disparu, la persistance ne fonctionne pas et il faut le signaler immédiatement : toute la suite du plan en dépend.

Enfin, nettoyer le document d'essai :

```bash
curl -s -X DELETE "http://127.0.0.1:5984/babines/test:1?rev=$(curl -s http://127.0.0.1:5984/babines/test:1 | sed -E 's/.*"_rev":"([^"]+)".*/\1/')"
```

- [ ] **Step 5: Créer `server/README.md`**

```markdown
# Serveur de synchronisation Babines

`express-pouchdb` expose l'API HTTP de CouchDB. Le client PouchDB de Babines
réplique dessus sans code spécifique.

## En local

    cd server
    npm install
    node app.js

Le serveur écoute sur 5984. Les données vont dans `server/data/`, exclu du dépôt.

## Sur o2switch

1. cPanel → **Setup Node.js App** → *Create Application*
2. Version de Node : 20 ou plus
3. *Application root* : le répertoire où sont déposés les fichiers de `server/`
4. *Application URL* : `/db` sur le domaine qui sert la SPA — la même origine
   supprime le CORS et évite tout secret dans le bundle
5. *Application startup file* : `app.js`
6. Cliquer **Run NPM Install**
7. Variable d'environnement `BABINES_DATA_DIR` : un chemin **hors de
   `public_html`**, par exemple `/home/bane2718/babines-data`

### Point de vigilance

LevelDB prend un verrou exclusif sur ses fichiers. Si Passenger lance plusieurs
processus, le second échouera à ouvrir la base ou la corrompra. Vérifier que
l'application est configurée en un seul processus.

### Sauvegardes

Les fichiers LevelDB vivent dans `BABINES_DATA_DIR` et ne sont sauvegardés par
personne. L'export JSON de l'application fait office de sauvegarde manuelle.
```

- [ ] **Step 6: Vérifier que rien du client n'est cassé**

Run: `npx vitest run`
Expected: PASS, 178 tests, 0 échec. Cette tâche ne touche pas `src/`, l'étape confirme seulement qu'aucun fichier n'a été modifié par erreur.

- [ ] **Step 7: Commit**

```bash
git add server/
git commit -m "feat: ajouter le serveur de synchronisation express-pouchdb"
```

---

### Task 3: Brancher la SPA sur le serveur en développement

**Files:**
- Modify: `vite.config.js` (ajouter un bloc `server` dans l'objet passé à `defineConfig`)
- Modify: `.env.example`

**Interfaces:**
- Consumes: `resolveRemoteUrl` (tâche 1), le serveur de la tâche 2.
- Produces: une application de développement qui réplique réellement. La tâche 4 ajoute l'authentification par-dessus.

**Notes de conception à respecter**

Le proxy fait de `/db` une URL de **même origine** en développement, comme elle le sera en production. Sans lui, `localhost:5180` appelant `127.0.0.1:5984` serait une origine différente : il faudrait des en-têtes CORS et, plus tard, un cookie tiers.

`.env.example` est versionné et sert de gabarit ; `.env` ne l'est pas. La valeur `/db` n'est pas un secret — c'est justement l'intérêt de la même origine.

- [ ] **Step 1: Ajouter le proxy dans `vite.config.js`**

Dans l'objet passé à `defineConfig`, au même niveau que `plugins`, ajouter :

```js
  server: {
    proxy: {
      // Fait de /db une URL de meme origine en developpement, comme elle le
      // sera en production. Sans ca, il faudrait des en-tetes CORS puis un
      // cookie tiers pour la session.
      '/db': {
        target: process.env.BABINES_SERVER_URL || 'http://127.0.0.1:5984',
        changeOrigin: true,
        rewrite: (chemin) => chemin.replace(/^\/db/, ''),
      },
    },
  },
```

- [ ] **Step 2: Mettre `.env.example` à jour**

Remplacer la ligne `VITE_COUCHDB_URL=` par :

```
# Chemin relatif : l'API vit sur le même domaine que le site, ce qui évite le
# CORS et n'expose aucun secret dans le bundle. Laisser vide pour rester en
# local pur, sans synchronisation.
VITE_COUCHDB_URL=/db
```

- [ ] **Step 3: Vérifier la réplication de bout en bout**

Le serveur de la tâche 2 doit tourner (`cd server && node app.js`).

Dans `.env`, renseigner `VITE_COUCHDB_URL=/db`, puis lancer le serveur de développement et ouvrir l'application.

À vérifier, dans l'ordre :

1. L'indicateur de synchronisation n'affiche plus « local uniquement » mais « à jour » ou « synchronisation… ».
2. Aucune erreur dans la console du navigateur.
3. Le serveur a bien reçu les documents :

```bash
curl -s http://127.0.0.1:5984/babines | sed -E 's/.*"doc_count":([0-9]+).*/documents sur le serveur : \1/'
```
Attendu : un nombre égal au nombre d'entrées de la bibliothèque.

4. **La preuve que ce n'est pas une base locale** — ajouter une entrée par la capture rapide, puis :

```bash
curl -s http://127.0.0.1:5984/babines/_all_docs | grep -c '"id"'
```
Attendu : le compte a augmenté. S'il n'a pas bougé alors que l'indicateur dit « à jour », c'est exactement la panne silencieuse que la tâche 1 devait empêcher — s'arrêter et le signaler.

- [ ] **Step 4: Vérifier la suite et le lint**

Run: `npx vitest run`
Expected: PASS, 178 tests, 0 échec.

Run: `rtk proxy "npx eslint src/"`
Expected: code 0, aucune sortie.

- [ ] **Step 5: Commit**

```bash
npx prettier --write vite.config.js
git add vite.config.js .env.example
git commit -m "feat: joindre le serveur de synchronisation en développement"
```

---

### Task 4: Authentification par session

**Files:**
- Create: `src/services/session.js`
- Create: `src/components/LoginPanel.vue`
- Create: `src/services/__tests__/session.test.js`
- Modify: `server/app.js`
- Modify: `src/main.js` (bloc `startReplication`, lignes 46-56)
- Modify: `package.json` (dépendance `pouchdb-authentication`)
- Modify: `src/views/LibraryView.vue` (monter `LoginPanel` à côté de `SyncIndicator`)

**Interfaces:**
- Consumes: `startReplication` et `resolveRemoteUrl` (tâche 1), le serveur (tâche 2), le proxy (tâche 3).
- Produces: `openSession({ name, password })`, `closeSession()`, `currentSession()` depuis `src/services/session.js`.

**Notes de conception à respecter**

**Le hors-ligne n'est pas conditionné à la session.** L'application charge la bibliothèque locale et fonctionne immédiatement ; seule la réplication attend une session. Une entrée capturée sans être connecté n'est pas perdue : elle partira à la prochaine session.

**Reprise de l'existant plutôt qu'ajout :** `classifyReplicationError` traite déjà 401 et 403 comme `auth-error`, et `syncLabel` en donne déjà le libellé « erreur d'authentification ». Aucun état de synchronisation nouveau n'est introduit.

Le texte de `SyncIndicator.vue` dit aujourd'hui « vérifiez les identifiants CouchDB ». Il reste juste : c'est bien une API CouchDB. Ne pas le modifier.

**Une incertitude à lever à l'étape 3**, honnêtement signalée : la façon exacte d'exiger une session dans `express-pouchdb` n'a pas été vérifiée à l'écriture de ce plan. L'étape donne la configuration attendue **et** la commande qui la vérifie. Si la vérification échoue, s'arrêter et le signaler plutôt que de chercher au hasard.

- [ ] **Step 1: Installer la dépendance cliente**

```bash
npm install pouchdb-authentication
```

- [ ] **Step 2: Écrire les tests qui échouent**

Créer `src/services/__tests__/session.test.js` :

```js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { openSession, closeSession, currentSession } from '@/services/session.js'

const jsonResponse = (body, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
})

beforeEach(() => {
  closeSession()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('openSession', () => {
  it('poste les identifiants sur _session et retient le nom', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, name: 'nelly' }))
    vi.stubGlobal('fetch', fetchMock)

    const session = await openSession({ name: 'nelly', password: 'secret' })

    expect(session).toEqual({ name: 'nelly' })
    expect(currentSession()).toEqual({ name: 'nelly' })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/db/_session')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ name: 'nelly', password: 'secret' })
  })

  it('lève sur des identifiants refusés, sans ouvrir de session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401)))

    await expect(openSession({ name: 'nelly', password: 'faux' })).rejects.toThrow(
      /identifiants/i,
    )
    expect(currentSession()).toBeNull()
  })

  it('lève un message lisible quand le réseau est indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

    await expect(openSession({ name: 'nelly', password: 'secret' })).rejects.toThrow(
      /Failed to fetch/,
    )
    expect(currentSession()).toBeNull()
  })
})

describe('closeSession', () => {
  it('supprime la session côté serveur et localement', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, name: 'nelly' })))
    await openSession({ name: 'nelly', password: 'secret' })

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await closeSession()

    expect(currentSession()).toBeNull()
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('oublie la session locale même si le serveur ne répond pas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true, name: 'nelly' })))
    await openSession({ name: 'nelly', password: 'secret' })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))

    // Ne pas pouvoir joindre le serveur ne doit pas laisser l'utilisateur
    // coince dans un etat « connecte » qu'il ne peut plus quitter.
    await closeSession()
    expect(currentSession()).toBeNull()
  })
})
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/services/__tests__/session.test.js`
Expected: FAIL — le module `@/services/session.js` n'existe pas.

- [ ] **Step 4: Écrire `src/services/session.js`**

```js
import { resolveRemoteUrl } from '@/services/db.js'

/**
 * Session CouchDB, telle qu'express-pouchdb l'expose.
 *
 * Le cookie est pose par le serveur en HttpOnly : le JavaScript ne le voit
 * jamais. On ne retient donc ici que le nom, pour savoir s'il faut afficher
 * l'ecran de connexion — la preuve d'authentification, elle, vit dans le
 * cookie et voyage seule.
 */
let session = null

const base = () => `${resolveRemoteUrl(import.meta.env.VITE_COUCHDB_URL || '/db')}/_session`

export function currentSession() {
  return session
}

export async function openSession({ name, password }) {
  const response = await fetch(base(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  })

  if (!response.ok) {
    // 401 est le cas courant ; tout autre code merite d'etre montre tel quel,
    // parce qu'il ne se corrige pas en retapant le mot de passe.
    if (response.status === 401) throw new Error('Identifiants refusés.')
    throw new Error(`Connexion impossible : réponse ${response.status} du serveur.`)
  }

  session = { name }
  return session
}

export async function closeSession() {
  const ouverte = session
  // On oublie la session avant l'appel : ne pas pouvoir joindre le serveur ne
  // doit pas laisser l'utilisateur coince dans un etat qu'il ne peut plus
  // quitter.
  session = null
  if (!ouverte) return
  try {
    await fetch(base(), { method: 'DELETE' })
  } catch {
    // Le cookie expirera de lui-meme ; rien a dire a l'utilisateur.
  }
}
```

Note : `openSession` ne rattrape pas les erreurs réseau — le test attend que `Failed to fetch` remonte tel quel, parce que c'est un message que l'écran de connexion doit pouvoir afficher.

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/services/__tests__/session.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 6: Exiger une session côté serveur**

Dans `server/app.js`, remplacer le bloc `app.use('/', …)` par :

```js
app.use(
  '/',
  expressPouchDB(BabinesPouch, {
    configPath: path.join(DATA_DIR, 'config.json'),
    overrideMode: { include: ['routes/authentication', 'routes/authorization'] },
  }),
)
```

Puis créer l'administrateur — **une seule fois**, avec un mot de passe long généré aléatoirement, jamais versionné :

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Serveur lancé, remplacer `<NOM>` et `<MOTDEPASSE>` :

```bash
curl -s -X PUT http://127.0.0.1:5984/_config/admins/<NOM> -H 'Content-Type: application/json' -d '"<MOTDEPASSE>"'
```

**La vérification qui tranche** — sans session, la base doit refuser :

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5984/babines/_all_docs
```
Attendu : `401`

Si la réponse est `200`, la configuration n'exige pas de session. **S'arrêter et le signaler** : la façon exacte de l'exiger dans `express-pouchdb` n'a pas été vérifiée à l'écriture de ce plan, et chercher au hasard ferait plus de mal que de bien.

Avec session, elle doit accepter :

```bash
curl -s -c /tmp/babines-cookie -X POST http://127.0.0.1:5984/_session \
  -H 'Content-Type: application/json' -d '{"name":"<NOM>","password":"<MOTDEPASSE>"}'
curl -s -b /tmp/babines-cookie -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5984/babines/_all_docs
```
Attendu : `200`

- [ ] **Step 7: Créer `src/components/LoginPanel.vue`**

```vue
<script setup>
import { ref } from 'vue'
import { openSession } from '@/services/session.js'

const emit = defineEmits(['connecte'])

const name = ref('')
const password = ref('')
const enCours = ref(false)
const message = ref('')

async function connecter() {
  enCours.value = true
  message.value = ''
  try {
    const session = await openSession({ name: name.value, password: password.value })
    // Le mot de passe ne survit pas a la connexion : le cookie porte desormais
    // la preuve, le garder en memoire n'apporterait rien.
    password.value = ''
    emit('connecte', session)
  } catch (err) {
    message.value = err.message
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <form class="login" @submit.prevent="connecter">
    <h2 class="title">Se connecter pour synchroniser</h2>
    <p class="explication">
      La bibliothèque fonctionne sans connexion. Se connecter la synchronise entre vos appareils.
    </p>
    <label>Nom <input v-model="name" type="text" autocomplete="username" /></label>
    <label>
      Mot de passe
      <input v-model="password" type="password" autocomplete="current-password" />
    </label>
    <button type="submit" :disabled="enCours || !name || !password">
      {{ enCours ? 'Connexion…' : 'Se connecter' }}
    </button>
    <p v-if="message" class="feedback" role="status">{{ message }}</p>
  </form>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  gap: 0.8em;
  padding: 1em;
  margin: 1em 0;
  background: var(--surface);
  border: 1px solid var(--trait);
}

.title {
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--encre);
}

.explication {
  margin: 0;
  font-size: 0.9em;
  color: var(--encre-douce);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
  font-size: 0.9em;
  color: var(--encre-douce);
}

input {
  padding: 0.8em;
  border: 1px solid var(--trait);
  background: var(--surface-douce);
  font-family: 'DM Sans', sans-serif;
  font-size: 1em;
  color: var(--encre);
}

button {
  align-self: flex-start;
  padding: 0.6em 1.2em;
  background-color: var(--jaune);
  border: 1px solid var(--trait);
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 1em;
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

.feedback {
  margin: 0;
  font-size: 0.9em;
  color: var(--alerte);
}
</style>
```

- [ ] **Step 8: Câbler le démarrage dans `src/main.js`**

Remplacer l'appel à `startReplication` (lignes 46-56) par une fonction réutilisable, appelée au démarrage si une session existe déjà et après connexion. Ajouter l'import `import { currentSession } from '@/services/session.js'` en tête, puis :

```js
  // La replication attend une session ; le hors-ligne, lui, n'attend rien.
  // Une entree capturee sans etre connecte partira a la prochaine session.
  const repliquer = () =>
    startReplication(db, {
      url: import.meta.env.VITE_COUCHDB_URL,
      dbName: import.meta.env.VITE_COUCHDB_DB || 'babines',
      onStatus: (status) => {
        const previous = library.syncStatus
        library.syncStatus = status
        // Les modifications arrivées d'un autre appareil sont visibles dès la fin d'un cycle.
        if (status === 'idle' && previous === 'pending') library.load()
      },
    })

  library.startReplication = repliquer
  if (currentSession()) repliquer()
```

Ajouter dans l'état du store `src/stores/library.js`, à côté de `syncStatus: 'local-only'` :

```js
    // Injectee au demarrage : l'ecran de connexion doit pouvoir lancer la
    // replication sans que les composants connaissent PouchDB.
    startReplication: null,
```

- [ ] **Step 9: Monter l'écran dans `src/views/LibraryView.vue`**

**Pas dans `App.vue`.** L'écran de connexion relève de la même préoccupation que l'indicateur de synchronisation, et `SyncIndicator` est monté dans les vues (`LibraryView.vue:39`, `ImportView.vue:13`), pas à la racine. Le mettre dans `App.vue` le ferait apparaître au-dessus de chaque écran, y compris la fiche d'une entrée, sans le cadre de la page.

Dans `src/views/LibraryView.vue`, ajouter deux imports après celui de `SyncIndicator` (ligne 11) :

```js
import LoginPanel from '@/components/LoginPanel.vue'
import { currentSession } from '@/services/session.js'
```

Ajouter `ref` à l'import de `vue` en ligne 2, qui devient :

```js
import { onMounted, onUnmounted, ref } from 'vue'
```

Puis, après `const imports = useImportStore()` :

```js
const session = ref(currentSession())

function connecte(ouverte) {
  session.value = ouverte
  library.startReplication?.()
}
```

Dans le template, juste après `<SyncIndicator />` :

```vue
    <LoginPanel v-if="!session && VITE_COUCHDB_URL" @connecte="connecte" />
```

Et exposer la variable d'environnement au template, `import.meta` n'y étant pas accessible — à ajouter dans le `<script setup>` :

```js
// import.meta n'est pas accessible depuis le template : sans URL de
// synchronisation, l'application est en local pur et proposer une connexion
// n'aurait aucun sens.
const VITE_COUCHDB_URL = import.meta.env.VITE_COUCHDB_URL
```

- [ ] **Step 10: Vérifier la suite et le lint**

Run: `npx vitest run`
Expected: PASS, 183 tests (178 + 5), 0 échec.

Run: `rtk proxy "npx eslint src/"`
Expected: code 0, aucune sortie.

- [ ] **Step 11: Vérifier le parcours dans le navigateur**

Serveur lancé et administrateur créé, ouvrir l'application.

1. L'écran de connexion apparaît, et **la bibliothèque est utilisable sans se connecter** — capturer une entrée doit fonctionner.
2. L'indicateur affiche « local uniquement » ou « erreur d'authentification », pas « à jour ».
3. Se connecter avec de mauvais identifiants : « Identifiants refusés. », l'écran reste.
4. Se connecter correctement : l'écran disparaît, l'indicateur passe à « synchronisation… » puis « à jour ».
5. Vérifier que l'entrée capturée avant connexion est bien arrivée :

```bash
curl -s -b /tmp/babines-cookie http://127.0.0.1:5984/babines/_all_docs | grep -c '"id"'
```
Attendu : elle est comptée.

6. Recharger la page : la session du cookie survit, l'écran ne réapparaît pas.

- [ ] **Step 12: Commit**

```bash
npx prettier --write src/services/session.js src/components/LoginPanel.vue src/main.js src/views/LibraryView.vue src/stores/library.js src/services/__tests__/session.test.js
git add server/app.js src/services/session.js src/components/LoginPanel.vue src/services/__tests__/session.test.js src/main.js src/views/LibraryView.vue src/stores/library.js package.json package-lock.json
git commit -m "feat: authentifier la synchronisation par session"
```

---

## Reste à faire hors de ce plan

- **Déployer sur o2switch.** Il n'existe aucun moyen automatique d'envoyer quoi que ce soit : `o2switch.yml` a été supprimé (`7ac1bbc`) et sa clé SSH n'a jamais été autorisée côté cPanel. Le serveur Node se dépose une fois à la main ; la SPA, elle, se redéploie à chaque changement et mériterait le rétablissement du workflow.
- **Valider les trois hypothèses du §7 de la spec** au premier déploiement réel : le verrou exclusif de LevelDB face au modèle de processus de Passenger, la mise en veille des applications inactives, et la responsabilité des sauvegardes.
- **Décider du sort de `YT_Babines_addItems.json`**, dont l'export corrigé cohabite avec la version périmée.
