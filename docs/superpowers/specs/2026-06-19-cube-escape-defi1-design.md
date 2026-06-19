# Cube escape-room - Defi 1 (dechiffrage sur 6 coups)

Date : 2026-06-19

Spec de design. Decrit le modele JS du cube d'escape-room et son premier
module de defi. Tout est pense pour un portage ulterieur sur Arduino +
MPU-6050, donc chaque decision algorithmique est notee pour ce portage.

## 1. Objectif

Concevoir un cube physique (modelise d'abord en JS) qui propose des defis.
Le premier defi : l'utilisateur doit dechiffrer un code en faisant rouler le
cube dans la bonne suite de directions, sur 6 coups valides.

Contrainte centrale : **quelle que soit l'orientation de depart du cube, la
mesure du mouvement doit se faire et le cube doit savoir comment il a ete
bouge**. Sans boussole (le MPU-6050 n'a pas de magnetometre), le cube ne
connait pas son cap absolu Nord-Sud. La solution retenue ne s'appuie jamais
sur un cap absolu : le premier coup est une calibration pure qui fixe le
referentiel, et tout le reste est relatif a ce referentiel.

## 2. Principe directeur

**Le coeur ne depend de rien ; tout le reste depend du coeur via des
interfaces.**

On n'implemente que le strict necessaire au Defi 1, mais chaque frontiere est
un point d'extension, pas un mur. Aucune decision du Defi 1 ne doit condamner
une evolution future (historique des coups, magnetometre, plusieurs defis,
portage Arduino).

## 3. Decisions verrouillees

- **Etat = une seule orientation M** (matrice de rotation 3x3 entiere, 24
  valeurs possibles) plus une position, tous deux obtenus par dead-reckoning
  et **independants du chemin** parcouru. Pas d'historique de coups dans le
  coeur.
- **Detection du roulement en repere corps** : le gyro mesure un pic d'environ
  90 degres autour d'un axe du cube. La detection se fait donc dans le repere
  du cube, pas du monde, ce qui la rend valable quelle que soit l'orientation.
- **M figee au repos** : entre deux roulements, on ne met pas a jour M (evite
  la derive d'integration du gyro a l'arret).
- **Garde face-au-sol par accelerometre** : au repos, la gravite indique quelle
  face est en bas. Sert de controle de coherence (tilt), mais ne donne aucun
  cap (yaw-blind).
- **Premier coup = calibration pure**, non compte dans la sequence.
  L'orientation Nord-Sud reelle au depart est indifferente.
- **Sequence cible aleatoire de 6 directions**, validee une par une.
- **Mauvais coup = reset du module + recalibration** au coup suivant (option A).
- **Pas de probleme de parite / atteignabilite** pour le Defi 1 : on impose une
  direction monde par coup, pas un couple (case, orientation) cible.

## 4. Architecture

Trois couches separees, communiquant par interfaces explicites.

    [ Source de mouvement ]      [ Coeur ]            [ Gestionnaire de defis ]
     entrees clavier / vue 3D --> CubeState      -->  GestionnaireDefis
     (roulements repere corps)    (M, position)       -> ModuleDefi (Defi 1)
                                                       -> Indicateur (flash)

- **Source de mouvement** (`SourceMouvement`) : transforme une intention de
  roulement en evenement *roulement detecte en repere corps* (axe local +
  signe), exactement ce que fournira le gyro MPU-6050. En JS, l'implementation
  derive le roulement corps a partir de M et de la direction monde demandee par
  l'utilisateur (clavier ou bouton), de facon a simuler fidelement le capteur
  et ne jamais court-circuiter la classification corps vers monde.
- **Coeur** (`CubeState`) : maintient M et position, traduit un roulement corps
  en direction monde, emet un evenement par roulement.
- **Gestionnaire de defis** (`GestionnaireDefis`) : detient une liste de
  modules, route les coups vers le module actif.
- **Module de defi** (`ModuleDefi`) : regles d'un defi. Le Defi 1 en est la
  premiere implementation. Pilote l'`Indicateur`.
- **Indicateur** (`Indicateur`) : sorties d'affichage (flash N fois,
  clignotement d'erreur, flash de la prochaine orientation demandee). En JS,
  un element DOM ; en Arduino, une LED.

Seules la source de mouvement (cote entree) et l'indicateur (cote sortie) sont
adherents au navigateur. Le coeur et les defis sont des fonctions pures sur des
entiers, sans dependance a Three.js ni au DOM.

## 5. Le coeur CubeState

### Etat interne

- `M` : matrice de rotation 3x3 entiere, orientation courante du cube.
- `position` : `{x, y}` entiers, dead-reckoning du coin minimal sur la grille.

### API

- `appliquerRoulementBody(axeCorps, signe)` : applique un roulement exprime
  dans le repere du cube (ce que mesure le gyro). Met a jour M et position,
  emet l'evenement de roulement.
- `classifierDirectionMonde(axeCorps, signe)` : renvoie la direction monde
  (Haut, Bas, Droite, Gauche) correspondant a ce roulement corps, compte tenu
  de M. Operation pure (ne modifie pas l'etat). C'est elle qui rend le defi
  independant de l'orientation de depart.
- `reset()` : remet M a l'identite et la position a l'origine. Utilise a la
  calibration.
- `corrigerOrientationAbsolue(M_absolue)` : point d'injection laisse inutilise
  pour le Defi 1. Si une source de cap absolu (magnetometre) est ajoutee plus
  tard, elle recale M sans toucher au reste. Garde la porte ouverte sans cout
  immediat.
- `surRoulement(callback)` : abonnement aux evenements de roulement.

### Modele mathematique

Un roulement corps autour de l'axe local `a` correspond, dans le monde, a l'axe
`M . a`. On lit la composante horizontale de `M . a` pour decider Haut, Bas,
Droite ou Gauche, puis on compose M par multiplication a gauche de la matrice
du roulement, comme documente dans `docs/bfs.md`. La classification corps vers
monde est l'inverse du raisonnement monde vers corps utilise pour le BFS.

Conventions de roulement (reprises de `docs/bfs.md`) :

- Haut   : Rx(-90), position y += 1
- Bas    : Rx(+90), position y -= 1
- Droite : Ry(+90), position x += 1
- Gauche : Ry(-90), position x -= 1

### Evenement de roulement emis

`{ axeCorps, signe, directionMonde, M_avant, M_apres, position }`

Le coeur reste minimal mais cet evenement suffit a reconstituer un historique
complet a posteriori : un futur module d'historique n'a qu'a s'abonner, sans
modifier le coeur.

## 6. Le gestionnaire de defis et l'interface ModuleDefi

### GestionnaireDefis

Detient une liste de modules enregistres et route les coups vers le module
actif. Pour le Defi 1 il n'en contient qu'un, mais la structure permet d'en
enregistrer plusieurs et d'en activer ou chainer sans refonte.

API : `enregistrer(module)`, `activer(id)`, `onCoupRecu(directionMonde)`.

### ModuleDefi (contrat commun)

- `init()` : demarre le module, prepare son etat interne.
- `onCalibration()` : recoit le premier coup (non compte) ; sert a fixer le
  referentiel.
- `onCoup(directionMonde)` : recoit chaque coup suivant, deja classifie par le
  coeur en direction monde.
- `onReset()` : remet le module a zero (apres un mauvais coup).
- emet des evenements d'affichage via l'`Indicateur`.

Le coeur ne connait pas les regles d'un defi ; un defi ne connait pas la
trigonometrie du cube. On peut charger un autre module sans toucher au coeur.

## 7. Le Defi 1 (dechiffrage sur 6 coups)

Code de flash des directions : 1 = Haut, 2 = Droite, 3 = Bas, 4 = Gauche.

Deroulement :

1. `init()` : genere une sequence cible aleatoire de 6 directions ; indice de
   progression a 0 ; etat = attente de calibration.
2. Premier coup : `onCalibration()`. Le coeur fait `reset()` (M = identite,
   position a l'origine). Ce coup ne compte pas. On passe en etat actif et on
   flashe la premiere cible.
3. Pour chaque cible, on attend un coup ; `onCoup(directionMonde)` compare la
   direction monde a la cible courante :
   - **Bon coup** : pause 1 s, on incremente l'indice, on flashe la cible
     suivante. Si l'indice atteint 6, le defi est resolu.
   - **Mauvais coup** : clignotement d'erreur (6 Hz pendant 3 s), `onReset()`,
     on repasse en attente d'un coup de recalibration avant de reprendre la
     sequence depuis le debut.

Validation une par une : on ne remet pas le monde physique a zero entre les
coups ; on valide la direction monde de chaque roulement contre la cible
courante. C'est la memoire d'orientation M (et non un cap absolu) qui permet de
distinguer, par exemple, l'etat initial d'un etat tourne de 180 degres autour
de Z apres quelques coups.

## 8. Tests (sur le coeur, ou est tout le risque)

- `classifierDirectionMonde` correcte apres une suite de roulements quelconques
  (cube culbute dans une orientation arbitraire).
- Desambiguisation init contre Rz(180) : deux etats de gravite identiques mais M
  differents donnent des classifications differentes pour un meme roulement
  corps. C'est le test qui prouve que la memoire d'orientation resout la
  contrainte centrale.
- Independance du chemin : deux chemins menant au meme M classifient
  identiquement.
- Dead-reckoning de position coherent (deplacements nets corrects).
- Defi 1 : une sequence de bons coups resout ; un mauvais coup declenche reset
  et recalibration ; le premier coup ne compte jamais.

## 9. Portes laissees ouvertes (extensibilite)

Aucune decision du Defi 1 ne condamne ces evolutions.

- **Historique des coups** : le coeur emet un evenement par roulement ; un
  module d'historique s'abonnera sans modifier le coeur.
- **Boussole / magnetometre** : l'entree est derriere `SourceMouvement` ; on
  peut brancher une source de cap absolu en parallele, qui recale M via
  `corrigerOrientationAbsolue`. Rien ne suppose yaw-blind pour toujours, c'est
  juste l'etat actuel des sources branchees.
- **Plusieurs defis** : `GestionnaireDefis` detient une liste de modules ;
  enregistrer ou chainer plusieurs defis ne demande pas de refonte.
- **Portage Arduino** : coeur et defis en fonctions pures sur entiers, sans
  Three.js ni DOM. Seuls `SourceMouvement` (gyro MPU-6050) et `Indicateur`
  (LED) seront reimplementes en C++.

## 10. Hors perimetre (YAGNI pour le Defi 1)

- Pas d'historique de coups implemente (seulement l'evenement qui le permettra).
- Pas de magnetometre ni de cap absolu actif.
- Pas de plusieurs defis charges simultanement (interface prete, un seul module
  actif).
- Pas de code Arduino maintenant (decisions notees pour le portage).
