# Recherche YouTube depuis une entrée — Design

Date : 2026-08-18
Statut : validé, prêt pour le plan d'implémentation

## 1. Intention

Depuis une entrée déjà en bibliothèque — typiquement un morceau importé de Spotify, donc pourvu
d'un `artist` et d'un `title` propres — proposer six vidéos YouTube candidates, laisser choisir la
bonne, et l'ajouter à une playlist YouTube choisie au moment de l'envoi.

C'est la **première écriture sortante** de Babines. Jusqu'ici tout le flux allait dans un seul
sens : lire les plateformes, écrire dans PouchDB. Ce flux fait l'inverse et ne touche pas à la base.

**Aucune écriture PouchDB à aucune étape.** L'entrée sort du flux exactement comme elle y est
entrée. C'est un choix, pas un oubli : la playlist YouTube est la destination, l'entrée Babines
n'est que le point de départ de la requête.

Il n'y a **aucun appel à l'API Spotify** dans ce flux. La graphie « artiste - titre » vient du
document déjà en base, importé précédemment.

## 2. Parcours

```
EntryDetail  ──[bouton arrow_swap]──▶  GET  /searchvideos?q=<artist>+<title>
                                            └─▶ 6 vignettes (miniature, titre, chaîne)
        choix d'une vignette  ──▶  GET  /youtube                        (playlists)
        choix d'une playlist  ──▶  GET  /youtube/items?playlistId=…     (déjà dedans ?)
        « Envoyer »           ──▶  POST /addvideotoyoutube?id=…&playlistId=…
```

### Condition d'apparition

Le bouton n'est rendu que si `entry.type === 'track'` **et** `entry.title` est non vide. Une entrée
de type `artist`, ou un morceau encore `pending`, n'a pas de requête à former : le bouton est
**absent**, pas désactivé. Un bouton désactivé sans explication est un défaut ; une absence sur une
entrée manifestement incomplète se comprend.

## 3. Contrat avec n8n

Les chemins consommés, tous déjà exportés dans `docs/n8n/` :

| Usage | Webhook | Méthode |
|---|---|---|
| Recherche de candidats | `searchvideos` | GET |
| Liste des playlists | `youtube` | GET |
| Contenu d'une playlist | `youtube/items` | GET |
| Ajout à une playlist | `addvideotoyoutube` | POST |

### Modifications requises côté n8n

1. **`searchvideos`** : `maxResults` de `5` à `6`. Fait dans l'export versionné
   (`docs/n8n/YT_Babines_searchItems.json`) et appliqué à l'instance.
2. **`addvideotoyoutube`** : le corps JSON du nœud HTTP Request porte `"playlistId":
   "FL12ctQJ5zuiZlEZW5CRFrQg"` en dur. Il doit devenir `"playlistId": "{{ $json.query.playlistId }}"`
   pour que la destination soit choisie à l'envoi. Appliqué à l'instance. L'export versionné
   `docs/n8n/YT_Babines_addItems.json` porte encore la valeur en dur : il sera à réexporter. Sans
   cette modification, le sélecteur de playlist serait décoratif et tout partirait dans la même liste
   — c'est la première chose à vérifier si un envoi arrive au mauvais endroit.

### Forme de réponse de `searchvideos`

Le nœud `Edit Fields` affecte `items` = `{{ $json.items }}` puis `Respond to Webhook` répond
`allIncomingItems` : le client reçoit `[{ "items": [ …6 vidéos… ] }]`, pas la liste directement.
L'adaptateur tolère cette enveloppe, sur le principe déjà appliqué par `fromYoutubeItem`
(`src/services/normalize.js`), qui tolère trois emplacements pour `videoId` parce qu'une case
décochée dans une interface tierce ne doit pas vider silencieusement les identifiants.

### En-tête CORS

Le `Respond to Webhook` de `searchvideos` ne pose pas `Access-Control-Allow-Origin`, contrairement à
ses voisins `addvideotoyoutube` et `search/spotify`. L'option `allowedOrigins: "*"` du nœud webhook
devrait suffire en n8n v2, mais ce workflow n'a jamais été appelé depuis un navigateur : à vérifier
au premier appel réel plutôt qu'à supposer.

## 4. Code

Quatre fichiers, un seul nouveau. Aucune signature existante modifiée.

### `src/stores/import.js`

`ENDPOINTS.youtube` gagne deux entrées à côté des quatre actuelles :

```js
search: (q) => `${base()}/searchvideos?q=${encodeURIComponent(q)}`,
addToPlaylist: () => `${base()}/addvideotoyoutube`,
```

`fetchJson(url)` devient `fetchJson(url, { method, body } = {})`. Le défaut reste un GET : les
appels existants ne changent pas. C'est le minimum pour que le POST partage la traduction d'erreur
en `ImportError` — sans quoi l'envoi aurait sa propre gestion d'erreur et le panneau afficherait des
messages d'une autre famille que le reste de l'application.

Trois actions :

