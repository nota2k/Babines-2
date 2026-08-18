# Babines v2 — Design

Date : 2026-08-18
Statut : validé, prêt pour le plan d'implémentation

## 1. Intention

Babines est un **bloc-note de musique**. Sa valeur est dans l'agrégat : une bibliothèque unique
rassemblant tout ce qu'on écoute et tout ce qu'on découvre, alimentée par les playlists Spotify,
Deezer et YouTube, complétée à la main, annotée librement, et exportable en JSON.

Trois usages fondent le produit :

1. **Rapatrier** l'intégralité de ses playlists depuis les trois plateformes.
2. **Capturer** en mobilité un morceau ou un artiste qu'on découvre, y compris hors ligne.
3. **Exporter** toute sa musique au format JSON.

Les playlists d'origine ne sont pas la structure du produit : elles sont une métadonnée et un
filtre. L'écran principal est la bibliothèque complète.

## 2. Décisions structurantes

| # | Question | Décision |
|---|---|---|
| 1 | Playlists ou bloc-note au centre ? | **Bloc-note.** Les plateformes deviennent sources d'import et filtres. |
| 2 | Unité de base | **Deux types d'entrées** — `track` et `artist` — dans un flux unique, chacune avec un champ note en texte libre. |
| 3 | Stockage | **Offline-first** : PouchDB local répliqué vers un CouchDB hébergé sur Dokku. |
| 4 | Utilisateurs | **Mono-utilisateur en pratique**, sans rien coder en dur, pour ne pas fermer la porte au multi-utilisateur. |
| 5 | Import | **n8n reste la couche d'intégration.** Pas d'OAuth navigateur, pas d'import de fichier. |
| 6 | Mobile | **PWA installable**, avec *Web Share Target* déclaré et capture pensée autour du coller-coller. |
| 7 | Doublons | **Une entrée par morceau avec `sources[]`**, dédoublonnage par identifiant de plateforme (A1). Fusion cross-plateforme suggérée, jamais automatique. |
| 8 | Export | **JSON propre et versionné**, portée globale ou filtrée. |

## 3. État des lieux et dettes à traiter

Dernier commit : juin 2025. Le code souffre de défauts qui conditionnent la refonte.

| Constat | Emplacement | Conséquence |
|---|---|---|
| Webhooks n8n en erreur 500 | `tentacules.pantagruweb.club` | L'import ne fonctionne plus. Serveur debout, workflows cassés — probablement des jetons OAuth expirés. |
| Réplication codée en dur sur `localhost:25725` | `src/services/db.js:4` | La synchronisation ne marche qu'en développement local. |
| `pouchdb-find` ni installé ni enregistré | `src/stores/couchdb.js:91`, `:116` | `db.find()` lève une exception : la recherche par artiste et par playlist est inopérante. |
| Champ `playlist` au singulier, `_id` = identifiant Spotify nu | `src/components/Aside.vue` | Un morceau présent dans plusieurs playlists perd toutes ses appartenances sauf la dernière importée. |
| Export branché sur `@click` sans argument | `src/components/Aside.vue` | Sérialise l'objet `PointerEvent` au lieu des morceaux. |
| Ajout manuel écrivant `{track: {…}}` imbriqué | `src/components/playlists/addTrackManually.vue` | Les entrées créées sont invisibles : `Tracklist.vue` lit des champs plats. |
| Deux arbres de composants jumeaux | `playlists/` et `playlist_videos/` | Duplication à maintenir en double. |
| `handleSelectPlaylist` référencé mais inexistant | `src/views/DataView.vue` | Gestionnaire mort. |
| Erreurs avalées par `console.error` + retour `[]` | tous les stores | Une panne est indiscernable d'une bibliothèque vide. C'est ce qui a rendu la panne n8n invisible pendant quatorze mois. |
| Aucun test, aucun lanceur | `package.json` | Aucun filet de sécurité. |
| `src/components/icons/`, `AboutView.vue` | — | Code mort : jamais importés, absents du routeur. |

