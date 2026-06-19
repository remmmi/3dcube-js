// src/challenges/gestionnaireDefis.js
// Detient les modules de defi et route les coups vers le module actif.
// Prepare le multi-defi : plusieurs modules peuvent etre enregistres.
import { estModuleValide } from "./moduleDefi.js";

export function creerGestionnaireDefis() {
  const modules = new Map();
  let actif = null;

  function enregistrer(module) {
    if (!estModuleValide(module)) throw new Error("module de defi invalide");
    modules.set(module.id, module);
  }
  function activer(id) {
    if (!modules.has(id)) throw new Error("module inconnu: " + id);
    actif = modules.get(id);
    actif.init();
  }
  function onCalibration() { if (actif) actif.onCalibration(); }
  function onCoupRecu(directionMonde) { if (actif) actif.onCoup(directionMonde); }
  function onReset() { if (actif) actif.onReset(); }
  function tick(temps) { if (actif) actif.tick(temps); }

  return { enregistrer, activer, onCalibration, onCoupRecu, onReset, tick, get actif() { return actif; } };
}
