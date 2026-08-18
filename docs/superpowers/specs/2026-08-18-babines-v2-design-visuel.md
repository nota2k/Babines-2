# Babines v2 — Refonte visuelle

Date : 2026-08-18
Source : projet Claude Design `01b3c90d`, fichier `Babines v2.dc.html`
Statut : brief d'implémentation

## Ce que la maquette apporte

Une identité nette, dense, un peu brutaliste : fond crème, surfaces blanches cernées d'un trait fin, en-tête noir collant, jaune vif en accent, typographie à trois voix. Rien n'est arrondi sauf les trois pastilles de chiens, qui restent la signature du produit.

## Décision d'adaptation, à connaître avant de lire la suite

*Amendée le 2026-08-18 à la demande de la partenaire humaine : « je veux garder aussi la navigation
par playlist ».*

La maquette dessine une colonne de playlists cliquables. La spec v2 avait fait des playlists un
simple filtre (décision 1 : le bloc-note est central). **Les deux tiennent ensemble** — et c'est la
colonne de la maquette qui gagne.

La raison est qu'il n'y a pas de contradiction technique : choisir une playlist *reste* un filtre
sur `sources[].playlistName`. Le modèle de données ne change pas, le getter `library.playlists`
existe déjà, et le store expose déjà `playlist` comme critère. Ce qui change est la présentation :
une colonne parcourable au lieu d'une liste déroulante noyée dans la barre de filtres. C'est
nettement plus utilisable, et ça ne coûte rien au bloc-note — « Tous mes morceaux » reste en tête de
liste et reste l'état par défaut.

Ce qu'on ne reprend **pas** de la maquette : la navigation par plateforme en haut à droite
(« Spawtify / Youtruffe / Appariement »). Les plateformes restent des provenances affichées en
pastilles sur chaque entrée, et un filtre parmi d'autres — pas des sections séparées. C'est cette
séparation-là que la v2 a abandonnée, et à raison : un morceau présent sur deux plateformes
n'appartient à aucune des deux sections.

La correspondance retenue :

| Maquette | v2 |
|---|---|
| En-tête noir + recherche + décompte | `AppHeader` enrichi : logo, champ de recherche global, décompte |
| Colonne « Playlists » | **Conservée telle quelle** : liste parcourable, « Tous mes morceaux » en tête, décompte par playlist, sélection = filtre `library.playlist` |
| Navigation par plateforme | Non reprise — les plateformes restent des provenances et un filtre |
| Carte « Noter une découverte » | `QuickAdd` — un seul champ, pas trois : la v2 devine ce qu'on lui colle |
| Tableau de morceaux | `LibraryList` / `EntryRow` |
| Trois pastilles rondes à droite | Sources, Doublons, Export |
| Pied de page | Identique |

### La colonne des playlists, en détail

- Alimentée par le getter `library.playlists` (noms uniques tirés de `sources[]`), avec en tête une
  entrée « Tous mes morceaux » qui vide le filtre.
- Le décompte de chaque playlist se calcule sur les entrées dont une provenance porte ce nom.
- La sélection écrit dans `library.playlist` — donc la barre de filtres et la colonne restent
  cohérentes, quelle que soit celle qu'on utilise.
- Les autres filtres (type, plateforme, tag, recherche) continuent de s'appliquer **par-dessus** la
  playlist choisie : on peut chercher « live » dans une playlist précise.
- Une bibliothèque sans playlist importée n'affiche que « Tous mes morceaux » — la colonne ne doit
  pas devenir un trou vide quand rien n'est encore importé.

Les trois pastilles retrouvent ainsi un usage réel : `dog_1` pour les sources (l'import), `dog_2` pour les doublons, `dog_3` pour l'export — dont le libellé « Expaw » de la maquette mérite d'être gardé.

## Jetons

À définir en variables CSS dans `src/assets/base.css`, et à n'utiliser que par ces noms.

### Couleurs

| Variable | Valeur | Usage |
|---|---|---|
| `--fond` | `#f4f2ed` | fond de page |
| `--surface` | `#ffffff` | cartes, lignes |
| `--surface-douce` | `#faf9f6` | champs, barres secondaires |
| `--trait` | `#e6e2d8` | bordures de cartes |
| `--trait-fin` | `#f4f1ea` | séparateurs de lignes |
| `--encre` | `#111111` | texte principal, en-tête |
| `--encre-douce` | `#6b6b6b` | métadonnées |
| `--encre-tres-douce` | `#8a8a8a` | numéros, indices |
| `--jaune` | `#ffe13f` | accent, survol, sélection |
| `--alerte` | `#b00020` | erreurs (conservé de l'existant) |
| `--alerte-fond` | `#ffe9ec` | fond des erreurs (conservé) |

Le `--yellow` existant devient `--jaune` ; garder `--yellow` en alias tant que du code l'utilise.

### Typographie

Trois familles, chargées depuis Google Fonts :

- **Space Grotesk** 500/700 — titres, étiquettes en capitales
- **DM Sans** 400/500/700 — texte courant
- **DM Mono** 400 — nombres, dates, décomptes, tout ce qui s'aligne

Les polices Eras actuelles (`src/assets/fonts/*.TTF`) ne sont plus utilisées par la maquette. **Ne pas les supprimer dans cette passe** : leur retrait touche la configuration de précache de la PWA et mérite sa propre vérification.

Étiquette en capitales, motif récurrent :
`font-family: 'Space Grotesk'; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;`

### Formes et mouvement

- Aucun arrondi, sauf les pastilles (`border-radius: 100%`).
- Bordures de 1px en `--trait`.
- Transitions : `.15s linear` sur `background-color`, `color`, `border-color`.
- Survol d'une ligne de liste : fond `--jaune`.
- Animation des chiens, conservée telle quelle :
  `@keyframes helloDogs { 0% { transform: rotate(-16deg); } 100% { transform: rotate(4deg); } }`
  appliquée en `.8s infinite alternate-reverse ease-in-out both`.

### Mise en page

- Largeur maximale `1560px`, marges `clamp(16px, 2.6vw, 36px)`.
- Trois colonnes en flex qui se replient : filtres `1 1 220px`, contenu `999 1 min(100%, 380px)`, pastilles `1 1 128px`.
- L'en-tête est collant (`position: sticky; top: 0`), la colonne des pastilles aussi (`top: 96px`).

## Ce qui ne change pas

La refonte est **visuelle**. Aucun comportement, aucune donnée, aucun message d'erreur ne change. En particulier :

- les états distincts « chargement » / « bibliothèque vide » / « aucun résultat » restent trois messages différents ;
- `library.error` reste affiché sur chaque écran, avec `role="alert"` ;
- la capture reste à un seul champ qui devine, et ne vide la saisie qu'après écriture réussie ;
- la fusion de doublons reste manuelle et nommée ;
- les 130 tests doivent rester verts sans modification.

Si une exigence de la maquette entre en conflit avec un comportement existant, **le comportement gagne** — et le conflit se signale.