## 4. Architecture

### 4.1 Socle de données

PouchDB dans le navigateur (IndexedDB), répliqué en continu et bidirectionnellement vers un
CouchDB déployé sur Dokku aux côtés de `babines.incongru.org`.

- L'URL et le nom de la base passent en variables d'environnement Vite : `VITE_COUCHDB_URL`,
  `VITE_COUCHDB_DB`. Rien n'est codé en dur — c'est ce qui matérialise la décision 4.
- `pouchdb-find` est ajouté aux dépendances et enregistré via `PouchDB.plugin()`.
- Les index nécessaires (`type`, `artist`, `matchKey`, `sources.platform`) sont créés au démarrage.

### 4.2 Modèle de documents

Deux types dans la même base, distingués par le champ `type`.

**Morceau**

```json
{
  "_id": "track:spotify:2VNfJpwdEQBLyXajaa6LWT",
  "type": "track",
  "title": "Burning Down the House",
  "artist": "Talking Heads",
  "album": "Burning Down the House / I Get Wild / Wild Gravity",
  "matchKey": "talking heads::burning down the house",
  "pending": false,
  "sources": [
    {
      "platform": "spotify",
      "playlistId": "2bh4gKi6Jn1dtayg9fFwr5",
      "playlistName": "BAT BEAT",
      "externalId": "2VNfJpwdEQBLyXajaa6LWT",
      "addedAt": "2025-04-07T14:34:51Z",
      "url": "https://open.spotify.com/track/2VNf…",
      "rawTitle": null
    }
  ],
  "note": "",
  "tags": [],
  "createdAt": "2026-08-18T14:00:00Z",
  "updatedAt": "2026-08-18T14:00:00Z"
}
```

**Artiste**

```json
{
  "_id": "artist:0f3a9c1e-…",
  "type": "artist",
  "name": "Pulsallama",
  "matchKey": "pulsallama",
  "sources": [],
  "note": "vu au Petit Bain, écouter l'album de 1982",
  "tags": ["à écouter"],
  "createdAt": "2026-08-18T14:00:00Z",
  "updatedAt": "2026-08-18T14:00:00Z"
}
```

**Convention d'identifiant** — c'est le pivot du dédoublonnage :

| Origine | Forme de `_id` |
|---|---|
| Import plateforme | `track:<platform>:<externalId>` |
| Morceau manuel | `track:manual:<uuid>` |
| Artiste | `artist:<uuid>` |

Réimporter un morceau retombe mécaniquement sur le même document : le dédoublonnage A1 est
gratuit et sans faux positif, aucune recherche n'est nécessaire.

**`sources[]`** remplace le champ `playlist` singulier responsable de l'écrasement actuel. Un
morceau présent dans quatre playlists est **un document avec quatre sources**. L'import fusionne
par couple `(platform, playlistId)` et ne remplace jamais le tableau.

**`matchKey`** est la clé normalisée `artiste::titre` : minuscules, accents et ponctuation retirés,
mentions parasites nettoyées (`Remastered 2011`, `feat.`, `- Live`, `(Official Video)`). Elle est
**calculée et stockée mais ne fusionne rien**. Elle alimente uniquement l'écran `/doublons`, où la
fusion est décidée à la main. C'est le chemin vers un dédoublonnage cross-plateforme (A2) sans
migration ultérieure, si l'usage montre qu'il est fiable.

**`pending`** marque une entrée capturée par URL et pas encore enrichie (voir §7).

### 4.3 Migration

Script à passer une fois sur les documents existants :

- `_id` : identifiant Spotify nu → `track:spotify:<id>`
- `playlist` (objet singulier) → `sources[0]`
- ajout de `type: "track"`, `matchKey`, `note: ""`, `tags: []`, `pending: false`
- aplatissement des entrées manuelles imbriquées `{track: {…}}`, qui redeviennent visibles

