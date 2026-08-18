# PouchDB Server sur o2switch — Design

Date : 2026-08-18
Statut : validé, prêt pour le plan d'implémentation
Branche : `new-bdd`

## 1. Intention

Mettre en service la synchronisation multi-appareils de Babines, aujourd'hui inexistante :
`VITE_COUCHDB_URL` est vide et l'application tourne en local pur.

La solution retenue est d'héberger **`express-pouchdb`** — qui implémente l'API HTTP de CouchDB — dans
une application Node.js sur l'hébergement o2switch existant, via l'outil cPanel « Setup Node.js App »,
inclus sans surcoût sur tous les plans.

### Pourquoi cette solution plutôt qu'une autre

Deux pistes ont été explorées puis écartées.

**Supabase** fournit base, API et authentification, mais n'apporte pas le hors-ligne — objectif produit
n°2 de la spec Babines v2 — et son palier gratuit met le projet en pause après une semaine
d'inactivité, ce qui est rédhibitoire pour un bloc-note qu'on n'ouvre pas tous les jours.

**PostgreSQL sur o2switch avec une API PHP** était viable mais coûteux : un navigateur ne peut pas
parler à Postgres, il aurait donc fallu écrire et maintenir un backend complet — protocole de
synchronisation, authentification, sécurité — pour un résultat fonctionnellement identique. Cette
spec a été rédigée puis abandonnée au profit de la présente.

`express-pouchdb` parlant nativement le protocole que PouchDB attend déjà, **le code client ne change
pas**. C'est le critère qui a tranché.

## 2. Ce qui ne change pas

Aucune ligne de :

- `src/services/merge.js` — résolution de conflits et règles du domaine
- `src/services/migrate.js`, `src/services/normalize.js`, `src/services/exportLibrary.js`
- `src/stores/library.js`, `src/stores/import.js`
- Les 175 tests existants

Le hors-ligne est préservé sans être réécrit : PouchDB reste la base du navigateur, et la réplication
bidirectionnelle continue est déjà implémentée.

## 3. Architecture

```
Navigateur — Vue + PouchDB local (inchangé)
   │ protocole de réplication CouchDB, sur HTTPS
   ▼
App Node sur o2switch, cPanel « Setup Node.js App », montée sur /db
   express + express-pouchdb
   │
   ▼
LevelDB dans ~/babines-data/
```

### Même origine, et ce que cela résout

L'application Node est montée sur un chemin du même domaine que le site : `/` sert la SPA, `/db` sert
l'API CouchDB. `VITE_COUCHDB_URL` devient donc **`/db`**, un chemin relatif.

Conséquences, toutes acquises d'un coup :

- **Aucun CORS** à configurer.
- **Rien de secret dans le bundle.** C'est précisément ce qui rendait un CouchDB hébergé impraticable
  pour un client navigateur : l'URL et ses identifiants y étaient compilés, donc publics. Il ne reste
  que l'écran de connexion, et le secret vit côté serveur.
- Le cookie de session est de première partie, sans `SameSite=None` — que les navigateurs restreignent
  de plus en plus.

En développement, un proxy `/db` dans `vite.config.js` renvoie vers o2switch, de sorte que le
développement soit lui aussi en même origine.

### Le chemin relatif doit être rendu absolu — vérifié, et non supposé

**PouchDB choisit son adaptateur d'après la forme du nom qu'on lui passe.** Tout ce qui ne commence
pas par `http:` ou `https:` est traité comme une base **locale**. Vérifié empiriquement sur la version
du projet :

```
"/db/babines"              → adapter: leveldb   ← une base locale, pas une réplication
"https://x.test/db/babines" → adapter: http
```

Passer `/db` tel quel à `startReplication()` ne produirait donc aucune erreur : PouchDB créerait une
**seconde base locale** et y répliquerait la première. L'indicateur de synchronisation afficherait
« à jour », et rien n'atteindrait le serveur. C'est le pire type de panne — silencieuse, sans message,
sans donnée manquante à l'écran.

`startReplication()` doit donc résoudre l'URL avant de construire la base distante :

```js
// PouchDB choisit son adaptateur d'après la forme du nom : tout ce qui ne
// commence pas par http(s) devient une base locale. Une URL relative
// créerait une seconde base locale au lieu de répliquer, sans rien signaler.
const absolu = /^https?:/i.test(url) ? url : new URL(url, globalThis.location.origin).href
```

C'est la seule modification de `src/services/db.js`, et elle préserve les URLs absolues déjà
acceptées.

### Un piège qui disparaît

Les applications Node de cPanel vivent **hors de `public_html`**. Le `rsync --delete` du déploiement,
qui aurait effacé une API PHP placée dans la racine web, ne peut pas atteindre le serveur Node.

## 4. Authentification

C'est le seul chantier réel de cette transition.

`express-pouchdb` embarque `pouchdb-auth` et expose `_session` à la manière de CouchDB. Côté client,
le greffon `pouchdb-authentication` fournit `logIn()` et `logOut()`.

```
POST /db/_session   { name, password }  →  cookie de session
réplication          avec le cookie      →  autorisée
sans session                             →  401
```

**Séquence au démarrage :** l'application charge la bibliothèque locale et fonctionne immédiatement —
le hors-ligne étant l'état normal, l'absence de session n'est pas bloquante. La réplication ne démarre
qu'une fois la session obtenue ; un 401 la suspend et l'écran de connexion réapparaît.

**Reprise de l'existant :** `classifyReplicationError` traite déjà 401 et 403 comme `auth-error`, et la
spec Babines v2 pose cet état comme le seul qui doive alerter, parce qu'il ne se résout pas seul.
L'expiration de session s'affichera donc sans code supplémentaire.

