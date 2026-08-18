# Recherche YouTube depuis une entrée — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depuis une entrée déjà en bibliothèque, proposer six vidéos YouTube candidates, en laisser choisir une, et l'ajouter à une playlist YouTube choisie au moment de l'envoi — sans jamais écrire dans PouchDB.

**Architecture:** Tout le chemin réseau vit dans le store Pinia existant `src/stores/import.js`, dont la constante `ENDPOINTS` reste l'unique endroit du client qui connaît les chemins des webhooks n8n. Un adaptateur de plus dans `src/services/normalize.js` traduit la réponse de recherche YouTube. Un composant `YoutubeMatch.vue` porte l'interface, monté dans la fiche d'entrée.

**Tech Stack:** Vue 3 (`<script setup>`), Pinia (option stores), PouchDB (non sollicité ici), vitest, prettier (`semi: false`, `singleQuote: true`, `printWidth: 100`).

**Spec:** [docs/superpowers/specs/2026-08-18-recherche-youtube-depuis-entree-design.md](../specs/2026-08-18-recherche-youtube-depuis-entree-design.md)

## Global Constraints

- **Aucune écriture PouchDB dans ce flux.** Aucune tâche n'appelle `db.put`, `db.remove`, ni une action de `library.js` qui écrit. La tâche 4 installe un test qui le vérifie mécaniquement.
- **Pas d'appel à l'API Spotify.** La requête de recherche est formée depuis `entry.artist` et `entry.title`, déjà en base.
- **Tous les textes visibles sont en français**, avec apostrophes typographiques (`’`) comme dans le code existant.
- **Les commentaires de code sont en français** et expliquent *pourquoi*, jamais *quoi* — c'est la convention constante de ce dépôt.
- **Aucune signature exportée existante ne change.** `fetchJson` gagne un second paramètre optionnel ; ses six appels actuels restent inchangés.
- **`ENDPOINTS` reste le seul endroit qui connaît les chemins n8n** (voir son commentaire à `src/stores/import.js:24`).
- **Prettier :** pas de point-virgule, guillemets simples, 100 colonnes. Lancer `npm run format` avant chaque commit si besoin.
- **Le lancement des tests** se fait avec `npx vitest run <chemin>` pour un fichier, `npx vitest run` pour tout.

## État du dépôt au moment d'écrire ce plan

- La suite est verte : 154 tests passent.
- `src/assets/arrow_swap.svg` existe mais n'est **pas encore suivi par git** — il est ajouté au dépôt par le commit de la tâche 5.
- `docs/n8n/SPOTIFY_Babines_search.json` est non suivi et **n'est pas utilisé par ce flux** (voir §8 de la spec). Ce plan ne le commite pas et ne le supprime pas.
- Une version antérieure de tests de « recherche inversée » a été retirée du répertoire de travail sur décision explicite. Copie conservée hors dépôt dans le scratchpad de session (`normalize.test.js.avec-recherche-inversee`, `recherche-inversee.patch`). Ne pas les réintroduire : ils décrivent un design écarté (appel Spotify, bidirectionnalité, rattachement d'une provenance à l'entrée).

## Structure des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `src/services/normalize.js` | + `fromYoutubeSearchResults(payload)` : réponse du webhook → liste de candidats affichables | 1 |
| `src/services/__tests__/normalize.test.js` | Tests de l'adaptateur | 1 |
| `src/stores/import.js` | + 2 entrées dans `ENDPOINTS.youtube`, `fetchJson` accepte un POST, + 3 actions | 2, 3, 4 |
| `src/stores/__tests__/import.test.js` | Tests des trois actions + test de non-écriture | 2, 3, 4 |
| `src/components/YoutubeMatch.vue` | **Nouveau.** Bouton, grille des six vignettes, sélecteur de playlist, envoi | 5 |
| `src/components/EntryDetail.vue` | Monte `<YoutubeMatch>` sous condition | 5 |
| `src/assets/arrow_swap.svg` | Icône du bouton (existe, à ajouter à git) | 5 |

Écart assumé avec la spec : elle nomme l'adaptateur `fromYoutubeSearchResult` (singulier, un élément). Ce plan l'écrit **`fromYoutubeSearchResults`** (pluriel, la charge entière), parce que l'enveloppe `[{ items: [...] }]` que produit le nœud n8n ne peut être défaite qu'à l'échelle de la liste — un adaptateur par élément ne verrait jamais l'enveloppe qu'il est censé tolérer.

---

### Task 1: Adaptateur de la réponse de recherche YouTube

**Files:**
- Modify: `src/services/normalize.js` (ajouter après `fromYoutubeItem`, avant le bloc Deezer — soit vers la ligne 240)
- Test: `src/services/__tests__/normalize.test.js` (ajouter à la fin du fichier)

**Interfaces:**
- Consumes: rien.
- Produces: `fromYoutubeSearchResults(payload) → Array<{ videoId: string, title: string, channel: string, thumbnail: string, url: string, publishedAt: string|null }>`. La tâche 2 l'appelle depuis `searchVideos`. La tâche 5 lit `videoId`, `title`, `channel`, `thumbnail`.