## 5. Écrans et composants

### 5.1 Routes

| Route | Rôle |
|---|---|
| `/` | **La bibliothèque** : tous les morceaux et artistes, recherche, filtres, tri. Écran par défaut. |
| `/import` | Sources : déclencher un import par plateforme, consulter l'état et les erreurs. |
| `/doublons` | Revue des doublons probables via `matchKey`, fusion manuelle. |
| `/entree/:id` | Détail d'une entrée : note, tags, provenances, liens. Panneau plein écran sur mobile, latéral sur desktop. |

Les playlists ne sont plus des écrans mais des **filtres** de la bibliothèque.

### 5.2 Composants

Les arbres `playlists/` et `playlist_videos/` fusionnent. YouTube n'est plus une section séparée :
c'est une plateforme parmi trois, dans la même liste.

| Composant | Responsabilité |
|---|---|
| `QuickAdd.vue` | Capture rapide, morceau ou artiste. Remplace les deux `addTrackManually`. |
| `FilterBar.vue` | Recherche et filtres plateforme / playlist / tag / type. |
| `LibraryList.vue` | La liste, virtualisée. |
| `EntryRow.vue` | Une ligne, badge morceau/artiste. |
| `EntryDetail.vue` | Note libre, tags, sources. |
| `ImportPanel.vue` | Déclenchement et état des imports. |
| `DuplicateReview.vue` | Fusions proposées. |

### 5.3 Stores et services

Règle : **l'interface ne parle qu'à `library`.** `import` écrit dans la base, jamais dans l'écran.

| Fichier | Responsabilité |
|---|---|
| `stores/library.js` | Lecture, écriture, filtres, tri. Seule source de l'UI. |
| `stores/import.js` | Appels n8n, avancement, erreurs. |
| `services/normalize.js` | `matchKey`, mapping des trois formats vers le modèle unique. |
| `services/db.js` | PouchDB + `pouchdb-find` + réplication configurable. |

`normalize.js` isolé est délibéré : c'est le seul endroit où vivent les particularités de chaque
plateforme. Ajouter une source future s'y limitera à une fonction.

### 5.4 Suppressions

**Immédiates** : `src/components/icons/` (cinq composants du gabarit Vue, jamais importés),
`src/views/AboutView.vue` (absent du routeur), le code mort commenté de `Tracklist.vue`, le
gestionnaire fantôme de `DataView.vue`.

**Différées** : `src/data/allPlaylist.js` et `src/data/likedTracks.js` (53 Ko). Tant que l'import
n'est pas vérifié fonctionnel, ces dumps sont le seul jeu de données de secours ; ils servent en
outre de données de test réelles pour `normalize.js`. Ils ne sont retirés qu'après un import réel
réussi.

## 6. Import et synchronisation

### 6.1 Préalable hors dépôt

Les workflows n8n renvoient 500 et doivent être réparés — vraisemblablement une réautorisation
OAuth Spotify et YouTube. **C'est la première tâche du plan**, et elle se fait dans n8n.

### 6.2 Contrat n8n

L'app n'attend que quatre endpoints, identiques pour les trois plateformes. C'est ce qui rend
Deezer ajoutable sans toucher au client.

```
GET /playlists?platform=<spotify|deezer|youtube>
    → [{ id, name, description, trackCount, url }]

GET /tracks?platform=<…>&playlistId=<id>
    → [{ externalId, title, artist, album, addedAt, url }]

GET /tracks?platform=<…>&liked=true
    → idem (morceaux likés / favoris)

GET /resolve?platform=<…>&externalId=<id>
    → { externalId, title, artist, album, url }
```

Les URLs actuelles sont éparpillées et incohérentes (`/webhook/getplaylist`,
`/webhook/playlist?id=`, `/webhook/youtube`, `/webhook/youtube/items`). Les unifier côté n8n
économise une part importante du code client.

**Deezer** n'a aucun workflow existant : c'est une création complète, sur le même contrat.

