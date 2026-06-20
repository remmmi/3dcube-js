// Banc : montage de l'application. Cable le coeur produit (orientation,
// classification), le moteur de defis et la couche navigateur (vue 3D, matrice,
// source de mouvement simulee, indicateur). C'est le seul fichier qui connait
// tout le monde ; chacun des modules reste ignorant des autres.

import { creerCubeState } from "../core/cubeState.js";
import { creerGestionnaireDefis } from "../challenges/gestionnaireDefis.js";
import { creerDefi1 } from "../challenges/defi1.js";
import { rouloCorpsDepuisMonde } from "./sourceMouvement.js";
import { creerIndicateur } from "./indicateur.js";
import { creerMatrice, creerSauvegardes } from "./matrice.js";
import { creerVue3D } from "./vue3d.js";

const viewer = document.getElementById("viewer");

// Affiche une erreur claire a la place de la vue.
function showError(message) {
  const box = document.createElement("div");
  box.className = "error-box";
  box.textContent = message;
  viewer.appendChild(box);
}

// Test du support WebGL avant toute initialisation.
function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

// Correspondance touches / boutons -> directions monde (convention francaise).
const TOUCHE_DIRECTION = {
  ArrowUp: "Haut", ArrowDown: "Bas", ArrowLeft: "Gauche", ArrowRight: "Droite",
};
const BOUTON_DIRECTION = {
  "btn-up": "Haut", "btn-down": "Bas", "btn-left": "Gauche", "btn-right": "Droite",
};

if (!isWebGLAvailable()) {
  showError("WebGL n'est pas supporte par ce navigateur. La visualisation 3D ne peut pas etre affichee.");
} else {
  demarrer().catch((err) => {
    console.error(err);
    showError("Erreur lors du chargement de Three.js ou de l'initialisation de la scene. Verifiez votre connexion (CDN jsDelivr). Detail : " + err.message);
  });
}

async function demarrer() {
  // Imports dynamiques pour capturer une eventuelle erreur de chargement CDN.
  const THREE = await import("three");
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  const { CSS2DRenderer, CSS2DObject } = await import("three/addons/renderers/CSS2DRenderer.js");
  // Post-traitement : pile de bloom pour la lueur organique de la scene.
  const { EffectComposer } = await import("three/addons/postprocessing/EffectComposer.js");
  const { RenderPass } = await import("three/addons/postprocessing/RenderPass.js");
  const { UnrealBloomPass } = await import("three/addons/postprocessing/UnrealBloomPass.js");
  const { OutputPass } = await import("three/addons/postprocessing/OutputPass.js");

  // ---- Coeur produit ----
  const coeur = creerCubeState();

  // ---- Banc : indicateur, matrice ----
  const indicateur = creerIndicateur(document.getElementById("voyant"));
  const matrice = creerMatrice({ tableBody: document.getElementById("matrix-body") });

  // ---- Moteur de defis ----
  const gestion = creerGestionnaireDefis();
  gestion.enregistrer(creerDefi1({ indicateur, coeur }));

  // Sequence de directions courante (commodite d'affichage / sauvegardes).
  let sequence = [];

  // ---- Vue 3D : cadence le defi (tick) et rafraichit la matrice a chaque frame ----
  const vue = creerVue3D({
    THREE, OrbitControls, CSS2DRenderer, CSS2DObject,
    EffectComposer, RenderPass, UnrealBloomPass, OutputPass,
    conteneur: viewer,
    onFrame: (temps) => {
      // Le defi n'amorce le flash que lorsque le cube est immobile (auRepos).
      gestion.tick(temps, !vue.estEnAnimation());
      matrice.rafraichir(vue.lirePositionsMonde(), vue.estEnAnimation() ? 2 : 0);
    },
  });

  gestion.activer("defi1");

  // Remplit le bandeau avec le titre et l'explication du module de defi actif.
  function majBandeau() {
    const m = gestion.actif;
    if (!m) return;
    const titre = document.getElementById("defi-titre");
    const explication = document.getElementById("defi-explication");
    if (titre) titre.textContent = m.titre || "";
    if (explication) explication.textContent = m.description || "";
  }
  majBandeau();

  // ---- Traitement d'un appui directionnel ----
  function onFleche(direction) {
    if (vue.estEnAnimation()) return; // un roulement est deja en cours
    const etat = gestion.actif.etat();

    if (etat.attendCalibration) {
      // Premier coup (ou recalibration apres erreur) : coup de calibration pur.
      // Il roule visuellement mais ne compte pas ; il POSE le Nord du cube =
      // direction monde de ce coup. Le coeur se reinitialise ensuite.
      vue.animerRoulement(direction, () => {});
      gestion.onCalibration(direction);
      sequence = [];
      return;
    }

    // Coup normal : on simule la mesure du gyro (repere corps) puis on laisse le
    // coeur classifier en direction monde. C'est ce chemin qui est porte en C++.
    const r = rouloCorpsDepuisMonde(direction, coeur.getM());
    const dirMonde = coeur.appliquerRoulementBody(r.axeCorps, r.signe);
    vue.animerRoulement(direction, () => {});
    if (dirMonde) {
      sequence.push(dirMonde);
      gestion.onCoupRecu(dirMonde);
    }
  }

  // ---- Branchements clavier et boutons ----
  window.addEventListener("keydown", (event) => {
    const direction = TOUCHE_DIRECTION[event.key];
    if (direction) { onFleche(direction); event.preventDefault(); }
  });
  for (const [id, direction] of Object.entries(BOUTON_DIRECTION)) {
    document.getElementById(id).addEventListener("click", () => onFleche(direction));
  }

  // ---- Reinitialisation complete ----
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (vue.estEnAnimation()) return;
    coeur.reset();
    vue.reinitialiserVue();
    indicateur.eteindre();
    sequence = [];
    gestion.activer("defi1"); // relance le defi (attente de calibration)
  });

  // ---- Sauvegardes (commodite de banc) ----
  const sauvegardes = creerSauvegardes({
    savesList: document.getElementById("saves-list"),
    savesEmpty: document.getElementById("saves-empty"),
    getSequence: () => sequence,
    capturerPose: vue.capturerPose,
    appliquerPose: vue.appliquerPose,
    onChargement: (seq) => { sequence = seq; },
  });
  document.getElementById("btn-save").addEventListener("click", () => {
    if (vue.estEnAnimation()) return;
    sauvegardes.ajouter();
  });
}
