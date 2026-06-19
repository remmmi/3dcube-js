// Test d'integration : rejoue la chaine reelle du montage (hors rendu 3D).
// coeur (orientation) + source de mouvement simulee (gyro) + moteur de defis.
// Prouve que la classification repere corps vers monde alimente correctement le
// Defi 1, et que le Nord pose par la calibration aligne la rose des vents.
import { test } from "node:test";
import assert from "node:assert/strict";
import { creerCubeState } from "../src/core/cubeState.js";
import { creerGestionnaireDefis } from "../src/challenges/gestionnaireDefis.js";
import { creerDefi1, cardinalVersMonde } from "../src/challenges/defi1.js";
import { rouloCorpsDepuisMonde } from "../src/bench/sourceMouvement.js";

function indicateurEspion() {
  const journal = [];
  return { journal,
    flashCode: (n) => journal.push("code:" + n),
    flashErreur: () => journal.push("erreur"),
    flashSucces: () => journal.push("succes"),
    eteindre: () => journal.push("off") };
}

const CIBLE = ["Nord", "Est", "Sud", "Ouest", "Nord", "Est"];

function monter() {
  const indicateur = indicateurEspion();
  const coeur = creerCubeState();
  const gestion = creerGestionnaireDefis();
  gestion.enregistrer(creerDefi1({ indicateur, coeur, genererCible: () => CIBLE.slice(),
    pauseSuccesMs: 1000, dureeErreurMs: 3000 }));
  gestion.activer("defi1");
  return { indicateur, coeur, gestion };
}

// Reproduit la logique de main.onFleche pour un coup compte : on simule le gyro
// puis on laisse le coeur classifier en direction monde, route vers le defi.
function jouerCoup(coeur, gestion, directionMonde) {
  const r = rouloCorpsDepuisMonde(directionMonde, coeur.getM());
  const dm = coeur.appliquerRoulementBody(r.axeCorps, r.signe);
  gestion.onCoupRecu(dm);
  return dm;
}

test("la chaine complete resout le defi, Nord pose vers la gauche", () => {
  const { indicateur, coeur, gestion } = monter();
  let t = 0;
  // Premier coup : calibration vers Gauche -> Nord du cube = Gauche.
  gestion.onCalibration("Gauche");
  for (const cardinal of CIBLE) {
    t += 2000; gestion.tick(t);
    const gesteAttendu = cardinalVersMonde(cardinal, "Gauche");
    const dm = jouerCoup(coeur, gestion, gesteAttendu);
    assert.equal(dm, gesteAttendu); // la classification corps->monde retombe juste
  }
  assert.equal(gestion.actif.etat().resolu, true);
  assert.ok(indicateur.journal.includes("code:1"));  // Nord flashe 1
  assert.ok(indicateur.journal.includes("succes"));  // succes vert a la resolution
});

test("un mauvais coup remet le defi en attente de calibration", () => {
  const { coeur, gestion } = monter();
  gestion.onCalibration("Haut");           // Nord = Haut (rose par defaut)
  gestion.tick(0);
  jouerCoup(coeur, gestion, "Haut");        // cible[0] = Nord = Haut, bon
  assert.equal(gestion.actif.etat().progres, 1);
  gestion.tick(2000);
  jouerCoup(coeur, gestion, "Haut");        // cible[1] = Est = Droite, mauvais
  const etat = gestion.actif.etat();
  assert.equal(etat.progres, 0);
  assert.equal(etat.attendCalibration, true);
});
