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
    if (phase !== "attenteCoup" && phase !== "flashCible" && phase !== "pauseSucces") return;
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
