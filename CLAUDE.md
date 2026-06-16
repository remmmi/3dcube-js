# CLAUDE.md

Guide pour travailler sur ce depot avec Claude Code.

## Vue d'ensemble

Page web HTML5 autonome affichant un cube 3D interactif a cote d'une
representation matricielle de ses sommets. Tout tient dans un seul fichier :
`index.html` (HTML + CSS + JavaScript integres, aucune dependance locale).

Three.js est charge depuis un CDN (jsDelivr) via un import map.

## Structure

- `index.html` : toute l'application (mise en page, scene 3D, logique).
- `docs/bfs.md` : explication du parcours en largeur (BFS) et des maths du
  cube qui roule (groupe S4, invariant de parite, atteignabilite).
- `LICENSE` : licence MIT.

## Fonctionnalites de la page

- Colonne gauche : matrice 8x3 des sommets A..H (coordonnees monde, mises a
  jour en temps reel).
- Colonne centrale : scene Three.js. Axe Z vertical, sol en grille, axes X
  (rouge), Y (vert), Z (bleu) colores et gradues.
- Colonne droite : sauvegardes d'etats, nommees par la sequence de mouvements
  qui y mene (H, B, G, D). Clic pour recharger, croix pour supprimer.
- Roulement du cube par fleches (clavier ou boutons) : bascule de 90 degres
  autour d'une arrete au sol, comme un de qui roule.
- OrbitControls (souris) : deplace seulement la camera, sans modifier la
  matrice.
- Bouton Reinitialiser : remet le cube a sa pose d'origine.

## Conventions

- Pas d'emojis ni de caracteres speciaux dans le code.
- Code commente en francais.
- Three.js : version recente via import map ; init enveloppee dans un
  try/catch avec message d'erreur si WebGL indisponible ou CDN inaccessible.

## Lancer en local

Les modules ES exigent un serveur HTTP (pas de file://) :

    python3 -m http.server 8777

Puis ouvrir http://localhost:8777/index.html
