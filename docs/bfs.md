# BFS et mathematiques du cube qui roule

Ce document explique l'algorithme utilise pour trouver des sequences de
mouvements du cube, et les mathematiques qui decrivent ce qui est atteignable.

## 1. Le modele

Le cube roule sur une grille horizontale. Chaque fleche le fait basculer de
90 degres autour d'une arrete posee au sol, et le deplace d'une case :

- Haut   : rotation Rx(-90), case y += 1
- Bas    : rotation Rx(+90), case y -= 1
- Droite : rotation Ry(+90), case x += 1
- Gauche : rotation Ry(-90), case x -= 1

Un etat du cube est le couple (orientation, case) :

- orientation : une matrice de rotation 3x3 (24 valeurs possibles) ;
- case : la position entiere (x, y) du coin minimal du cube sur la grille.

Comme chaque roulement applique une rotation fixe du monde (independante de la
position), l'orientation finale est simplement le produit des matrices des
mouvements, multipliees a gauche.

## 2. Le BFS (parcours en largeur)

BFS signifie Breadth-First Search. On voit le probleme comme un graphe :

- noeud = un etat (orientation, case) ;
- arete = une fleche menant d'un etat a un autre.

Le BFS explore le graphe par cercles concentriques autour de l'etat de depart :
d'abord tous les etats a 1 coup, puis a 2 coups, etc. Il utilise une file
(FIFO) des etats a traiter et un ensemble des etats deja vus.

    file = [depart] ; vus = {depart}
    tant que file non vide :
        etat = file.defiler()
        si etat == cible : retourner le chemin
        pour chaque fleche :
            suivant = appliquer(fleche, etat)
            si suivant pas dans vus :
                vus.ajouter(suivant)
                file.enfiler(suivant)

Propriete cle : comme on traite les etats par profondeur croissante, la
premiere fois que l'on atteint la cible, c'est par un plus court chemin. Cela
n'est garanti que parce que toutes les aretes ont le meme cout (un coup). Avec
des couts differents il faudrait Dijkstra ou A*.

### Exemples de resultats

- Atteindre l'orientation Rz(180) sans contrainte de position : minimum 4 coups,
  par exemple Haut, Haut, Droite, Droite.
- Atteindre Rz(180) en revenant sur la case de depart : minimum 6 coups,
  Haut, Droite, Bas, Bas, Gauche, Haut. La boucle se ferme parce que le
  deplacement net doit s'annuler (autant de Haut que de Bas, autant de Droite
  que de Gauche).

## 3. Quels couples (case, orientation) sont atteignables

A chaque case, seules 12 des 24 orientations sont atteignables. L'autre moitie
est impossible, quel que soit le nombre de coups.

### L'invariant de parite

La preuve repose sur deux parites verrouillees ensemble.

Parite de la case : (x + y) mod 2. C'est le coloriage en damier. Chaque coup
deplace d'une case, donc inverse cette parite.

Parite de l'orientation : le groupe des 24 rotations du cube est isomorphe a
S4 (le groupe symetrique des permutations des 4 grandes diagonales du cube).
Chaque roulement est une rotation de 90 degres autour d'une face, ce qui
correspond a un 4-cycle dans S4, donc une permutation impaire (signature -1).
Chaque coup inverse donc aussi la parite de l'orientation.

Comme les deux parites s'inversent en meme temps a chaque coup, leur
combinaison est conservee :

    signature(orientation) * (-1)^(x + y) = constante

Au depart (identite, case (0,0)) cet invariant vaut +1. Donc tout etat
atteignable respecte : sur une case paire l'orientation est paire (les 12
rotations de A4), sur une case impaire l'orientation est impaire. Tout couple
qui viole cette regle est inatteignable.

### Exemple concret

Rz(180) est une permutation paire (un double-transposition dans S4). On peut
donc l'obtenir sur la case (0,0) (paire), mais jamais sur la case (1,0)
(impaire), quel que soit le nombre de coups.

## 4. Les outils mathematiques

1. Theorie des groupes : les 24 rotations du cube forment un groupe isomorphe
   a S4 (action sur les 4 grandes diagonales).
2. Signature (morphisme S4 vers {+1, -1}) : mesure la parite d'une
   permutation ; un roulement est un 4-cycle, donc impair.
3. Invariant : une fonction des etats que chaque mouvement preserve. Un
   invariant qui distingue depart et cible prouve l'impossibilite. C'est la
   meme technique que pour le taquin (15-puzzle) ou le Rubik's cube.
4. Reciproque (atteignabilite) : montrer que l'invariant est la seule
   obstruction se fait en verifiant, par BFS, que les 12 orientations
   autorisees sont bien toutes atteintes.

C'est le meme raisonnement que pour prouver qu'on ne peut pas resoudre un
Rubik's cube avec un seul coin tourne : on trouve un invariant que les
mouvements autorises ne changent jamais.
