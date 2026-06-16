# 3dcube-js

Cube 3D interactif en HTML5 avec representation matricielle de ses sommets.
Tout tient dans un seul fichier `index.html` (Three.js charge via CDN).

## Fonctionnalites

- Matrice 8x3 des sommets A..H, en coordonnees monde, mise a jour en temps reel.
- Scene Three.js : axe Z vertical, grille au sol, axes X (rouge), Y (vert),
  Z (bleu) colores et gradues.
- Roulement du cube par fleches (clavier ou boutons) : bascule de 90 degres
  autour d'une arrete au sol, comme un de qui roule.
- OrbitControls a la souris : deplace la camera sans modifier la matrice.
- Bouton Reinitialiser et sauvegarde d'etats nommes par leur sequence de
  mouvements (clic pour recharger, croix pour supprimer).

## Lancer en local

Les modules ES exigent un serveur HTTP (pas de file://) :

    python3 -m http.server 8777

Puis ouvrir http://localhost:8777/index.html

## Documentation

- `docs/bfs.md` : parcours en largeur (BFS) et mathematiques du cube qui roule.

## Licence

MIT. Voir `LICENSE`.
