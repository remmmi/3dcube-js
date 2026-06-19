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
