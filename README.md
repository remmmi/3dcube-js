# 3dcube-js

Jumeau numerique d'un cube physique d'escape-room (Arduino + MPU-6050 a terme).
On fait rouler un cube 3D pour dechiffrer un code ; une matrice 8x3 affiche les
coordonnees monde de ses sommets en temps reel. Three.js est charge via CDN.

Le code separe un coeur portable (transposable en C++) d'un banc de
developpement navigateur.

## Structure

- `index.html` : page, import map Three.js, montage du banc.
- `src/core/` : coeur portable, sans dependance navigateur (orientation entiere
  M, position, classification des roulements repere corps vers monde).
- `src/challenges/` : moteur de defis modulaire et modules de defi (Defi 1).
- `src/bench/` : couche navigateur (scene Three.js, matrice, source de mouvement
  simulee, indicateur de flash) ; remplacee par le firmware au portage.
- `tests/` : tests Node du coeur et des defis.
- `docs/superpowers/specs/` et `docs/superpowers/plans/` : design et plan.

## Defi 1

Le cube flashe un code (1 = Haut, 2 = Droite, 3 = Bas, 4 = Gauche). Le premier
coup calibre le cube (non compte) ; il faut ensuite suivre la sequence demandee
sur 6 coups. La detection du roulement est independante de l'orientation de
depart : c'est la memoire d'orientation, et non une boussole, qui distingue par
exemple l'etat initial d'un demi-tour autour de Z.

## Fonctionnalites de la vue

- Matrice 8x3 des sommets A..H, coordonnees monde, mise a jour en temps reel.
- Scene Three.js : axe Z vertical, grille au sol, axes X (rouge), Y (vert),
  Z (bleu) colores et gradues.
- Roulement du cube par fleches (clavier ou boutons), bascule de 90 degres.
- OrbitControls a la souris : deplace la camera sans modifier la matrice.
- Voyant lumineux (LED simulee), bouton Reinitialiser et sauvegarde d'etats.

## Lancer en local

Les modules ES exigent un serveur HTTP (pas de file://) :

    python3 -m http.server 8777

Puis ouvrir http://localhost:8777/index.html

## Tests

    node --test "tests/**/*.test.mjs"

## Documentation

- `docs/bfs.md` : parcours en largeur (BFS) et mathematiques du cube qui roule.
- `docs/superpowers/specs/` : spec de design du cube escape-room.

## Licence

MIT. Voir `LICENSE`.