### 6.3 Chemin d'une donnée

```
n8n → normalize.js → regroupement par _id → bulkDocs (PouchDB) → réplication → CouchDB → autres appareils
```

Un import lancé sur le laptop apparaît sur le téléphone sans action supplémentaire.

### 6.4 Règle de fusion — non négociable

Un réimport **ne touche jamais `note` ni `tags`.** Il met à jour `title`, `artist`, `album`,
fusionne `sources[]`, et laisse le reste intact. Ce qui a été écrit à la main prime toujours sur ce
que la machine réimporte. Un import est donc rejouable indéfiniment, et deux exécutions
consécutives produisent exactement le même état.

### 6.5 Cas YouTube

Une vidéo n'est pas un morceau : son titre est du texte libre
(`Aphex Twin - Windowlicker (Official Video)`). Heuristique de découpage sur le séparateur `-`
avec nettoyage des mentions parasites, et **conservation systématique du titre brut** dans
`sources[].rawTitle`.

La détection est imparfaite par nature : un titre sans tiret produira un morceau à l'artiste vide,
corrigeable à la main depuis `/entree/:id`. Aucune promesse de fiabilité totale n'est faite.

### 6.6 Conflits de réplication

Rares en mono-utilisateur — il faut modifier la même entrée hors ligne sur deux appareils.
**Aucune résolution automatique n'est construite** : PouchDB désigne un gagnant déterministe, et
les entrées en conflit sont signalées discrètement pour arbitrage manuel.

## 7. Mobile et capture rapide

### 7.1 PWA

`vite-plugin-pwa` génère manifeste et service worker. La coquille de l'app est préchargée (JS, CSS,
polices Eras, logo) ; les données viennent d'IndexedDB et jamais du réseau, donc le hors-ligne est
acquis par construction. *Web Share Target* déclaré dans le manifeste : Android en bénéficie, iOS
l'ignore silencieusement.

**Réserve iOS** : Safari purge IndexedDB après environ sept jours sans ouverture.
`navigator.storage.persist()` est appelé au premier lancement, sans garantie que Safari accepte.
Une purge n'est pas une perte de données puisque CouchDB les rapatrie à la réouverture — c'est un
désagrément, pas un risque.

### 7.2 Le geste de capture

Un champ unique, toujours accessible en haut de la bibliothèque.

| Entrée | Comportement |
|---|---|
| URL Spotify / Deezer / YouTube | Plateforme et identifiant extraits **par simple lecture de l'URL, sans réseau**. Création immédiate de `track:<platform>:<id>` marqué `pending`, avec l'URL et l'horodatage. L'entrée est utilisable et annotable aussitôt. |
| Texte libre | Création d'une entrée `artist`. |

Après une capture, **on reste dans la bibliothèque** : le champ se vide et reste prêt, la nouvelle
entrée apparaît en tête de liste (le tri par défaut est « modifié récemment »), et le message de
confirmation porte un lien « Annoter » vers l'écran de détail.

*Décision du 2026-08-18, amendement.* La version initiale de cette spec faisait naviguer vers le
détail après chaque capture. Trois raisons de ne plus le faire : le scénario central — noter trois
noms d'affilée à la sortie d'un concert — devenait pénible ; le message de confirmation
s'affichait juste avant le changement d'écran, donc n'était jamais lu ; et l'annotation reste à un
geste de toute façon. Le seul usage désavantagé est celui où l'on annote systématiquement chaque
ajout, qui paie alors un clic.

L'enrichissement est différé : `GET /resolve` est appelé au retour du réseau et transforme les
entrées `pending` en morceaux complets.

**Tout ce qui précède fonctionne en mode avion** — c'est le scénario d'usage central.

### 7.3 Adaptation aux petits écrans

