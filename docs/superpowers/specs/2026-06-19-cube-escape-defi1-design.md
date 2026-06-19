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

## 3. Modelisation contre experience : note d'organisation pour le dev

Cette section n'ajoute pas de code C++ ; elle informe le dev de la nature du
produit pour qu'il structure le modele JS en consequence. A lire avant de
coder.

### Le produit final n'est pas un jeu navigateur

Le produit est un **objet physique autonome d'escape-room**, manipule dans une
piece sombre. Son interface avec le joueur est volontairement pauvre :

- **Entree unique** : faire rouler le cube sur une table. Aucun clavier, aucun
  bouton, aucune souris.
- **Sortie unique** : la lumiere d'une LED (ou de quelques LED). Aucun ecran,
  aucune matrice 8x3 affichee, aucune vue 3D.

Le joueur ne percoit que des **motifs lumineux** et n'agit qu'en **tournant le
cube**. C'est une experience tactile et lumineuse, pas une interface logicielle.
Toute decision de design doit etre jugee a l'aune de ce canal etroit.

### Le JS est un jumeau numerique, pas le produit

La vue 3D, la matrice des sommets, le clavier et les boutons sont un **banc de
developpement** (jumeau numerique) qui permet de voir et piloter le modele. Ils
**n'existent pas dans le produit final** et seront remplaces par les
peripheriques du firmware. Ils sont explicitement jetables.

Il faut donc separer nettement, des le modele JS, deux familles de code :

- **Code produit (portable)** : le coeur `CubeState` et les modules de defi.
  Maths entieres, deterministe, sans flottants superflus, sans DOM ni Three.js,
  sans pause bloquante. Doit pouvoir etre transpose presque tel quel en C++.
- **Code banc (navigateur, jetable)** : l'implementation JS de la source de
  mouvement, l'indicateur DOM, la vue 3D et la matrice. Adherent au navigateur,
  remplace en Arduino par le gyro/accelerometre et la LED.

Recommandation d'organisation : isoler physiquement ces deux familles (fichiers
ou modules distincts) pour qu'on voie d'un coup d'oeil ce qui partira en
firmware et ce qui restera au sol.

### Contraintes embarquees a anticiper des maintenant

Sans ecrire de C++, le modele JS doit deja refleter ces realites pour que le
portage soit mecanique :

- **Temps non bloquant** : piloter le defi par une machine a etats cadencee par
  le temps, jamais par une pause bloquante. Un delai du modele (pause 1 s, flash
  3 s) correspond a une planification sur `millis()` dans la boucle Arduino, pas
  a un `sleep`. Concevoir la logique du defi comme une fonction `tick(temps)`.
- **Canal de sortie etroit** : l'experience passe par une seule LED. Les codes
  de flash (1 a 4) doivent rester distinguables a l'oeil : cadence reguliere,
  pauses nettes entre les groupes, motif d'erreur franc et different. Concevoir
  les motifs pour ce canal pauvre, pas pour un ecran.
- **Capteur bruite** : la detection reelle d'un roulement aura un seuil (pic
  gyro proche de 90 degres) et un anti-rebond. Meme si l'entree JS est parfaite,
  l'interface `SourceMouvement` doit exposer ces points de decision (seuil,
  fenetre de detection) comme parametres, pour qu'ils existent deja au portage.
- **Repos** : M figee au repos (deja decide) correspond a l'arret de
  l'integration du gyro entre deux coups, qui evite la derive.
- **Ressources limitees** : pas d'allocation dynamique inutile ni de dependance
  lourde dans le code produit ; rester sur des structures fixes et des entiers.

### La boucle d'experience du joueur

Dans le noir, le cube flashe un code. Le joueur l'interprete, roule le cube dans
la direction qu'il en deduit. Le cube valide en silence puis flashe le code
suivant, ou signale l'erreur par un clignotement franc et attend une
recalibration. Toute la conception (timing, motifs, tolerances) sert cette
boucle percue uniquement par la lumiere et le geste.

