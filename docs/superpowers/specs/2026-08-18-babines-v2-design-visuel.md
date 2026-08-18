# Babines v2 — Refonte visuelle

Date : 2026-08-18
Source : projet Claude Design `01b3c90d`, fichier `Babines v2.dc.html`
Statut : brief d'implémentation

## Ce que la maquette apporte

Une identité nette, dense, un peu brutaliste : fond crème, surfaces blanches cernées d'un trait fin, en-tête noir collant, jaune vif en accent, typographie à trois voix. Rien n'est arrondi sauf les trois pastilles de chiens, qui restent la signature du produit.

## Décision d'adaptation, à connaître avant de lire la suite

**La maquette dessine l'ancienne architecture** : une colonne de playlists, une navigation « Spawtify / Youtruffe / Appariement », un tableau de morceaux par playlist.

La v2 a tranché l'inverse (décision 1 de la spec) : le bloc-note est central, les playlists ne sont plus des écrans mais des filtres, et les plateformes ne sont plus des sections mais des provenances.

**On reprend donc le langage visuel de la maquette, pas son plan de navigation.** Réintroduire la navigation par playlists défferait la décision structurante du projet.

La correspondance retenue :

| Maquette | v2 |
|---|---|
| En-tête noir + recherche + décompte | `AppHeader` enrichi : logo, champ de recherche global, décompte |
| Colonne « Playlists » | Colonne de filtres : type, plateforme, playlist, tag |
| Carte « Noter une découverte » | `QuickAdd` — un seul champ, pas trois : la v2 devine ce qu'on lui colle |
| Tableau de morceaux | `LibraryList` / `EntryRow` |
| Trois pastilles rondes à droite | Sources, Doublons, Export |
| Pied de page | Identique |

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