Sous 768 px, la bibliothèque passe en cartes plutôt qu'en tableau : titre, artiste, badges de
plateforme, début de la note. Le tableau à cinq colonnes actuel est illisible sur téléphone. Les
`@media` dispersés dans les composants sont remplacés par un jeu de règles cohérent.

## 8. Export

Enveloppe versionnée plutôt que tableau nu :

```json
{
  "version": 1,
  "exportedAt": "2026-08-18T14:22:00Z",
  "scope": "playlist:BAT BEAT",
  "tracks": [],
  "artists": []
}
```

- Chaque entrée conserve son `id` : `track:spotify:2VNf…` porte une information réelle — plateforme
  et identifiant d'origine — et rendra possible un import de fichier si la décision 5 est un jour
  révisée.
- `_rev` est retiré : numéro de révision CouchDB dénué de sens hors de Babines.
- Sont conservés : titre, artiste, album, provenances, note, tags, dates.

**Une seule fonction, deux portées.** Elle prend la liste actuellement affichée : sans filtre, toute
la bibliothèque ; avec filtre, ce qui est à l'écran. Le champ `scope` consigne lequel des deux.
Nom de fichier : `babines-2026-08-18.json`, suffixé du filtre le cas échéant.

**Sur téléphone**, le téléchargement par `<a download>` est capricieux dans une PWA iOS.
`navigator.share()` avec le fichier est utilisé quand l'API est disponible, avec repli sur le
téléchargement classique.

Corrige au passage le bug de sérialisation de `PointerEvent`.

## 9. Gestion des erreurs

Le défaut actuel n'est pas l'absence de gestion mais son **silence** : chaque `catch` fait
`console.error` puis renvoie `[]`, rendant une panne indiscernable d'une bibliothèque vide.

| Famille | Traitement |
|---|---|
| **Import** | Échec affiché dans `/import` : plateforme, code HTTP, horodatage, bouton de reprise. Un import partiel indique combien de morceaux sont passés et lesquels ont échoué. Jamais de liste vide sans explication. |
| **Réplication** | Indicateur discret et permanent : *à jour* / *en attente* / *hors ligne* / *erreur d'authentification*. Le hors-ligne est un **état normal**, pas une erreur ; seul l'échec d'authentification alerte, car il ne se résout pas seul. |
| **Écriture locale** | Rare. Le formulaire de capture **conserve la saisie** en cas d'échec. Rien de ce qui est écrit ne doit disparaître. |

## 10. Tests

Aucun test ni lanceur aujourd'hui. Vitest est ajouté, et les tests sont écrits **avant** le code,
conformément à la manière de travailler du projet.

L'effort porte là où il paie :

1. **`normalize.js`, en priorité.** Fonctions pures, donc tests les moins chers et les plus
   rentables : `matchKey` (accents, `Remastered 2011`, `feat.`, `- Live`), découpage des titres
   YouTube, les trois mappings de plateforme. Les dumps `allPlaylist.js` et `likedTracks.js`
   fournissent des données de test **réelles**.
2. **La fusion à l'import**, règle la plus critique du système : `note` et `tags` jamais écrasés,
   `sources[]` fusionné par `(platform, playlistId)` sans doublon, idempotence de deux exécutions
   consécutives.
3. **La migration**, sur des exemplaires des anciens documents.
4. **L'export** : forme de l'enveloppe, absence de `_rev`, cohérence du `scope`.

Les tests touchant la base tournent sur `pouchdb-adapter-memory` — une vraie PouchDB en mémoire,
pas une imitation.

**Hors périmètre de test** : les workflows n8n (hors dépôt) et le rendu visuel.

## 11. Hors périmètre

Explicitement écartés de cette version :

- L'authentification multi-utilisateur (la décision 4 en prépare seulement le terrain).
- L'import de fichier JSON (décision 5).
- Le dédoublonnage cross-plateforme automatique (décision 7 : suggestion uniquement).
- Une application native ou un empaquetage Capacitor (décision 6).
- Toute réconciliation automatique d'identité d'artiste.
- La lecture audio.
