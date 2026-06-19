# Cube escape-room Defi 1 - Plan d'implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire evoluer le projet `index.html` vers une architecture modulaire ou un coeur entier portable (orientation M, classification corps vers monde) pilote un premier defi de dechiffrage sur 6 coups, le tout visualise par un banc Three.js.

**Architecture:** Separation stricte produit / banc. `src/core` (maths entieres, etat M, classification) et `src/challenges` (moteur de defis, Defi 1) sont du code produit pur, sans dependance navigateur, transposable en C++. `src/bench` (source de mouvement, indicateur, vue 3D, matrice, montage) est la couche navigateur jetable. Tout est cable dans `src/bench/main.js` charge par `index.html`.

**Tech Stack:** JavaScript modules ES, Three.js (CDN, import map) pour le banc, `node:test` pour les tests du coeur et des defis (pas de dependance), serveur `python3 -m http.server` pour la vue.

Reference : `docs/superpowers/specs/2026-06-19-cube-escape-defi1-design.md`.

---

## Conventions de modele (a respecter dans tout le code)

- `M` : matrice de rotation 3x3 d'entiers, repere corps vers monde. Depart = identite.
- Roulements monde (multiplication a gauche `M_new = R_dir . M_old`), avec deplacement de case :
  - Haut   : `R_haut = [[1,0,0],[0,0,1],[0,-1,0]]`, dx=0, dy=+1 (axe monde +X, angle -90)
  - Bas    : `R_bas = [[1,0,0],[0,0,-1],[0,1,0]]`, dx=0, dy=-1 (axe monde +X, angle +90)
  - Droite : `R_droite = [[0,0,1],[0,1,0],[-1,0,0]]`, dx=+1, dy=0 (axe monde +Y, angle +90)
  - Gauche : `R_gauche = [[0,0,-1],[0,1,0],[1,0,0]]`, dx=-1, dy=0 (axe monde +Y, angle -90)
- Roulement repere corps = `{ axeCorps, signe }` : rotation autour de l'axe corps positif d'indice `axeCorps` (0=x,1=y,2=z), de `signe * 90` degres (`signe` vaut +1 ou -1).
- Classification corps vers monde : l'axe monde de rotation est la colonne `axeCorps` de `M` (= `M . e_axeCorps`). Soit `(lettre, signeAxe)` cet axe monde signe ; l'effet est une rotation autour de `+lettre` de `k * 90` avec `k = signeAxe * signe`. Table : X/k=-1 -> Haut, X/k=+1 -> Bas, Y/k=+1 -> Droite, Y/k=-1 -> Gauche (Z -> invalide, roulement non au sol).

Verites de controle (issues de `docs/bfs.md`) : deux Haut = `Rx(180)` ; Haut,Haut,Droite,Droite = `Rz(180) = [[-1,0,0],[0,-1,0],[0,0,1]]`.

---

## Task 1: Maths entieres (src/core/rotation.js)

**Files:**
- Create: `src/core/rotation.js`
- Test: `tests/rotation.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/rotation.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { IDENTITE, multiplier, transposer, appliquer, colonne, egales } from "../src/core/rotation.js";

test("identite est neutre", () => {
  const R = [[0,0,1],[0,1,0],[-1,0,0]];
  assert.ok(egales(multiplier(IDENTITE, R), R));
  assert.ok(egales(multiplier(R, IDENTITE), R));
});

test("transposer d'une rotation est son inverse", () => {
  const R = [[1,0,0],[0,0,1],[0,-1,0]];
  assert.ok(egales(multiplier(transposer(R), R), IDENTITE));
});

test("appliquer et colonne", () => {
  const R = [[0,0,1],[0,1,0],[-1,0,0]];
  assert.deepEqual(appliquer(R, [1,0,0]), [0,0,-1]);
  assert.deepEqual(colonne(R, 0), [0,0,-1]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rotation.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Write minimal implementation**

```js
// src/core/rotation.js
// Maths entieres sur matrices 3x3 et vecteurs 3. Aucune dependance.
// Repere corps vers monde. Code produit, transposable en C++.

export const IDENTITE = [[1,0,0],[0,1,0],[0,0,1]];

// Produit matriciel 3x3 (a . b).
export function multiplier(a, b) {
  const r = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++)
        r[i][j] += a[i][k] * b[k][j];
  return r;
}