## 4. Point de depart : le projet existant et son evolution

Ce defi n'est pas un projet neuf : il fait evoluer le projet courant. On part
de `index.html` (un seul fichier, tout dans `initApp()`) et on le rend fidele a
la philosophie de la section 3, sans le reecrire de zero.

### Ce qui existe deja (le germe du banc)

- `roll(dir)` : roulement anime du cube de 90 degres autour d'une arrete au sol,
  avec un pivot temporaire et `attach()` qui preserve la pose monde.
- `updateMatrix(decimals)` : matrice 8x3 des sommets en coordonnees monde, mise
  a jour a chaque frame.
- OrbitControls (vue seule), axes colores, grille.
- Sauvegardes d'etats nommees par `moveSequence` (`captureState`, `loadState`,
  `addSaveEntry`), bouton `resetCube`.

C'est deja un jumeau numerique du cube qui roule. Mais il ne respecte pas encore
la philosophie de la spec.

### L'ecart a combler

- **Orientation en flottant** : la pose est un quaternion Three.js, pas une
  matrice entiere M. La verite de l'orientation doit passer dans un coeur
  entier ; le quaternion ne reste que pour l'animation visuelle (banc).
- **La memoire est un historique** : le seul etat persistant est `moveSequence`
  (la liste des coups), exactement ce que la spec refuse. L'etat doit devenir
  l'orientation M unique, independante du chemin.
- **Tout est melange dans un seul closure** : aucune separation produit / banc,
  aucune interface, aucun coeur isole. La logique de roulement, le rendu et la
  matrice cohabitent dans `initApp()`.

### Le travail d'evolution (pas de reecriture)

- **Extraire le coeur** `CubeState` (M entier, position) dans son propre module,
  sans aucune reference a Three.js ni au DOM, copiable vers le C++. C'est la
  nouvelle source de verite.
- **Brancher `roll(dir)` sur le coeur** : l'appui fleche passe par
  `SourceMouvement` qui en derive un roulement repere corps, le coeur met a jour
  M et position ; l'animation Three.js existante ne fait plus que refleter cet
  etat (et se recale sur M au repos via le snap deja present).
- **Retirer l'historique du role d'etat** : `moveSequence` ne sert plus qu'au
  nommage des sauvegardes (fonction de banc) ; il ne porte plus l'etat logique.
- **Ajouter les couches manquantes** : `Indicateur` (zone de flash dans l'UI
  existante), `GestionnaireDefis`, `ModuleDefi`, et le Defi 1.
- **Conserver tel quel** le banc utile : vue 3D, matrice, axes, OrbitControls,
  sauvegardes. Ils deviennent les yeux du dev sur le modele.

### Structure de fichiers (modulaire)

La convention historique du depot (tout dans `index.html`) est abandonnee : elle
n'a plus d'interet et nuirait au portage. On structure en modules ES, avec des
repertoires qui materialisent la frontiere produit / banc. La convention de
`CLAUDE.md` sera mise a jour en consequence.

    index.html              page + import map ; monte le banc
    src/
      core/                 [produit] portable, zero dependance navigateur
        rotation.js         maths entieres : matrices/vecteurs 3x3, helpers
        cubeState.js        M, position, appliquerRoulementBody,
                            classifierDirectionMonde, reset, evenements
      challenges/           [produit] modules de defi
        moduleDefi.js       contrat commun (interface de base)
        gestionnaireDefis.js  enregistre et route vers le module actif
        defi1.js            dechiffrage sur 6 coups
      bench/                [banc] navigateur, jetable au portage
        sourceMouvement.js  entrees clavier/boutons -> roulement repere corps
        indicateur.js       flash LED simule (DOM)
        vue3d.js            scene Three.js : roll anime, OrbitControls, axes
        matrice.js          tableau 8x3 + sauvegardes
        main.js             montage : cable coeur, defis et banc ensemble

