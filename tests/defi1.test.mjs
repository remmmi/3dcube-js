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
