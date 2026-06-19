// src/challenges/moduleDefi.js
// Contrat commun a tous les defis. Documentaire : un module est un objet
// exposant id, init(), onCalibration(), onCoup(directionMonde), onReset(), tick(temps).
// Le coeur ne connait pas les regles ; un defi ne connait pas la trigonometrie du cube.
export const METHODES_REQUISES = ["init", "onCalibration", "onCoup", "onReset", "tick"];

export function estModuleValide(m) {
  return m && typeof m.id === "string" && METHODES_REQUISES.every((k) => typeof m[k] === "function");
}