**Notes de conception à respecter**

Le titre reste **brut**, sans passer par `splitYoutubeTitle` : on choisit une vidéo, et c'est précisément le titre complet (« Official Video », nom de la chaîne, mentions de live) qui permet de distinguer les six candidats l'un de l'autre. Le découper ici reviendrait à masquer l'information sur laquelle porte le choix.

La fonction reste **hors de `ADAPTERS`** (`src/services/normalize.js:263`) : cette table alimente `toTrackDoc`, donc PouchDB, et un candidat n'est jamais destiné à devenir un document.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter en fin de `src/services/__tests__/normalize.test.js`, et ajouter `fromYoutubeSearchResults` à l'import en tête du fichier (qui est aujourd'hui `import { matchKey, stripNoise } from '@/services/normalize.js'`) :

```js
describe('fromYoutubeSearchResults', () => {
  const ITEM = {
    id: { videoId: 'UBS4Gi1y_nc' },
    snippet: {
      title: 'Aphex Twin - Windowlicker (Official Video)',
      channelTitle: 'Warp Records',
      publishedAt: '2009-10-27T12:00:00Z',
      thumbnails: { medium: { url: 'https://i.ytimg.com/vi/UBS4Gi1y_nc/mqdefault.jpg' } },
    },
  }

  const CANDIDAT = {
    videoId: 'UBS4Gi1y_nc',
    title: 'Aphex Twin - Windowlicker (Official Video)',
    channel: 'Warp Records',
    thumbnail: 'https://i.ytimg.com/vi/UBS4Gi1y_nc/mqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=UBS4Gi1y_nc',
    publishedAt: '2009-10-27T12:00:00Z',
  }

  it('lit la forme brute de l’API YouTube', () => {
    expect(fromYoutubeSearchResults({ items: [ITEM] })).toEqual([CANDIDAT])
  })

  it('défait l’enveloppe que produit le nœud n8n', () => {
    // Le workflow searchvideos affecte `items` puis répond `allIncomingItems` :
    // le client reçoit `[{ items: [...] }]`, pas `{ items: [...] }`.
    expect(fromYoutubeSearchResults([{ items: [ITEM] }])).toEqual([CANDIDAT])
  })

  it('accepte un videoId déjà aplati par un « Edit Fields »', () => {
    const aplati = { videoId: 'UBS4Gi1y_nc', snippet: ITEM.snippet }
    expect(fromYoutubeSearchResults({ items: [aplati] })).toEqual([CANDIDAT])
  })

  it('laisse la miniature vide plutôt que de jeter quand elle manque', () => {
    const sansImage = { id: { videoId: 'A1' }, snippet: { title: 'Sans image', channelTitle: 'X' } }
    expect(fromYoutubeSearchResults({ items: [sansImage] })).toEqual([
      {
        videoId: 'A1',
        title: 'Sans image',
        channel: 'X',
        thumbnail: '',
        url: 'https://www.youtube.com/watch?v=A1',
        publishedAt: null,
      },
    ])
  })

  it('écarte un résultat sans identifiant, qu’on ne saurait pas envoyer', () => {
    expect(fromYoutubeSearchResults({ items: [{ snippet: { title: 'Orphelin' } }] })).toEqual([])
  })

  it('renvoie une liste vide plutôt que de jeter sur une réponse inattendue', () => {
    expect(fromYoutubeSearchResults(null)).toEqual([])
    expect(fromYoutubeSearchResults({})).toEqual([])
    expect(fromYoutubeSearchResults([])).toEqual([])
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/services/__tests__/normalize.test.js`
Expected: FAIL — `fromYoutubeSearchResults is not a function` sur les six tests.

- [ ] **Step 3: Écrire l'implémentation minimale**

Dans `src/services/normalize.js`, juste après `fromYoutubeItem` :

```js
/**
 * Traduit la réponse du workflow `searchvideos` en candidats affichables.
 *
 * Volontairement hors de ADAPTERS : cette table alimente toTrackDoc, donc
 * PouchDB, alors qu'un candidat de recherche n'est jamais destiné à devenir un
 * document. L'y inscrire inviterait une écriture que ce flux exclut.
 *
 * Le titre n'est pas découpé par splitYoutubeTitle : c'est le titre complet qui
 * permet de distinguer six candidats les uns des autres, et donc de choisir.
 */
export function fromYoutubeSearchResults(payload) {
  // Trois formes possibles selon d'où vient la charge : l'API répond
  // `{ items: [...] }`, mais le workflow affecte `items` puis répond
  // `allIncomingItems`, ce qui enveloppe le tout dans un tableau.
  const enveloppe = Array.isArray(payload) ? payload[0] : payload
  const items = enveloppe?.items
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      // Le videoId vit sous `id.videoId` dans la réponse brute, ou à plat quand
      // un nœud « Edit Fields » l'a aplati : même prudence que fromYoutubeItem.
      const videoId = item?.id?.videoId || item?.videoId || null
      if (!videoId) return null
      const snippet = item?.snippet || {}
      return {
        videoId,
        title: snippet.title || '',
        channel: snippet.channelTitle || '',
        thumbnail: snippet.thumbnails?.medium?.url || '',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: snippet.publishedAt || null,
      }
    })
    // Un résultat sans identifiant ne pourrait pas être envoyé : le garder
    // afficherait une vignette dont le bouton ne peut rien faire.
    .filter(Boolean)
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/services/__tests__/normalize.test.js`
Expected: PASS, tous les tests du fichier.

- [ ] **Step 5: Vérifier qu'aucun test existant ne casse**

Run: `npx vitest run`
Expected: PASS, 160 tests (154 existants + 6 nouveaux), 0 échec.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/services/normalize.js src/services/__tests__/normalize.test.js
git commit -m "feat: traduire la réponse de recherche YouTube en candidats"
```

---

### Task 2: Endpoints, POST, et recherche des candidats

**Files:**
- Modify: `src/stores/import.js` — `ENDPOINTS.youtube` (lignes 33-38), `fetchJson` (lignes 47-59), nouvelle action dans le bloc `actions`
- Test: `src/stores/__tests__/import.test.js`

**Interfaces:**
- Consumes: `fromYoutubeSearchResults` (tâche 1).
- Produces:
  - `ENDPOINTS.youtube.search(query) → string`
  - `ENDPOINTS.youtube.addToPlaylist(videoId, playlistId) → string`
  - `fetchJson(url, { method = 'GET' } = {})` — signature interne élargie
  - `useImportStore().searchVideos(query) → Promise<Array<candidat>>` (lève `ImportError`). Consommée par la tâche 5.

**Notes de conception à respecter**

`ENDPOINTS.youtube.addToPlaylist` prend ses deux arguments et construit la chaîne de requête complète, sur le modèle de `tracks(playlistId)` qui existe déjà. C'est un écart avec la spec, qui écrivait `addToPlaylist: () => …` : laisser l'appelant concaténer `?id=…&playlistId=…` déplacerait hors de `ENDPOINTS` une partie de ce que `ENDPOINTS` existe pour concentrer.

`fetchJson` gagne un paramètre **optionnel** dont le défaut reproduit exactement le comportement actuel. Les six appels existants ne sont pas modifiés.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/stores/__tests__/import.test.js`. Le fichier définit déjà `BASE`, `jsonResponse`, `errorResponse` et stubbe `VITE_N8N_BASE_URL` dans son `beforeEach` : les réutiliser tels quels.

```js
describe('searchVideos', () => {
  // Forme réellement émise par le workflow searchvideos : `items` affecté par un
  // nœud « Edit Fields », puis `allIncomingItems` qui enveloppe dans un tableau.
  const REPONSE = [
    {
      items: [
        {
          id: { videoId: 'V1' },
          snippet: {
            title: 'Talking Heads - Once in a Lifetime',
            channelTitle: 'Talking Heads',
            publishedAt: '2011-02-15T00:00:00Z',
            thumbnails: { medium: { url: 'https://i.ytimg.com/vi/V1/mqdefault.jpg' } },
          },
        },
      ],
    },
  ]

  it('interroge le bon webhook avec la requête encodée', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(REPONSE))
    const imports = useImportStore()

    await imports.searchVideos('Talking Heads Once in a Lifetime')

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/searchvideos?q=Talking%20Heads%20Once%20in%20a%20Lifetime`,
    )
  })

  it('renvoie les candidats traduits', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(REPONSE))
    const imports = useImportStore()

    const candidats = await imports.searchVideos('Talking Heads')

    expect(candidats).toEqual([
      {
        videoId: 'V1',
        title: 'Talking Heads - Once in a Lifetime',
        channel: 'Talking Heads',
        thumbnail: 'https://i.ytimg.com/vi/V1/mqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=V1',
        publishedAt: '2011-02-15T00:00:00Z',
      },
    ])
  })

  it('renvoie une liste vide quand YouTube ne trouve rien', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse([{ items: [] }]))
    const imports = useImportStore()

    expect(await imports.searchVideos('zzzz')).toEqual([])
  })

  it('lève une ImportError portant le statut sur une réponse en erreur', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500))
    const imports = useImportStore()

    await expect(imports.searchVideos('Talking Heads')).rejects.toMatchObject({
      name: 'ImportError',
      status: 500,
    })
  })

  it('refuse d’appeler le réseau quand n8n n’est pas configuré', async () => {
    vi.stubEnv('VITE_N8N_BASE_URL', '')
    global.fetch = vi.fn()
    const imports = useImportStore()

    await expect(imports.searchVideos('Talking Heads')).rejects.toThrow(
      /VITE_N8N_BASE_URL/,
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/stores/__tests__/import.test.js`
Expected: FAIL — `imports.searchVideos is not a function` sur les cinq tests.

- [ ] **Step 3: Écrire l'implémentation minimale**

**3a.** Compléter l'import en tête de `src/stores/import.js`. Il est aujourd'hui :

```js
import { ADAPTERS, toTrackDoc } from '@/services/normalize.js'
```

Le remplacer par :

```js
import { ADAPTERS, toTrackDoc, fromYoutubeSearchResults } from '@/services/normalize.js'
```

**3b.** Dans `ENDPOINTS.youtube`, ajouter deux entrées après `resolve` :

```js
  youtube: {
    playlists: () => `${base()}/youtube`,
    tracks: (playlistId) => `${base()}/youtube/items?playlistId=${playlistId}`,
    liked: null,
    resolve: (id) => `${base()}/resolve/youtube?id=${id}`,
    // Seuls chemins sortants du client : la recherche de candidats et l'ajout à
    // une playlist. Ils construisent leur chaîne de requête ici, comme tracks(),
    // pour que rien de la forme des URLs n8n ne fuite dans les composants.
    search: (query) => `${base()}/searchvideos?q=${encodeURIComponent(query)}`,
    addToPlaylist: (videoId, playlistId) =>
      `${base()}/addvideotoyoutube?id=${encodeURIComponent(videoId)}&playlistId=${encodeURIComponent(playlistId)}`,
  },
```

**3c.** Élargir `fetchJson` :

```js
async function fetchJson(url, { method = 'GET' } = {}) {
  let response
  try {
    response = await fetch(url, method === 'GET' ? undefined : { method })
  } catch (err) {
    throw new ImportError(`Réseau indisponible (${err.message})`, { status: 0, url })
  }
  if (!response.ok) {
    throw new ImportError(`Réponse ${response.status} de n8n`, { status: response.status, url })
  }
  return response.json()
}
```

Le `undefined` sur le chemin GET n'est pas cosmétique : il garde `fetch(url)` exactement tel que les tests existants l'attendent dans leurs assertions `toHaveBeenCalledWith`.

**3d.** Ajouter l'action dans le bloc `actions`, après `fetchPlaylists` :

```js
    /**
     * Cherche des vidéos YouTube pour une requête « artiste titre ».
     * Lève plutôt que de renvoyer une liste vide en cas de panne : une recherche
     * qui échoue et une recherche sans résultat n'appellent pas le même message.
     */
    async searchVideos(query) {
      if (!base()) throw new ImportError(NOT_CONFIGURED, { status: 0, url: '' })
      const raw = await fetchJson(ENDPOINTS.youtube.search(query))
      return fromYoutubeSearchResults(raw)
    },
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/stores/__tests__/import.test.js`
Expected: PASS, tous les tests du fichier — les cinq nouveaux et tous les anciens, dont les assertions `fetch(url)` sans second argument.

- [ ] **Step 5: Vérifier la suite entière**

Run: `npx vitest run`
Expected: PASS, 165 tests, 0 échec.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/stores/import.js src/stores/__tests__/import.test.js
git commit -m "feat: chercher des vidéos YouTube depuis le store d'import"
```

---

### Task 3: Contrôle « déjà dans la playlist »

**Files:**
- Modify: `src/stores/import.js` — nouvelle action après `searchVideos`
- Test: `src/stores/__tests__/import.test.js`

**Interfaces:**
- Consumes: `ENDPOINTS.youtube.tracks` (existant), `ADAPTERS.youtube.track` (existant, c'est `fromYoutubeItem`).
- Produces: `useImportStore().playlistContains(playlistId, videoId) → Promise<{ found: boolean, checked: number }>`. Consommée par la tâche 5.

**Notes de conception à respecter**

L'action renvoie `checked` — le nombre d'éléments réellement reçus — et **non un simple booléen**. Le workflow `getPlaylistVideo` tronque (voir le commentaire à `src/stores/import.js:201`, qui documente un `limit: 20`). Sans `checked`, l'écran affirmerait « absente » sur la foi d'une liste incomplète. Avec, il peut dire « absente des 20 premières ». C'est le même principe que le rapport d'import, qui compare l'annoncé au reçu.

Le contrôle **n'est pas un verrou** : son échec n'empêche pas l'envoi. C'est l'appelant (tâche 5) qui porte cette règle ; ici l'action se contente de lever, comme les autres.

Réutiliser `ADAPTERS.youtube.track` plutôt que de relire `videoId` à la main : cette fonction tolère déjà trois emplacements pour l'identifiant, et dupliquer cette tolérance ici la ferait diverger au premier changement de workflow.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/stores/__tests__/import.test.js` :

```js
describe('playlistContains', () => {
  // Forme émise par getPlaylistVideo : plate, comme YOUTUBE_ITEMS en tête de fichier.
  const CONTENU = [
    { playlistId: 'PL_Y', videoId: 'V1', title: 'Une vidéo' },
    { playlistId: 'PL_Y', videoId: 'V2', title: 'Une autre' },
  ]

  it('trouve une vidéo présente et rapporte le nombre d’éléments examinés', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(CONTENU))
    const imports = useImportStore()

    expect(await imports.playlistContains('PL_Y', 'V2')).toEqual({ found: true, checked: 2 })
  })

  it('ne trouve pas une vidéo absente, en rapportant ce qui a été examiné', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(CONTENU))
    const imports = useImportStore()

    // `checked` est ce qui permet à l'écran de dire « absente des 2 premières »
    // plutôt que d'affirmer une absence que la troncature ne garantit pas.
    expect(await imports.playlistContains('PL_Y', 'V9')).toEqual({ found: false, checked: 2 })
  })

  it('interroge le contenu de la bonne playlist', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(CONTENU))
    const imports = useImportStore()

    await imports.playlistContains('PL_Y', 'V1')

    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/youtube/items?playlistId=PL_Y`)
  })

  it('lit l’identifiant même sous snippet.resourceId', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse([{ snippet: { resourceId: { videoId: 'V3' } } }]))
    const imports = useImportStore()

    expect(await imports.playlistContains('PL_Y', 'V3')).toEqual({ found: true, checked: 1 })
  })

  it('traite une playlist vide sans jeter', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse([]))
    const imports = useImportStore()

    expect(await imports.playlistContains('PL_Y', 'V1')).toEqual({ found: false, checked: 0 })
  })

  it('lève sur une réponse en erreur : c’est à l’appelant de décider de passer outre', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404))
    const imports = useImportStore()

    await expect(imports.playlistContains('PL_Y', 'V1')).rejects.toMatchObject({
      name: 'ImportError',
      status: 404,
    })
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/stores/__tests__/import.test.js`
Expected: FAIL — `imports.playlistContains is not a function` sur les six tests.

- [ ] **Step 3: Écrire l'implémentation minimale**

Dans `src/stores/import.js`, après `searchVideos` :

```js
    /**
     * Dit si une vidéo est déjà dans une playlist, et sur combien d'éléments.
     *
     * `checked` n'est pas décoratif : le workflow getPlaylistVideo tronque (voir
     * le commentaire d'importPlatform plus bas). Renvoyer un booléen nu laisserait
     * l'écran affirmer « absente » sur la foi d'une liste incomplète.
     */
    async playlistContains(playlistId, videoId) {
      if (!base()) throw new ImportError(NOT_CONFIGURED, { status: 0, url: '' })
      const raw = await fetchJson(ENDPOINTS.youtube.tracks(playlistId))
      const items = Array.isArray(raw) ? raw : []
      // On passe par l'adaptateur existant : il tolère déjà les trois endroits où
      // le workflow peut poser l'identifiant, et le redire ici les ferait diverger.
      const ids = items.map((item) => ADAPTERS.youtube.track(item).externalId)
      return { found: ids.includes(videoId), checked: ids.length }
    },
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/stores/__tests__/import.test.js`
Expected: PASS, tous les tests du fichier.

- [ ] **Step 5: Vérifier la suite entière**

Run: `npx vitest run`
Expected: PASS, 171 tests, 0 échec.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/stores/import.js src/stores/__tests__/import.test.js
git commit -m "feat: signaler qu'une vidéo est déjà dans une playlist YouTube"
```

