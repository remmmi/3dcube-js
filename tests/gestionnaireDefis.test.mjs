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
