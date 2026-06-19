// src/challenges/defi1.js
// Defi 1 : dechiffrer une sequence cible de 6 cardinaux du cube. Premier coup =
// calibration pure (non comptee) : il POSE le Nord du cube = direction de ce
// roulement. Bon coup -> pause puis cardinal suivant. Mauvais coup ->
// clignotement d'erreur, attente de recalibration.
// Machine a etats cadencee par tick(temps) (millis-friendly).

// Le cube parle en cardinaux (sa rose des vents) ; le joueur repond en gestes
// (fleches = directions monde). Cap monde fixe : la rose est posee a la
// calibration et ne tourne plus de la partie. Voir la spec, section 9.
const CARDINAUX = ["Nord", "Est", "Sud", "Ouest"];

// Nombre de flashs par cardinal (canal LED etroit).
const FLASH = { Nord: 1, Est: 2, Sud: 3, Ouest: 4 };

// Rose des vents en directions monde, ordre horaire, quand Nord = Haut (+Y) :
// Nord=Haut, Est=Droite, Sud=Bas, Ouest=Gauche. Posee ailleurs, on la tourne.
const ROSE = ["Haut", "Droite", "Bas", "Gauche"];

// Direction monde attendue pour un cardinal, vu un Nord pose (direction monde).
// On tourne rigidement la rose pour aligner Nord sur nordMonde.
export function cardinalVersMonde(cardinal, nordMonde) {
  const i0 = ROSE.indexOf(nordMonde);       // ou pointe le Nord dans le repere monde
  const k = CARDINAUX.indexOf(cardinal);    // 0=Nord, 1=Est, 2=Sud, 3=Ouest
  return ROSE[(i0 + k + 4) % 4];
}

// genererCible par defaut : 6 cardinaux aleatoires.
function cibleAleatoireParDefaut() {
  const seq = [];
  for (let i = 0; i < 6; i++) seq.push(CARDINAUX[Math.floor(Math.random() * 4)]);
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
  let nord = null; // direction monde posee comme Nord du cube
  let phase = "attenteCalibration"; // attenteCalibration|flashCible|attenteCoup|pauseSucces|erreur|resolu
  let phaseDepuis = 0;
  let cibleFlashee = false;

  function init() {
    cible = genererCible();
    progres = 0; resolu = false; attendCalibration = true; nord = null;
    phase = "attenteCalibration"; cibleFlashee = false;
  }

  // nordMonde : direction monde du coup de calibration (devient le Nord du cube).
  function onCalibration(nordMonde) {
    if (coeur) coeur.reset();
    nord = nordMonde || "Haut"; // defaut : Nord = Haut si non precise
    attendCalibration = false;
    phase = "flashCible"; cibleFlashee = false;
  }

  function onCoup(direction) {
    if (attendCalibration || resolu) return; // coups ignores hors sequence
    if (phase !== "attenteCoup" && phase !== "flashCible" && phase !== "pauseSucces") return;
    const attendue = cardinalVersMonde(cible[progres], nord);
    if (direction === attendue) {
      progres++;
      if (progres >= cible.length) { resolu = true; phase = "resolu"; if (indicateur) indicateur.flashSucces(); return; }
      phase = "pauseSucces"; phaseDepuis = null; cibleFlashee = false;
    } else {
      progres = 0; attendCalibration = true; phase = "erreur"; phaseDepuis = null;
      if (indicateur) indicateur.flashErreur();
    }
  }

  // auRepos : vrai quand le cube ne bouge plus (gyro au calme). On n'amorce le
  // flash du cardinal qu'au repos, pour qu'il ne demarre pas pendant le roulement.
  function tick(temps, auRepos = true) {
    if (phase === "flashCible") {
      if (!auRepos) return; // on attend que le cube soit immobile
      if (!cibleFlashee && indicateur) { indicateur.flashCode(FLASH[cible[progres]]); cibleFlashee = true; }
      phase = "attenteCoup";
    } else if (phase === "pauseSucces") {
      if (phaseDepuis === null) phaseDepuis = temps;
      if (temps - phaseDepuis >= pauseSuccesMs) { phase = "flashCible"; cibleFlashee = false; }
    } else if (phase === "erreur") {
      if (phaseDepuis === null) phaseDepuis = temps;
      if (temps - phaseDepuis >= dureeErreurMs) { if (indicateur) indicateur.eteindre(); phase = "attenteCalibration"; }
    }
  }

  function etat() { return { progres, resolu, attendCalibration, nord, phase, cible: cible.slice() }; }

  return { id: "defi1", init, onCalibration, onCoup, onReset: init, tick, etat };
}