---

### Task 4: Ajout à une playlist, et garantie de non-écriture

**Files:**
- Modify: `src/stores/import.js` — nouvelle action après `playlistContains`
- Test: `src/stores/__tests__/import.test.js`

**Interfaces:**
- Consumes: `ENDPOINTS.youtube.addToPlaylist` et `fetchJson(url, { method })` (tâche 2).
- Produces: `useImportStore().addVideoToPlaylist({ videoId, playlistId }) → Promise<void>` (lève `ImportError`). Consommée par la tâche 5.

**Notes de conception à respecter**

Le workflow `addvideotoyoutube` lit `$json.query.id` et `$json.query.playlistId` : tout passe par la chaîne de requête, **aucun corps n'est envoyé**. C'est pourquoi `fetchJson` n'a besoin que de `method` et pas de `body`.

L'action ne renvoie rien d'utile. Ce que YouTube répond au POST n'est pas exploité : le seul fait qui intéresse l'écran est « ça a réussi » ou « voici l'erreur », et prétendre exploiter davantage inviterait à écrire quelque chose.

Le dernier test de cette tâche est le garde-fou de la contrainte globale : après un parcours complet, le document de l'entrée doit être **identique, `_rev` comprise**.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/stores/__tests__/import.test.js`. Le helper `pendingDoc` existe déjà en tête du fichier ; le test de non-écriture s'en sert pour fabriquer une entrée réelle en base mémoire.

