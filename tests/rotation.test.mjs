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