Correspondance avec le portage : chaque module de `core/` et `challenges/` se
transpose en une unite C++ (`.h` / `.cpp`) ; `bench/` est remplace par les
peripheriques du firmware (gyro/accelerometre pour `sourceMouvement`, LED pour
`indicateur`) et disparait. Cette separation par repertoires rend visible, des
l'arborescence, ce qui part en firmware et ce qui reste au sol.

## 5. Decisions verrouillees

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

## 6. Architecture

Trois couches separees, communiquant par interfaces explicites. Le marquage
[produit] / [banc] rappelle ce qui se portera en firmware et ce qui reste au
navigateur (voir section 3).

    [ Source de mouvement ]      [ Coeur ]            [ Gestionnaire de defis ]
     entrees clavier / vue 3D --> CubeState      -->  GestionnaireDefis
     (roulements repere corps)    (M, position)       -> ModuleDefi (Defi 1)
        [banc]                      [produit]          -> Indicateur (flash)
                                                          [defi: produit]
                                                          [indicateur: banc]

- **Source de mouvement** (`SourceMouvement`) [banc] : transforme une intention
  de roulement en evenement *roulement detecte en repere corps* (axe local +
  signe), exactement ce que fournira le gyro MPU-6050. En JS, l'implementation
  derive le roulement corps a partir de M et de la direction monde demandee par
  l'utilisateur (clavier ou bouton), de facon a simuler fidelement le capteur
  et ne jamais court-circuiter la classification corps vers monde. Expose les
  parametres de detection (seuil, fenetre) qui serviront au capteur reel.
- **Coeur** (`CubeState`) [produit] : maintient M et position, traduit un
  roulement corps en direction monde, emet un evenement par roulement.
- **Gestionnaire de defis** (`GestionnaireDefis`) [produit] : detient une liste
  de modules, route les coups vers le module actif.
- **Module de defi** (`ModuleDefi`) [produit] : regles d'un defi. Le Defi 1 en
  est la premiere implementation. Pilote l'`Indicateur`.
- **Indicateur** (`Indicateur`) [banc] : sorties d'affichage (flash N fois,
  clignotement d'erreur, flash de la prochaine orientation demandee). En JS,
  un element DOM ; en Arduino, une LED.

Seules la source de mouvement (cote entree) et l'indicateur (cote sortie), plus
la vue 3D et la matrice, sont adherents au navigateur. Le coeur et les defis
sont des fonctions pures sur des entiers, sans dependance a Three.js ni au DOM.

## 7. Le coeur CubeState

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

