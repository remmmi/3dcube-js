// tests/defi1.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { creerDefi1, cardinalVersMonde } from "../src/challenges/defi1.js";

function indicateurEspion() {
  const journal = [];
  return { journal,
    flashCode: (n) => journal.push("code:" + n),
    flashErreur: () => journal.push("erreur"),
    flashSucces: () => journal.push("succes"),
    eteindre: () => journal.push("off") };
}
function coeurEspion() {
  const journal = [];
  return { journal, reset: () => journal.push("reset") };
}

const CIBLE = ["Nord", "Est", "Sud", "Ouest", "Nord", "Est"];

function creer(opts = {}) {
  const indicateur = indicateurEspion();
  const coeur = coeurEspion();
  const defi = creerDefi1({ indicateur, coeur, genererCible: () => CIBLE.slice(),
    pauseSuccesMs: 1000, dureeErreurMs: 3000, ...opts });
  return { defi, indicateur, coeur };
}

// Joue la sequence cible correcte, vu un Nord pose.
function gestesCorrects(nord) {
  return CIBLE.map((c) => cardinalVersMonde(c, nord));
}

test("la rose tourne avec le Nord pose (cap monde fixe)", () => {
  // Nord = Haut : rose par defaut.
  assert.equal(cardinalVersMonde("Nord", "Haut"), "Haut");
  assert.equal(cardinalVersMonde("Est", "Haut"), "Droite");
  // Nord = Gauche (cas du joueur) : Nord attend un roulement vers la gauche.
  assert.equal(cardinalVersMonde("Nord", "Gauche"), "Gauche");
  assert.equal(cardinalVersMonde("Est", "Gauche"), "Haut");
  assert.equal(cardinalVersMonde("Sud", "Gauche"), "Droite");
  assert.equal(cardinalVersMonde("Ouest", "Gauche"), "Bas");
});

test("le premier coup pose le Nord et n'est pas compte", () => {
  const { defi, coeur } = creer();
  defi.init();
  defi.onCalibration("Gauche");
  assert.deepEqual(coeur.journal, ["reset"]);
  assert.equal(defi.etat().resolu, false);
  assert.equal(defi.etat().progres, 0);
  assert.equal(defi.etat().nord, "Gauche");
});

test("une sequence correcte resout le defi, quel que soit le Nord pose", () => {
  for (const nord of ["Haut", "Gauche", "Droite", "Bas"]) {
    const { defi, indicateur } = creer();
    defi.init();
    defi.onCalibration(nord);
    for (const g of gestesCorrects(nord)) defi.onCoup(g);
    assert.equal(defi.etat().resolu, true, "Nord=" + nord);
    assert.equal(defi.etat().progres, 6);
    assert.ok(indicateur.journal.includes("succes"), "succes flashe, Nord=" + nord);
  }
});

test("Nord pose en Gauche : flash 1 attend un roulement vers la gauche", () => {
  const { defi } = creer();
  defi.init();
  defi.onCalibration("Gauche");     // cible[0] = Nord
  // Le joueur pousse a gauche (sa direction de calibration) -> bon coup.
  defi.onCoup("Gauche");
  assert.equal(defi.etat().progres, 1);
});

test("un mauvais coup declenche erreur, reset et recalibration", () => {
  const { defi } = creer();
  defi.init();
  defi.onCalibration("Haut");       // rose par defaut ; cible[0] = Nord = Haut
  defi.onCoup("Haut");              // bon (progres 1) ; cible[1] = Est = Droite
  defi.onCoup("Haut");              // mauvais (attendait Droite)
  assert.equal(defi.etat().progres, 0);
  assert.equal(defi.etat().attendCalibration, true);
  defi.onCoup("Droite");            // ignore avant recalibration
  assert.equal(defi.etat().progres, 0);
  defi.onCalibration("Haut");       // recalibration
  defi.onCoup("Haut");
  assert.equal(defi.etat().progres, 1);
});

test("le module expose son titre et son explication pour le bandeau", () => {
  const { defi } = creer();
  assert.equal(defi.titre, "Defi 1");
  assert.equal(typeof defi.description, "string");
  assert.ok(defi.description.length > 0);
});

test("tick flashe le cardinal apres la calibration", () => {
  const { defi, indicateur } = creer();
  defi.init();
  defi.onCalibration("Haut");
  defi.tick(0);                     // cible[0] = Nord -> code 1
  assert.ok(indicateur.journal.includes("code:1"));
});