- **`searchVideos(query)`** → les candidats, via `fromYoutubeSearchResult`.
- **`playlistContains(playlistId, videoId)`** → réutilise `ENDPOINTS.youtube.tracks` et renvoie
  `{ found, checked }`, non un booléen. `checked` est le nombre d'éléments réellement reçus : c'est
  ce qui permet de dire « absente des 20 premières » au lieu d'affirmer « absente » sur la foi d'une
  liste tronquée (voir §6).
- **`addVideoToPlaylist({ videoId, playlistId })`** → le POST.

Le sélecteur de playlists réutilise `fetchPlaylists('youtube')` sans modification : elle passe par
`fromYoutubePlaylist`, qui tolère déjà les trois formes de nommage du workflow.

### `src/services/normalize.js`

Un adaptateur : `fromYoutubeSearchResult(raw)` → `{ videoId, title, channel, thumbnail, url,
publishedAt }`. Il tolère `id.videoId` comme `videoId` à plat, et lit la miniature sous
`snippet.thumbnails.medium.url`.

Il reste **hors de `ADAPTERS`**. Cette table alimente `toTrackDoc`, donc PouchDB ; un candidat n'est
jamais destiné à devenir un document. L'y inscrire inviterait exactement l'écriture que ce design
écarte.

### `src/components/YoutubeMatch.vue` (nouveau)

Le panneau : bouton `arrow_swap.svg` en `mask-image` (convention du projet — masque CSS sur fond
coloré avec inversion au survol, jamais un `<img>`, voir `QuickAdd.vue` et `SidePastilles.vue`),
grille des six vignettes (miniature, titre, chaîne), sélecteur de playlist, bouton « Envoyer ». Une
seule zone de message `role="status"`, sur le modèle de `.feedback` dans `QuickAdd.vue`.

Un `watch` sur `entry._id` réinitialise candidats, sélection et message, comme le fait déjà
`EntryDetail`.

### `src/components/EntryDetail.vue`

Monte `<YoutubeMatch :entry="entry" />` sous le formulaire, sous la condition du §2.

## 5. Erreurs

| Situation | Comportement |
|---|---|
| `VITE_N8N_BASE_URL` absent | Message `NOT_CONFIGURED` existant, aucun `fetch` tenté |
| Réseau indisponible ou statut non-2xx | `ImportError` affichée telle quelle |
| Zéro candidat | « Aucune vidéo trouvée pour "…" », **requête affichée** |
| Moins de six candidats | On affiche ce qui est arrivé, sans combler |
| Contrôle « déjà dedans » en échec | L'envoi reste possible ; le contrôle est un renseignement |
| Vidéo déjà présente | Le bouton devient « Envoyer quand même » |
| Échec du POST | Message ; vignette et playlist restent sélectionnées |
| Succès | « Ajoutée à *nom de playlist* », la grille se referme |

La requête est affichée dans le cas « zéro candidat » parce que sans elle on ne peut pas distinguer
un échec de YouTube d'un `title` mal découpé par `splitYoutubeTitle` — et sur ce corpus, le second
est le plus probable.

Le contrôle « déjà dans la playlist » **n'est pas un verrou**. Sur une liste tronquée, un contrôle
bloquant interdirait des envois légitimes.

## 6. Limite connue : troncature du contenu de playlist

Le contrôle « déjà dans la playlist » lit `youtube/items`, dont la troncature est déjà documentée
dans `src/stores/import.js` (le workflow porte un `limit: 20`). Au-delà de cette limite, une vidéo
présente est lue comme absente et l'envoi crée un doublon.

Traitement retenu : relever la limite côté n8n, **et** rapporter `checked` jusqu'à l'écran pour que
le message reste honnête quand la liste est tronquée. C'est le même principe que le rapport d'import,
qui compare l'annoncé au reçu plutôt que de compter les intentions.

## 7. Tests

`vitest`, `fetch` bouchonné comme dans `src/stores/__tests__/import.test.js`. Développement en TDD :
test rouge, puis implémentation, par tranche.

**`normalize`** — `fromYoutubeSearchResult` sur `id.videoId`, sur `videoId` à plat, sans miniature,
et sur l'enveloppe `[{ items: [...] }]` du workflow.

**`import`** — `searchVideos` renvoie six candidats mappés ; n8n non configuré ; 500 → `ImportError` ;
`playlistContains` trouve / ne trouve pas / rapporte `checked` sur liste tronquée ;
`addVideoToPlaylist` frappe la bonne URL avec `id` et `playlistId` ; échec du POST.

**Non-écriture** — après un envoi complet, le document de l'entrée est identique, `_rev` comprise.
C'est la seule garantie mécanique que le choix « playlist YouTube seulement » ne dérive pas à la
prochaine modification.

## 8. Hors périmètre

- Aucun appel à l'API Spotify. `docs/n8n/SPOTIFY_Babines_search.json`, non commité à ce jour, n'est
  pas utilisé par ce flux.
- Aucune trace en base de ce qui a été envoyé : YouTube fait foi.
- Aucune création de playlist YouTube depuis Babines : on choisit parmi les existantes.
- Aucun envoi par lot : une entrée, une vidéo, un envoi.
