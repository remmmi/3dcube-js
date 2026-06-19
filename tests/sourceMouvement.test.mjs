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