## 8. Le gestionnaire de defis et l'interface ModuleDefi

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
- `tick(temps)` : avance la machine a etats temporelle du module (sequences de
  flash, pauses, clignotement d'erreur) sans pause bloquante ; equivaut a la
  boucle `millis()` de l'Arduino.
- emet des evenements d'affichage via l'`Indicateur`.

Le coeur ne connait pas les regles d'un defi ; un defi ne connait pas la
trigonometrie du cube. On peut charger un autre module sans toucher au coeur.

## 9. Le Defi 1 (dechiffrage sur 6 coups)

### Convention cardinale : le Nord du cube

Le cube parle dans sa propre rose des vents : Nord / Est / Sud / Ouest **du
cube** (toujours dire "du cube" : ce n'est pas le Nord magnetique de la salle,
le MPU-6050 n'a pas de magnetometre).

Le Nord n'est pas une constante cablee : il est **pose par le coup de
calibration**. Le premier coup definit Nord du cube = direction monde de ce
roulement. C'est realisable sans boussole : le cube n'a aucun repere monde tant
qu'il n'en pose pas un, et c'est precisement ce que fait le premier coup. Tout
le reste se mesure relativement a ce Nord via l'orientation M.

C'est un **cap monde fixe** : une fois le Nord pose, la rose ne tourne plus de la
partie. Elle est rigide, donc les autres cardinaux suivent le Nord (sens
horaire) :

- Nord du cube  = direction du coup de calibration (flash : 1)
- Est du cube   = Nord tourne de  90 degres horaire   (flash : 2)
- Sud du cube   = Nord tourne de 180 degres            (flash : 3)
- Ouest du cube = Nord tourne de 270 degres            (flash : 4)

Exemple : calibration vers la gauche (x-) => Nord = Gauche, donc Est = Haut,
Sud = Droite, Ouest = Bas. Le cube flashe 1 (Nord) => il attend un roulement
vers la gauche.

Le cube verifie chaque coup par M (corps vers monde) ; il n'a jamais besoin de
connaitre une direction absolue. Un **cap embarque** (la rose tourne avec le
cube quand il culbute, exigeant un suivi mental de l'orientation) est reserve a
un futur module de defi ; il reutilisera la meme machinerie M.

Deux vocabulaires distincts, pour qu'un mot n'ait jamais deux sens :

- **Le cube demande en cardinaux** (N/E/S/O du cube), exprimes par des flashs.
- **Le joueur agit en gestes** (fleches Haut/Bas/Gauche/Droite = bascule physique
  ancree au repere xy de la table).

La calibration relie les deux : le geste de calibration pose le Nord.

### Voyant et motifs lumineux

Sortie unique : un voyant (LED simulee au banc par une barre pleine largeur sous
la vue 3D). Trois motifs, concus pour etre distinguables a l'oeil sur ce canal
etroit :

- **Code** (jaune) : 1 a 4 flashs = cardinal demande (1 = Nord, 2 = Est,
  3 = Sud, 4 = Ouest du cube).
- **Erreur** (rouge) : clignotement rapide, environ 6 Hz pendant 3 s.
- **Succes** (vert) : clignotement accelere de 2 Hz a 20 Hz sur 5 s, a la
  resolution des 6 coups.

Deroulement :

1. `init()` : genere une sequence cible aleatoire de 6 directions ; indice de
   progression a 0 ; etat = attente de calibration.
2. Premier coup : `onCalibration()`. Le coeur fait `reset()` (M = identite,
   position a l'origine). Ce coup ne compte pas. On passe en etat actif et on
   flashe la premiere cible.
3. Pour chaque cible, on attend un coup ; `onCoup(directionMonde)` compare la
   direction monde a la cible courante :
   - **Bon coup** : pause 1 s, on incremente l'indice, on flashe la cible
     suivante. Si l'indice atteint 6, le defi est resolu : flash de succes vert.
   - **Mauvais coup** : clignotement d'erreur (6 Hz pendant 3 s), `onReset()`,
     on repasse en attente d'un coup de recalibration avant de reprendre la
     sequence depuis le debut.

Tous les delais (pause 1 s, clignotement 3 s, cadence de flash) sont geres par
`tick(temps, auRepos)`, jamais par une pause bloquante. Le flash du cardinal
n'est amorce que lorsque le cube est immobile (`auRepos`, fourni par le capteur
de mouvement) : il ne demarre donc pas pendant un roulement.

Validation une par une : on ne remet pas le monde physique a zero entre les
coups ; on valide la direction monde de chaque roulement contre la cible
courante. C'est la memoire d'orientation M (et non un cap absolu) qui permet de
distinguer, par exemple, l'etat initial d'un etat tourne de 180 degres autour
de Z apres quelques coups.

## 10. Tests (sur le coeur, ou est tout le risque)

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

## 11. Portes laissees ouvertes (extensibilite)

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
  Three.js ni DOM, logique temporelle en `tick(temps)`. Seuls `SourceMouvement`
  (gyro MPU-6050) et `Indicateur` (LED) seront reimplementes en C++.

## 12. Hors perimetre (YAGNI pour le Defi 1)

- Pas d'historique de coups implemente (seulement l'evenement qui le permettra).
- Pas de magnetometre ni de cap absolu actif.
- Pas de plusieurs defis charges simultanement (interface prete, un seul module
  actif).
- Pas de code Arduino maintenant (decisions notees pour le portage).
