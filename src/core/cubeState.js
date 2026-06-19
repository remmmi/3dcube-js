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