**Un compte, un mot de passe.** Le multi-utilisateur est hors périmètre. L'administrateur est créé à la
main au premier démarrage, jamais versionné.

**Limite assumée :** un point d'entrée de connexion exposé sur internet est attaquable par force brute.
La mesure retenue est un mot de passe long généré aléatoirement. C'est proportionné à un bloc-note
mono-utilisateur, pas à un service public.

## 5. Fichiers

| | Fichier | Rôle |
|---|---|---|
| Nouveau | `server/app.js` | express + express-pouchdb, point d'entrée Passenger |
| Nouveau | `server/package.json` | Dépendances du serveur, séparées de celles de la SPA |
| Nouveau | `server/README.md` | Procédure cPanel : création de l'app, chemins, création de l'admin |
| Nouveau | `src/components/LoginPanel.vue` | Écran de connexion |
| Modifié | `src/services/db.js` | Résolution de l'URL relative en absolue (§3) |
| Modifié | `src/main.js` | La réplication démarre après la session, plus au chargement |
| Modifié | `vite.config.js` | Proxy `/db` en développement |
| Modifié | `.env.example` | `VITE_COUCHDB_URL=/db` |
| Modifié | `package.json` | Ajout de `pouchdb-authentication` |

`server/` a son propre `package.json` : cPanel installe les dépendances depuis le répertoire de
l'application, et l'arbre du serveur ne doit pas polluer celui de la SPA.

## 6. Compatibilité des versions

Le client est en `pouchdb@^9`. `express-pouchdb@4.2.0` embarque un arbre daté — `pouchdb-find@^7`,
`express@^4`, `uuid@^3`, `mkdirp@^0.5`.

Ce n'est pas bloquant : les deux vivent dans des processus distincts avec des arbres de dépendances
séparés, et **la réplication se fait au niveau du protocole HTTP CouchDB**, stable entre ces versions.
À savoir toutefois : `npm audit` sur `server/` remontera des avertissements issus de ces dépendances
anciennes, et non du code de Babines.

Dernière publication d'`express-pouchdb` : août 2025. Le paquet n'est pas abandonné, mais il n'est pas
activement développé. Acceptable pour un usage personnel ; à réévaluer si Babines devait servir
d'autres utilisateurs.

## 7. Hypothèses à valider au premier déploiement

Ces trois points n'ont pas été vérifiés — la conception a été faite sans spike, par choix explicite.
Chacun est accompagné du repli à prendre s'il tombe.

**Le modèle de processus.** Passenger peut lancer plusieurs workers. Le stockage LevelDB prend un
verrou exclusif : un second processus échouerait à l'ouvrir, ou corromprait la base. *Repli :*
contraindre l'application à un seul processus dans la configuration cPanel ; si c'est impossible,
changer d'adaptateur de stockage.

**La mise en veille.** Passenger arrête les applications inactives et les relance à la demande. Un
délai au réveil est sans importance pour une synchronisation. *Repli :* si des écritures se perdent
lors d'un arrêt, réduire la fenêtre en synchronisant plus souvent, ou solliciter l'application
périodiquement.

**Les sauvegardes.** Les fichiers LevelDB vivent dans l'espace utilisateur, sans le filet d'un service
managé. *Repli :* l'export JSON complet existe déjà dans l'application et fait office de sauvegarde
manuelle.

## 8. Tests

Le périmètre de test nouveau est mince, et c'est un effet recherché : la réplication et la fusion,
qui portent la complexité, sont déjà couvertes par les 175 tests existants et ne sont pas touchées.

À couvrir :

- **La résolution d'URL du §3**, et c'est le test le plus important de cette transition : une URL
  relative doit produire une base distante en `http`, pas une base locale. Sans lui, la panne
  silencieuse décrite au §3 pourrait réapparaître à la première refactorisation sans que rien ne la
  signale.
- Le câblage de la connexion : la réplication ne démarre pas sans session ; un 401 la suspend et fait
  réapparaître l'écran ; une session obtenue la démarre. `fetch` bouchonné, sur le modèle de
  `import.test.js`.

`express-pouchdb` est une bibliothèque tierce : on ne la teste pas, on l'assemble. `server/app.js` sera
vérifié par intégration au premier déploiement.

## 9. Dépendance : le déploiement

Il n'existe aujourd'hui aucun moyen automatique d'envoyer quoi que ce soit sur o2switch. Le workflow
`o2switch.yml` a été supprimé (commit `7ac1bbc`) et sa clé SSH n'a jamais été acceptée par le serveur —
le diagnostic s'était arrêté sur une clé valide mais non autorisée côté cPanel.

Le serveur Node se déploie de toute façon différemment de la SPA : ses fichiers vont dans le répertoire
de l'application, et cPanel y lance `npm install`. Un dépôt manuel par SSH ou FTP suffit pour le
premier déploiement.

Cette dépendance est réelle mais moins bloquante qu'elle ne l'était pour la solution PHP : le serveur
Node se met en place une fois et bouge peu, contrairement à la SPA qu'on redéploie à chaque changement.

## 10. Hors périmètre

- Le multi-utilisateur : un compte, une bibliothèque.
- Le rétablissement du déploiement automatique de la SPA.
- Le renforcement de l'authentification au-delà du §4.
- Le remplacement de PouchDB côté navigateur : la base locale reste, et avec elle le hors-ligne.
- Toute reprise de données : la bibliothèque est locale, la première réplication la pousse
  intégralement. `migrate.js` continue de traiter l'ancien schéma au chargement.