```js
describe('addVideoToPlaylist', () => {
  it('poste sur le bon webhook avec la vidéo et la playlist', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse([{ id: 'PLI_1' }]))
    const imports = useImportStore()

    await imports.addVideoToPlaylist({ videoId: 'V1', playlistId: 'PL_Y' })

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/addvideotoyoutube?id=V1&playlistId=PL_Y`,
      { method: 'POST' },
    )
  })

  it('lève une ImportError portant le statut quand YouTube refuse', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(403))
    const imports = useImportStore()

    await expect(
      imports.addVideoToPlaylist({ videoId: 'V1', playlistId: 'PL_Y' }),
    ).rejects.toMatchObject({ name: 'ImportError', status: 403 })
  })

  it('refuse d’appeler le réseau quand n8n n’est pas configuré', async () => {
    vi.stubEnv('VITE_N8N_BASE_URL', '')
    global.fetch = vi.fn()
    const imports = useImportStore()

    await expect(
      imports.addVideoToPlaylist({ videoId: 'V1', playlistId: 'PL_Y' }),
    ).rejects.toThrow(/VITE_N8N_BASE_URL/)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('ne touche pas au document de l’entrée : la playlist YouTube est la seule destination', async () => {
    // Garde-fou de la contrainte du flux. Si ce test tombe, c'est qu'une écriture
    // s'est glissée dans le chemin sortant — la décision était de n'en faire aucune.
    const db = getDb()
    const { rev } = await db.put(pendingDoc('V1'))
    const avant = await db.get('track:youtube:V1')

    global.fetch = vi.fn().mockResolvedValue(jsonResponse([{ id: 'PLI_1' }]))
    const imports = useImportStore()

    await imports.searchVideos('Aphex Twin Windowlicker')
    await imports.addVideoToPlaylist({ videoId: 'V1', playlistId: 'PL_Y' })

    const apres = await db.get('track:youtube:V1')
    expect(apres).toEqual(avant)
    expect(apres._rev).toBe(rev)
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/stores/__tests__/import.test.js`
Expected: FAIL — `imports.addVideoToPlaylist is not a function` sur les quatre tests.

- [ ] **Step 3: Écrire l'implémentation minimale**

Dans `src/stores/import.js`, après `playlistContains` :

```js
    /**
     * Ajoute une vidéo à une playlist YouTube. Rien n'est écrit en base : ce flux
     * part d'une entrée et n'y revient pas.
     *
     * Tout passe par la chaîne de requête, sans corps : le workflow
     * addvideotoyoutube lit $json.query.id et $json.query.playlistId, et compose
     * lui-même le corps attendu par l'API YouTube.
     */
    async addVideoToPlaylist({ videoId, playlistId }) {
      if (!base()) throw new ImportError(NOT_CONFIGURED, { status: 0, url: '' })
      await fetchJson(ENDPOINTS.youtube.addToPlaylist(videoId, playlistId), { method: 'POST' })
    },
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/stores/__tests__/import.test.js`
Expected: PASS, tous les tests du fichier.

- [ ] **Step 5: Vérifier la suite entière**

Run: `npx vitest run`
Expected: PASS, 175 tests, 0 échec.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/stores/import.js src/stores/__tests__/import.test.js
git commit -m "feat: ajouter une vidéo à une playlist YouTube"
```

---

### Task 5: Le panneau dans la fiche d'entrée

**Files:**
- Create: `src/components/YoutubeMatch.vue`
- Modify: `src/components/EntryDetail.vue` (import dans le `<script setup>`, montage dans le `<template>` après `<section class="sources">`)
- Add to git: `src/assets/arrow_swap.svg` (le fichier existe déjà sur le disque, non suivi)

**Interfaces:**
- Consumes: `useImportStore().searchVideos(query)`, `.playlistContains(playlistId, videoId)`, `.addVideoToPlaylist({ videoId, playlistId })` (tâches 2-4), et `.fetchPlaylists('youtube')` (existant, renvoie `Array<{ id, name, description, trackCount, url }>`).
- Produces: rien pour d'autres tâches — c'est la feuille de l'arbre.

**Notes de conception à respecter**

Conditions d'apparition, dans `EntryDetail.vue` : `entry.type === 'track' && entry.title`. Une entrée `artist` ou un morceau `pending` sans titre n'a pas de requête à former, donc **pas de bouton du tout** — pas un bouton désactivé sans explication.

L'icône est posée en `mask-image` sur un fond coloré, avec inversion au survol : c'est la convention constante du projet (`QuickAdd.vue:137`, `SidePastilles.vue:111`, `ExportButton.vue:129`). Jamais de `<img>`.

Le contrôle « déjà dedans » est un **renseignement, pas un verrou**. S'il échoue, l'envoi reste possible. Si la vidéo est déjà là, le bouton devient « Envoyer quand même ».

Le message d'absence de résultat **affiche la requête**. Sans elle, impossible de distinguer un échec de YouTube d'un `title` mal découpé par `splitYoutubeTitle` — et sur ce corpus, le second est le cas le plus fréquent.

- [ ] **Step 1: Créer le composant**

Créer `src/components/YoutubeMatch.vue` :

```vue
<script setup>
import { computed, ref, watch } from 'vue'
import { useImportStore } from '@/stores/import.js'

const props = defineProps({ entry: { type: Object, required: true } })

const imports = useImportStore()

const candidats = ref([])
const choisie = ref(null)
const playlists = ref([])
const playlistId = ref('')
const dejaDedans = ref(null)
const cherche = ref(false)
const envoie = ref(false)
const message = ref('')

// La requête est aussi affichée dans le message d'absence de résultat : sans
// elle, on ne peut pas distinguer un échec de YouTube d'un titre mal découpé.
const requete = computed(() => [props.entry.artist, props.entry.title].filter(Boolean).join(' '))

const playlistChoisie = computed(() => playlists.value.find((p) => p.id === playlistId.value))

function reinitialiser() {
  candidats.value = []
  choisie.value = null
  playlists.value = []
  playlistId.value = ''
  dejaDedans.value = null
  message.value = ''
}

// Changer d'entrée sans réinitialiser laisserait les candidats du morceau
// précédent sous le titre du suivant, et un envoi partirait sur la mauvaise vidéo.
watch(() => props.entry._id, reinitialiser)

async function chercher() {
  cherche.value = true
  message.value = ''
  candidats.value = []
  choisie.value = null
  dejaDedans.value = null
  try {
    const trouves = await imports.searchVideos(requete.value)
    candidats.value = trouves
    if (!trouves.length) message.value = `Aucune vidéo trouvée pour « ${requete.value} ».`
  } catch (err) {
    message.value = `Recherche impossible : ${err.message}`
  } finally {
    cherche.value = false
  }
}

async function choisir(candidat) {
  choisie.value = candidat
  dejaDedans.value = null
  message.value = ''
  if (playlists.value.length) return controler()
  try {
    playlists.value = await imports.fetchPlaylists('youtube')
    if (!playlists.value.length) message.value = 'Aucune playlist YouTube à alimenter.'
  } catch (err) {
    message.value = `Playlists indisponibles : ${err.message}`
  }
}

/**
 * Renseigne si la vidéo est déjà dans la playlist visée. Un échec ne bloque
 * rien : le contrôle éclaire l'envoi, il ne le garde pas.
 */
async function controler() {
  dejaDedans.value = null
  if (!choisie.value || !playlistId.value) return
  try {
    dejaDedans.value = await imports.playlistContains(playlistId.value, choisie.value.videoId)
  } catch {
    message.value = 'Contrôle impossible : l’envoi reste possible, au risque d’un doublon.'
  }
}

async function envoyer() {
  if (!choisie.value || !playlistId.value) return
  envoie.value = true
  message.value = ''
  try {
    await imports.addVideoToPlaylist({
      videoId: choisie.value.videoId,
      playlistId: playlistId.value,
    })
    message.value = `Ajoutée à ${playlistChoisie.value?.name || 'la playlist'}.`
    candidats.value = []
    choisie.value = null
    dejaDedans.value = null
  } catch (err) {
    // Vignette et playlist restent sélectionnées : réessayer ne doit pas coûter
    // un nouveau parcours.
    message.value = `Envoi impossible : ${err.message}`
  } finally {
    envoie.value = false
  }
}
</script>

<template>
  <section class="match">
    <h3>Trouver la vidéo</h3>

    <div class="lancer">
      <button type="button" class="yellow" :disabled="cherche" @click="chercher">
        <div class="swap-icon"></div>
      </button>
      <span class="requete">{{ requete }}</span>
    </div>

    <ul v-if="candidats.length" class="candidats">
      <li v-for="candidat in candidats" :key="candidat.videoId">
        <button
          type="button"
          class="candidat"
          :class="{ actif: choisie?.videoId === candidat.videoId }"
          @click="choisir(candidat)"
        >
          <img v-if="candidat.thumbnail" :src="candidat.thumbnail" :alt="''" />
          <span class="titre">{{ candidat.title }}</span>
          <span class="chaine">{{ candidat.channel }}</span>
        </button>
        <a :href="candidat.url" target="_blank" rel="noopener" class="voir">voir sur YouTube</a>
      </li>
    </ul>

    <div v-if="choisie && playlists.length" class="envoi">
      <label>
        Playlist
        <select v-model="playlistId" @change="controler">
          <option value="">Choisir…</option>
          <option v-for="p in playlists" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>

      <p v-if="dejaDedans?.found" class="avertissement">
        Déjà dans cette playlist.
      </p>
      <p v-else-if="dejaDedans" class="controle">
        Absente des {{ dejaDedans.checked }} premiers éléments examinés.
      </p>

      <button type="button" :disabled="!playlistId || envoie" @click="envoyer">
        {{ dejaDedans?.found ? 'Envoyer quand même' : 'Envoyer' }}
      </button>
    </div>

    <p v-if="cherche" class="feedback" role="status">Recherche…</p>
    <p v-else-if="message" class="feedback" role="status">{{ message }}</p>
  </section>
</template>

<style scoped>
.match {
  margin: 2em 0 0;
  padding-top: 1.5em;
  border-top: 1px solid var(--trait);
}

h3 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--encre);
}

.lancer {
  display: flex;
  align-items: center;
  gap: 0.8em;
}

.requete {
  font-size: 0.9em;
  color: var(--encre-douce);
}

button.yellow {
  background-color: var(--jaune);
  border: 1px solid var(--trait);
  border-radius: 100%;
  width: 44px;
  height: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.15s linear;
}

button.yellow:hover {
  background-color: var(--encre);
}

/* Masque CSS sur fond coloré, comme add.svg dans QuickAdd et les pastilles :
   l'icône reprend la couleur du texte et s'inverse au survol. */
.swap-icon {
  background-color: var(--encre);
  width: 22px;
  height: 22px;
  -webkit-mask-image: url('../assets/arrow_swap.svg');
  mask-image: url('../assets/arrow_swap.svg');
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  transition: background-color 0.15s linear;
}

button.yellow:hover .swap-icon {
  background-color: var(--jaune);
}

.candidats {
  list-style: none;
  padding: 0;
  margin: 1.2em 0 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1em;
}

.candidat {
  display: grid;
  gap: 0.3em;
  width: 100%;
  padding: 0;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--trait);
  cursor: pointer;
}

.candidat.actif {
  border-color: var(--encre);
  outline: 2px solid var(--jaune);
}

.candidat img {
  width: 100%;
  display: block;
}

.titre {
  padding: 0 0.6em;
  font-size: 0.9em;
  color: var(--encre);
}

.chaine {
  padding: 0 0.6em 0.6em;
  font-size: 0.8em;
  color: var(--encre-douce);
}

.voir {
  display: inline-block;
  margin-top: 0.3em;
  font-size: 0.8em;
  color: var(--encre-douce);
}

.envoi {
  display: flex;
  align-items: center;
  gap: 1em;
  flex-wrap: wrap;
  margin-top: 1.2em;
}

.avertissement {
  margin: 0;
  font-size: 0.9em;
  color: var(--alerte);
}

.controle {
  margin: 0;
  font-size: 0.9em;
  color: var(--encre-douce);
}

.feedback {
  margin: 0.8em 0 0;
  font-size: 0.9em;
  color: var(--encre-douce);
}
</style>
```

- [ ] **Step 2: Monter le composant dans la fiche d'entrée**

Dans `src/components/EntryDetail.vue`, ajouter l'import après celui de `useLibraryStore` :

```js
import YoutubeMatch from '@/components/YoutubeMatch.vue'
```

Puis, dans le `<template>`, juste après la fermeture de `</section>` de `class="sources"` et avant `</article>` :

```vue
    <!-- Une entrée de type artiste, ou un morceau sans titre, n'a pas de requête
         à former : le panneau est absent plutôt que désactivé sans explication. -->
    <YoutubeMatch v-if="entry.type === 'track' && entry.title" :entry="entry" />
```

- [ ] **Step 3: Vérifier que rien ne casse**

Run: `npx vitest run`
Expected: PASS, 175 tests, 0 échec. Aucun test ne porte sur les composants dans ce dépôt ; cette étape vérifie qu'aucun import n'est cassé.

- [ ] **Step 4: Vérifier le lint et le formatage**

Run: `npm run lint`
Expected: aucune erreur (la commande corrige au passage ce qui est corrigeable).

- [ ] **Step 5: Vérifier dans le navigateur**

Lancer le serveur de développement et ouvrir la fiche d'un morceau importé de Spotify (donc pourvu d'un artiste et d'un titre).

À vérifier, dans l'ordre :

1. Le bouton jaune à l'icône `arrow_swap` apparaît sous les provenances, avec la requête « artiste titre » à côté.
2. Sur une entrée de type artiste, le panneau est **absent**.
3. Le clic lance la recherche et affiche jusqu'à **six** vignettes (c'est le `maxResults: 6` du workflow qui le garantit ; s'il en arrive cinq, le workflow n'a pas été réimporté dans l'instance n8n).
   - Si le message est « Recherche impossible : Réseau indisponible (…) » alors que le workflow répond, regarder la console : c'est le cas CORS annoncé au §3 de la spec. Le `Respond to Webhook` de `searchvideos` ne pose pas `Access-Control-Allow-Origin`, contrairement à ses voisins. Correctif : ajouter cet en-tête au nœud de réponse, comme le fait `addvideotoyoutube`.
4. L'icône s'inverse au survol (encre sur jaune → jaune sur encre).
5. Le clic sur une vignette la marque active et fait apparaître le sélecteur de playlist.
6. Le choix d'une playlist affiche soit « Déjà dans cette playlist », soit « Absente des N premiers éléments examinés ».
7. L'envoi affiche « Ajoutée à *nom* » et referme la grille. **Vérifier sur YouTube que la vidéo est arrivée dans la playlist choisie, et pas dans une autre** — c'est le seul test possible du paramétrage de `playlistId` côté n8n.
8. Recharger la fiche : rien n'a changé sur l'entrée (ni titre, ni artiste, ni provenance).

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/components/YoutubeMatch.vue src/components/EntryDetail.vue src/assets/arrow_swap.svg
git commit -m "feat: choisir une vidéo YouTube et l'envoyer dans une playlist"
```

---

## Reste à faire hors de ce plan

- **Réexporter `docs/n8n/YT_Babines_addItems.json`** depuis l'instance n8n : l'export versionné porte encore `playlistId` en dur, alors que l'instance est paramétrée. Tant que l'export n'est pas rafraîchi, le dépôt décrit un workflow qui n'existe plus.
- **Relever le `limit` de `getPlaylistVideo`** côté n8n. Le contrôle « déjà dedans » reste juste sans cela — il dit sur combien d'éléments il a porté — mais il porte sur peu.
- **Décider du sort de `docs/n8n/SPOTIFY_Babines_search.json`**, non suivi et inutilisé par ce flux.
