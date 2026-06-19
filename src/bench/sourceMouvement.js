// src/bench/sourceMouvement.js
// Banc : simule la mesure du gyro. Depuis une direction monde voulue (touche
// ou bouton) et l'etat M, derive le roulement repere corps. En Arduino, cette
// fonction est remplacee par la lecture reelle du MPU-6050.
import { ROULEMENTS } from "../core/cubeState.js";
import { transposer, appliquer } from "../core/rotation.js";

export function rouloCorpsDepuisMonde(directionMonde, M) {
  const { axeMonde, signeAngle } = ROULEMENTS[directionMonde];
  const aBody = appliquer(transposer(M), axeMonde); // M^T . axeMonde
  let idx = 0;
  for (let i = 0; i < 3; i++) if (aBody[i] !== 0) idx = i;
  const s = aBody[idx];
  return { axeCorps: idx, signe: s * signeAngle };
}