// Transposee (inverse d'une matrice de rotation).
export function transposer(m) {
  return [[m[0][0],m[1][0],m[2][0]],
          [m[0][1],m[1][1],m[2][1]],
          [m[0][2],m[1][2],m[2][2]]];
}

// Applique m a un vecteur colonne v.
export function appliquer(m, v) {
  return [m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2],
          m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2],
          m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]];
}

// Colonne j de m (= m . e_j).
export function colonne(m, j) {
  return [m[0][j], m[1][j], m[2][j]];
}

// Egalite stricte de deux matrices 3x3.
export function egales(a, b) {
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (a[i][j] !== b[i][j]) return false;
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rotation.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/rotation.js tests/rotation.test.mjs
git commit -m "feat(core): maths entieres 3x3 (rotation.js)"
```

---

## Task 2: Coeur CubeState (src/core/cubeState.js)

**Files:**
- Create: `src/core/cubeState.js`
- Test: `tests/cubeState.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/cubeState.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { creerCubeState, ROULEMENTS } from "../src/core/cubeState.js";
import { egales } from "../src/core/rotation.js";

const RZ180 = [[-1,0,0],[0,-1,0],[0,0,1]];

// Simule le gyro : depuis une direction monde et l'etat M courant,
// renvoie le roulement repere corps mesure.
function rouluCorps(cube, directionMonde) {
  const { axeMonde, signeAngle } = ROULEMENTS[directionMonde];
  const aBody = cube.versCorps(axeMonde); // M^T . axeMonde
  let idx = 0;
  for (let i = 0; i < 3; i++) if (aBody[i] !== 0) idx = i;
  const s = aBody[idx];
  return { axeCorps: idx, signe: s * signeAngle };
}

test("deux Haut donnent Rx(180)", () => {
  const cube = creerCubeState();
  for (let i = 0; i < 2; i++) cube.appliquerRoulementBody(...Object.values(rouluCorps(cube, "Haut")));
  assert.ok(egales(cube.getM(), [[1,0,0],[0,-1,0],[0,0,-1]]));
});

test("Haut,Haut,Droite,Droite donnent Rz(180)", () => {
  const cube = creerCubeState();
  for (const d of ["Haut","Haut","Droite","Droite"]) {
    const r = rouluCorps(cube, d);
    cube.appliquerRoulementBody(r.axeCorps, r.signe);
  }
  assert.ok(egales(cube.getM(), RZ180));
});

test("classification independante du chemin mais dependante de M (init vs Rz180)", () => {
  const cubeA = creerCubeState();                    // M = I
  const cubeB = creerCubeState(); cubeB.forcerM(RZ180); // M = Rz180
  // meme roulement corps (axeCorps 0, signe -1) classe differemment
  assert.equal(cubeA.classifierDirectionMonde(0, -1), "Haut");
  assert.equal(cubeB.classifierDirectionMonde(0, -1), "Bas");
});

test("position dead-reckoning et retour", () => {
  const cube = creerCubeState();
  for (const d of ["Haut","Droite","Bas","Gauche"]) {
    const r = rouluCorps(cube, d);
    cube.appliquerRoulementBody(r.axeCorps, r.signe);
  }
  assert.deepEqual(cube.getPosition(), { x: 0, y: 0 });
});

test("reset remet M a l'identite et la position a l'origine", () => {
  const cube = creerCubeState();
  const r = rouluCorps(cube, "Droite");
  cube.appliquerRoulementBody(r.axeCorps, r.signe);
  cube.reset();
  assert.deepEqual(cube.getPosition(), { x: 0, y: 0 });
  assert.ok(egales(cube.getM(), [[1,0,0],[0,1,0],[0,0,1]]));
});

test("surRoulement recoit la direction monde", () => {
  const cube = creerCubeState();
  let recu = null;
  cube.surRoulement((e) => { recu = e.directionMonde; });
  const r = rouluCorps(cube, "Gauche");
  cube.appliquerRoulementBody(r.axeCorps, r.signe);
  assert.equal(recu, "Gauche");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cubeState.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Write minimal implementation**

```js
// src/core/cubeState.js
// Coeur produit : orientation M (repere corps vers monde) et position de case,
// par dead-reckoning, independants du chemin. Aucune dependance navigateur.
import { IDENTITE, multiplier, transposer, appliquer, colonne } from "./rotation.js";

// Roulements monde : matrice (mult a gauche), deplacement de case,
// axe monde de rotation et signe d'angle (en multiples de 90 degres).
export const ROULEMENTS = {
  Haut:   { R: [[1,0,0],[0,0,1],[0,-1,0]], dx: 0, dy: 1,  axeMonde: [1,0,0], signeAngle: -1 },
  Bas:    { R: [[1,0,0],[0,0,-1],[0,1,0]], dx: 0, dy: -1, axeMonde: [1,0,0], signeAngle: 1 },
  Droite: { R: [[0,0,1],[0,1,0],[-1,0,0]], dx: 1, dy: 0,  axeMonde: [0,1,0], signeAngle: 1 },
  Gauche: { R: [[0,0,-1],[0,1,0],[1,0,0]], dx: -1, dy: 0, axeMonde: [0,1,0], signeAngle: -1 },
};

// Classe un roulement corps (axeCorps, signe) en direction monde, vu un M donne.
// L'axe monde de rotation est la colonne axeCorps de M. On en deduit la lettre
// d'axe et son signe, puis l'effet k = signeAxe * signe (en multiples de 90).
function classifier(M, axeCorps, signe) {
  const axe = colonne(M, axeCorps);
  let lettre = 0;
  for (let i = 0; i < 3; i++) if (axe[i] !== 0) lettre = i;
  const signeAxe = axe[lettre];
  const k = signeAxe * signe;
  if (lettre === 0) return k === -1 ? "Haut" : "Bas";
  if (lettre === 1) return k === 1 ? "Droite" : "Gauche";
  return null; // axe Z : roulement non au sol, invalide
}

export function creerCubeState() {
  let M = IDENTITE.map((r) => r.slice());
  let position = { x: 0, y: 0 };
  const abonnes = [];

  function getM() { return M.map((r) => r.slice()); }
  function getPosition() { return { x: position.x, y: position.y }; }
  function versCorps(vMonde) { return appliquer(transposer(M), vMonde); }
  function classifierDirectionMonde(axeCorps, signe) { return classifier(M, axeCorps, signe); }
  function surRoulement(cb) { abonnes.push(cb); }

  function appliquerRoulementBody(axeCorps, signe) {
    const direction = classifier(M, axeCorps, signe);
    if (direction === null) return null;
    const r = ROULEMENTS[direction];
    const M_avant = getM();
    M = multiplier(r.R, M);
    position = { x: position.x + r.dx, y: position.y + r.dy };
    const evenement = {
      axeCorps, signe, directionMonde: direction,
      M_avant, M_apres: getM(), position: getPosition(),
    };
    for (const cb of abonnes) cb(evenement);
    return direction;
  }

  function reset() {
    M = IDENTITE.map((r) => r.slice());
    position = { x: 0, y: 0 };
  }

  // Point d'injection laisse pour un futur cap absolu (magnetometre). Inutilise au Defi 1.
  function corrigerOrientationAbsolue(M_absolue) { M = M_absolue.map((r) => r.slice()); }

  // Aide aux tests / banc : force M directement.
  function forcerM(M_force) { M = M_force.map((r) => r.slice()); }

  return {
    getM, getPosition, versCorps, classifierDirectionMonde,
    appliquerRoulementBody, reset, surRoulement, corrigerOrientationAbsolue, forcerM,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cubeState.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/cubeState.js tests/cubeState.test.mjs
git commit -m "feat(core): etat CubeState (M, position, classification corps vers monde)"
```

---

## Task 3: Moteur de defis (src/challenges/moduleDefi.js, gestionnaireDefis.js)

**Files:**
- Create: `src/challenges/moduleDefi.js`
- Create: `src/challenges/gestionnaireDefis.js`
- Test: `tests/gestionnaireDefis.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/gestionnaireDefis.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { creerGestionnaireDefis } from "../src/challenges/gestionnaireDefis.js";

function moduleEspion(id) {
  const journal = [];
  return {
    module: { id, init: () => journal.push("init"),
      onCalibration: () => journal.push("calib"),
      onCoup: (d) => journal.push("coup:" + d),
      onReset: () => journal.push("reset"),
      tick: (t) => {} },
    journal,
  };
}

test("active un module et lui route init puis coups", () => {
  const g = creerGestionnaireDefis();
  const a = moduleEspion("a");
  g.enregistrer(a.module);
  g.activer("a");
  g.onCalibration();
  g.onCoupRecu("Haut");
  assert.deepEqual(a.journal, ["init", "calib", "coup:Haut"]);
});

test("seul le module actif recoit les coups", () => {
  const g = creerGestionnaireDefis();
  const a = moduleEspion("a"); const b = moduleEspion("b");
  g.enregistrer(a.module); g.enregistrer(b.module);
  g.activer("b");
  g.onCoupRecu("Bas");
  assert.deepEqual(a.journal, []);
  assert.deepEqual(b.journal, ["init", "coup:Bas"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gestionnaireDefis.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Write minimal implementation**

```js
// src/challenges/moduleDefi.js
// Contrat commun a tous les defis. Documentaire : un module est un objet
// exposant id, init(), onCalibration(), onCoup(directionMonde), onReset(), tick(temps).
// Le coeur ne connait pas les regles ; un defi ne connait pas la trigonometrie du cube.
export const METHODES_REQUISES = ["init", "onCalibration", "onCoup", "onReset", "tick"];

export function estModuleValide(m) {
  return m && typeof m.id === "string" && METHODES_REQUISES.every((k) => typeof m[k] === "function");
}
```

```js
// src/challenges/gestionnaireDefis.js
// Detient les modules de defi et route les coups vers le module actif.
// Prepare le multi-defi : plusieurs modules peuvent etre enregistres.
import { estModuleValide } from "./moduleDefi.js";

export function creerGestionnaireDefis() {
  const modules = new Map();
  let actif = null;

  function enregistrer(module) {
    if (!estModuleValide(module)) throw new Error("module de defi invalide");
    modules.set(module.id, module);
  }
  function activer(id) {
    if (!modules.has(id)) throw new Error("module inconnu: " + id);
    actif = modules.get(id);
    actif.init();
  }
  function onCalibration() { if (actif) actif.onCalibration(); }
  function onCoupRecu(directionMonde) { if (actif) actif.onCoup(directionMonde); }
  function onReset() { if (actif) actif.onReset(); }
  function tick(temps) { if (actif) actif.tick(temps); }

  return { enregistrer, activer, onCalibration, onCoupRecu, onReset, tick, get actif() { return actif; } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gestionnaireDefis.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/challenges/moduleDefi.js src/challenges/gestionnaireDefis.js tests/gestionnaireDefis.test.mjs
git commit -m "feat(challenges): contrat ModuleDefi et GestionnaireDefis"
```

---

## Task 4: Defi 1 dechiffrage (src/challenges/defi1.js)

Le Defi 1 est une machine a etats cadencee par `tick(temps)` (millis-friendly), pilotant un `indicateur` (objet `{ flashCode(n), flashErreur(), eteindre() }`, injecte) et utilisant le `coeur` pour la calibration (`coeur.reset()`). La sequence cible et la fonction aleatoire sont injectees pour rendre les tests deterministes.

Etats : `attenteCalibration` -> `flashCible` -> `attenteCoup` -> (bon: `pauseSucces` -> cible suivante ou `resolu`) / (mauvais: `erreur` -> `attenteCalibration`).

**Files:**
- Create: `src/challenges/defi1.js`
- Test: `tests/defi1.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/defi1.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { creerDefi1 } from "../src/challenges/defi1.js";

function indicateurEspion() {
  const journal = [];
  return { journal,
    flashCode: (n) => journal.push("code:" + n),
    flashErreur: () => journal.push("erreur"),
    eteindre: () => journal.push("off") };
}
function coeurEspion() {
  const journal = [];
  return { journal, reset: () => journal.push("reset") };
}

const CIBLE = ["Haut","Droite","Bas","Gauche","Haut","Droite"];

function creer(opts = {}) {
  const indicateur = indicateurEspion();
  const coeur = coeurEspion();
  const defi = creerDefi1({ indicateur, coeur, genererCible: () => CIBLE.slice(),
    pauseSuccesMs: 1000, dureeErreurMs: 3000, ...opts });
  return { defi, indicateur, coeur };
}

test("le premier coup est une calibration non comptee", () => {
  const { defi, coeur } = creer();
  defi.init();
  defi.onCalibration();
  assert.deepEqual(coeur.journal, ["reset"]);
  assert.equal(defi.etat().resolu, false);
  assert.equal(defi.etat().progres, 0);
});

test("une sequence entierement correcte resout le defi", () => {
  const { defi } = creer();
  defi.init();
  defi.onCalibration();
  for (const d of CIBLE) defi.onCoup(d);
  assert.equal(defi.etat().resolu, true);
  assert.equal(defi.etat().progres, 6);
});

test("un mauvais coup declenche erreur, reset et recalibration", () => {
  const { defi, coeur } = creer();
  defi.init();
  defi.onCalibration();
  defi.onCoup("Haut");        // bon (progres 1)
  defi.onCoup("Haut");        // mauvais (cible attendait Droite)
  assert.equal(defi.etat().progres, 0);
  assert.equal(defi.etat().attendCalibration, true);
  // un coup avant recalibration est ignore
  defi.onCoup("Droite");
  assert.equal(defi.etat().progres, 0);
  // apres recalibration on repart
  defi.onCalibration();
  assert.equal(coeur.journal.filter((x) => x === "reset").length, 2);
  defi.onCoup("Haut");
  assert.equal(defi.etat().progres, 1);
});

test("tick flashe la cible apres la calibration et eteint apres la pause", () => {
  const { defi, indicateur } = creer();
  defi.init();
  defi.onCalibration();
  defi.tick(0);               // demarre le flash de la 1ere cible (Haut -> code 1)
  assert.ok(indicateur.journal.includes("code:1"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/defi1.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Write minimal implementation**

```js
// src/challenges/defi1.js
// Defi 1 : dechiffrer une sequence cible de 6 directions. Premier coup =
// calibration pure (non comptee). Bon coup -> pause puis cible suivante.
// Mauvais coup -> clignotement d'erreur, reset, attente de recalibration.
// Machine a etats cadencee par tick(temps) (millis-friendly).

const CODE = { Haut: 1, Droite: 2, Bas: 3, Gauche: 4 };

// genererCible par defaut : 6 directions aleatoires.
function cibleAleatoireParDefaut() {
  const dirs = ["Haut", "Droite", "Bas", "Gauche"];
  const seq = [];
  for (let i = 0; i < 6; i++) seq.push(dirs[Math.floor(Math.random() * 4)]);
  return seq;
}

export function creerDefi1(opts = {}) {
  const indicateur = opts.indicateur;
  const coeur = opts.coeur;
  const genererCible = opts.genererCible || cibleAleatoireParDefaut;
  const pauseSuccesMs = opts.pauseSuccesMs ?? 1000;
  const dureeErreurMs = opts.dureeErreurMs ?? 3000;

  let cible = [];
  let progres = 0;
  let resolu = false;
  let attendCalibration = true;
  let phase = "attenteCalibration"; // attenteCalibration|flashCible|attenteCoup|pauseSucces|erreur|resolu
  let phaseDepuis = 0;
  let cibleFlashee = false;

  function init() {
    cible = genererCible();
    progres = 0; resolu = false; attendCalibration = true;
    phase = "attenteCalibration"; cibleFlashee = false;
  }

  function onCalibration() {
    if (coeur) coeur.reset();
    attendCalibration = false;
    phase = "flashCible"; cibleFlashee = false;
  }

  function onCoup(direction) {
    if (attendCalibration || resolu) return; // coups ignores hors sequence
    if (phase !== "attenteCoup" && phase !== "flashCible") return;
    if (direction === cible[progres]) {
      progres++;
      if (progres >= cible.length) { resolu = true; phase = "resolu"; if (indicateur) indicateur.eteindre(); return; }
      phase = "pauseSucces"; phaseDepuis = null; cibleFlashee = false;
    } else {
      progres = 0; attendCalibration = true; phase = "erreur"; phaseDepuis = null;
      if (indicateur) indicateur.flashErreur();
    }
  }

  function tick(temps) {
    if (phase === "flashCible") {
      if (!cibleFlashee && indicateur) { indicateur.flashCode(CODE[cible[progres]]); cibleFlashee = true; }
      phase = "attenteCoup";
    } else if (phase === "pauseSucces") {
      if (phaseDepuis === null) phaseDepuis = temps;
      if (temps - phaseDepuis >= pauseSuccesMs) { phase = "flashCible"; cibleFlashee = false; }
    } else if (phase === "erreur") {
      if (phaseDepuis === null) phaseDepuis = temps;
      if (temps - phaseDepuis >= dureeErreurMs) { if (indicateur) indicateur.eteindre(); phase = "attenteCalibration"; }
    }
  }

  function etat() { return { progres, resolu, attendCalibration, phase, cible: cible.slice() }; }

  return { id: "defi1", init, onCalibration, onCoup, onReset: init, tick, etat };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/defi1.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/challenges/defi1.js tests/defi1.test.mjs
git commit -m "feat(challenges): Defi 1 dechiffrage sur 6 coups"
```

---

## Task 5: Source de mouvement simulee (src/bench/sourceMouvement.js)

Couche banc, mais sa fonction de conversion est pure et testable : depuis une direction monde voulue et l'etat M courant, elle derive le roulement repere corps que mesurerait le gyro.

**Files:**
- Create: `src/bench/sourceMouvement.js`
- Test: `tests/sourceMouvement.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/sourceMouvement.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { rouloCorpsDepuisMonde } from "../src/bench/sourceMouvement.js";
import { creerCubeState } from "../src/core/cubeState.js";

test("a l'identite, Haut donne axeCorps 0 signe -1 et se reclasse en Haut", () => {
  const cube = creerCubeState();
  const r = rouloCorpsDepuisMonde("Haut", cube.getM());
  assert.deepEqual(r, { axeCorps: 0, signe: -1 });
  assert.equal(cube.classifierDirectionMonde(r.axeCorps, r.signe), "Haut");
});

test("la boucle simulateur->coeur preserve la direction quel que soit M", () => {
  const cube = creerCubeState();
  for (const d of ["Droite","Haut","Gauche","Haut","Droite"]) {
    const r = rouloCorpsDepuisMonde(d, cube.getM());
    assert.equal(cube.classifierDirectionMonde(r.axeCorps, r.signe), d);
    cube.appliquerRoulementBody(r.axeCorps, r.signe);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sourceMouvement.test.mjs`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Write minimal implementation**

```js
// src/bench/sourceMouvement.js
// Banc : simule la mesure du gyro. Depuis une direction monde voulue (touche
// ou bouton) et l'etat M, derive le roulement repere corps. En Arduino, cette
// fonction est remplacee par la lecture reelle du MPU-6050.
import { ROULEMENTS } from "../src/../core/cubeState.js";
import { transposer, appliquer } from "../src/../core/rotation.js";

// NB: imports relatifs corriges a l'implementation reelle (voir note).
export function rouloCorpsDepuisMonde(directionMonde, M) {
  const { axeMonde, signeAngle } = ROULEMENTS[directionMonde];
  const aBody = appliquer(transposer(M), axeMonde); // M^T . axeMonde
  let idx = 0;
  for (let i = 0; i < 3; i++) if (aBody[i] !== 0) idx = i;
  const s = aBody[idx];
  return { axeCorps: idx, signe: s * signeAngle };
}
```

Note d'implementation : utiliser les bons chemins relatifs `../core/cubeState.js` et `../core/rotation.js` (depuis `src/bench/`). Le test importe via `../src/core/...`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sourceMouvement.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/bench/sourceMouvement.js tests/sourceMouvement.test.mjs
git commit -m "feat(bench): source de mouvement simulee (gyro)"
```

---

## Task 6: Indicateur de flash (src/bench/indicateur.js)

LED simulee par un element DOM. API minimale alignee sur le firmware : `flashCode(n)`, `flashErreur()`, `eteindre()`. Le flash est rendu visuellement par animation CSS courte ; la logique de timing reste dans le defi (tick).

**Files:**
- Create: `src/bench/indicateur.js`
- (Pas de test unitaire : pur DOM, verifie au navigateur en Task 9.)

- [ ] **Step 1: Implementation**

```js
// src/bench/indicateur.js
// Banc : indicateur lumineux (LED simulee par un element DOM). En Arduino,
// remplace par le pilotage d'une LED. flashCode(n) clignote n fois (code de
// direction), flashErreur() clignote vite en rouge, eteindre() coupe.
export function creerIndicateur(element) {
  function pulse(n, couleur, periodeMs) {
    element.style.removeProperty("animation");
    // n impulsions : on alterne une classe active via setTimeout (banc only).
    let i = 0;
    function tic() {
      if (i >= n * 2) { element.style.background = "#222"; element.style.boxShadow = "none"; return; }
      const on = i % 2 === 0;
      element.style.background = on ? couleur : "#222";
      element.style.boxShadow = on ? "0 0 18px " + couleur : "none";
      i++;
      setTimeout(tic, periodeMs / 2);
    }
    tic();
  }
  return {
    flashCode(n) { pulse(n, "#ffd23b", 520); },     // jaune, lisible a l'oeil
    flashErreur() { pulse(9, "#e23b3b", 166); },     // rouge ~6 Hz sur ~3 s
    eteindre() { element.style.background = "#222"; element.style.boxShadow = "none"; },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bench/indicateur.js
git commit -m "feat(bench): indicateur de flash (LED simulee)"
```

---

## Task 7: Vue 3D extraite (src/bench/vue3d.js)

Extraire la scene Three.js de `index.html` : creation scene/camera/renderer, grille, axes colores et gradues, cube et labels, OrbitControls, et l'animation de roulement `animerRoulement(direction)` (reprise de `roll(dir)` existant : pivot + attach + slerp + snap). La vue ne porte plus l'etat logique : elle expose `animerRoulement(direction, onFini)`, `reinitialiserVue()`, `lirePositionsMonde()` (pour la matrice) et `estEnAnimation()`.

**Files:**
- Create: `src/bench/vue3d.js`
- Reference: logique existante `index.html:456-955` (scene, makeAxisTick, makeAxisLine, roll, animateRoll, resize, animate).

- [ ] **Step 1: Implementation**

Porter le code existant dans une fonction `creerVue3D({ THREE, OrbitControls, CSS2DRenderer, CSS2DObject, conteneur })` qui retourne l'API ci-dessus. Points cles a preserver :
- `camera.up.set(0,0,1)` (Z vertical), grille horizontale, axes X rouge / Y vert / Z bleu, ticks.
- `VERTEX_LOCAL` et labels CSS2D enfants du `cubeGroup`.
- `animerRoulement(direction, onFini)` : meme mecanique pivot/attach/slerp/snap que `roll`, mais sans `moveSequence` (l'etat vit dans le coeur). Verrou `isRolling`. Appelle `onFini()` apres le snap.
- `lirePositionsMonde()` : renvoie `{A:{x,y,z}, ...}` via `localToWorld`.
- boucle de rendu interne (`requestAnimationFrame`) appelant `renderer.render` + `labelRenderer.render`, et un callback `onFrame(temps)` injecte (pour piloter `tick` du defi).

- [ ] **Step 2: Commit**

```bash
git add src/bench/vue3d.js
git commit -m "refactor(bench): extrait la vue 3D dans vue3d.js"
```

---

## Task 8: Matrice et sauvegardes (src/bench/matrice.js)

Extraire le tableau 8x3 et les sauvegardes de `index.html`. La matrice lit les positions monde via la vue. Les sauvegardes restent une fonction de banc nommee par la sequence affichee (le coeur ne porte pas d'historique). Le nommage de sequence devient une commodite d'affichage cote banc (liste locale des directions, alimentee par main au fil des coups).

**Files:**
- Create: `src/bench/matrice.js`

- [ ] **Step 1: Implementation**

`creerMatrice({ tableBody, lirePositionsMonde })` retourne `{ rafraichir(decimals) }` qui ecrit les `textContent` des cellules `cell-A-x`... La partie sauvegardes (`captureState`/`loadState`/`addSaveEntry`) est conservee mais s'appuie sur la vue (`vue3d.capturerPose()` / `vue3d.appliquerPose(pose)`) plutot que sur `cubeGroup` directement, et sur une sequence d'affichage fournie par main. Garder les `id` de cellules existants pour ne pas casser le CSS.

- [ ] **Step 2: Commit**

```bash
git add src/bench/matrice.js
git commit -m "refactor(bench): extrait matrice et sauvegardes dans matrice.js"
```

---

## Task 9: Montage et page (src/bench/main.js, index.html)

Cabler le tout. `index.html` ne garde que la structure HTML/CSS, l'import map Three.js, l'ajout d'un voyant pour l'indicateur, et `<script type="module" src="src/bench/main.js">`.

**Files:**
- Create: `src/bench/main.js`
- Modify: `index.html` (retirer tout le JS applicatif, garder structure + import map + voyant ; charger main.js)

- [ ] **Step 1: Implementation de main.js**

Sequence de montage :
```
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { creerCubeState } from "../core/cubeState.js";
import { creerGestionnaireDefis } from "../challenges/gestionnaireDefis.js";
import { creerDefi1 } from "../challenges/defi1.js";
import { rouloCorpsDepuisMonde } from "./sourceMouvement.js";
import { creerIndicateur } from "./indicateur.js";
import { creerVue3D } from "./vue3d.js";
import { creerMatrice } from "./matrice.js";
```
Logique :
- `coeur = creerCubeState()`, `vue = creerVue3D(...)`, `matrice = creerMatrice(...)`, `indicateur = creerIndicateur(voyant)`.
- `gestion = creerGestionnaireDefis()`, `gestion.enregistrer(creerDefi1({ indicateur, coeur }))`, `gestion.activer("defi1")`.
- `onFleche(direction)` :
  - si `gestion.actif.etat().attendCalibration` : `vue.animerRoulement(direction, () => {})` puis `gestion.onCalibration()`.
  - sinon : `const r = rouloCorpsDepuisMonde(direction, coeur.getM()); const dir = coeur.appliquerRoulementBody(r.axeCorps, r.signe); vue.animerRoulement(direction, () => {}); gestion.onCoupRecu(dir);`
- Clavier (fleches) + boutons existants appellent `onFleche`.
- Boucle `onFrame(temps)` de la vue : `gestion.tick(temps)` ; `matrice.rafraichir(vue.estEnAnimation() ? 2 : 0)`.
- Bouton reset : `coeur.reset(); vue.reinitialiserVue(); gestion.activer("defi1");`.
- try/catch autour du montage avec message d'erreur (WebGL/CDN), comme l'existant.

- [ ] **Step 2: Modifier index.html**

Retirer le `<script type="module">` applicatif. Ajouter dans la colonne centrale (ou sous les fleches) un voyant : `<div id="voyant" class="voyant"></div>` avec un style de pastille. Conserver l'import map et ajouter `<script type="module" src="src/bench/main.js"></script>`.

- [ ] **Step 3: Verifier au navigateur**

Run: `python3 -m http.server 8777` (depuis la racine) puis ouvrir `http://localhost:8777/index.html`.
Verifier : pas d'erreur console ; cube + labels ; les fleches roulent le cube ; la matrice se met a jour ; le voyant flashe le code de la cible apres le 1er coup (calibration) ; un mauvais coup declenche le clignotement rouge ; OrbitControls bouge la vue sans changer la matrice.

- [ ] **Step 4: Commit**

```bash
git add index.html src/bench/main.js
git commit -m "feat(bench): montage modulaire et page (main.js + index.html)"
```

---

## Task 10: Verification d'ensemble et docs

- [ ] **Step 1: Lancer tous les tests**

Run: `node --test tests/`
Expected: tous PASS.

- [ ] **Step 2: Verifier la vue** (voir Task 9 Step 3), capturer un ecran si possible.

- [ ] **Step 3: Mettre a jour README/docs si besoin** (structure modulaire, comment lancer les tests).

- [ ] **Step 4: Commit final et push** (si depot GitHub configure).

```bash
git add -A && git commit -m "docs: structure modulaire et lancement des tests"
git push
```

---

## Self-review (couverture spec)

- Coeur M + position + classification : Tasks 1-2 (spec sec. 7).
- Independance du chemin / disambiguation init vs Rz180 : tests Task 2 (spec sec. 10).
- Moteur modulaire / interface ModuleDefi / gestionnaire : Task 3 (spec sec. 8).
- Defi 1 (calibration non comptee, validation un par un, erreur+reset+recalibration, tick non bloquant) : Task 4 (spec sec. 9).
- Source de mouvement simulee (gyro), parametrable : Task 5 (spec sec. 6).
- Indicateur LED, canal etroit : Task 6 (spec sec. 3).
- Vue 3D / matrice / sauvegardes comme banc : Tasks 7-8 (spec sec. 4).
- Montage produit/banc, point d'injection cap absolu present, evenement de roulement emis : Tasks 2 et 9 (spec sec. 10-11).
- Structure de fichiers modulaire : Tasks 1-9 (spec sec. 4).
