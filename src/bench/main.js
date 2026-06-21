// Banc : montage de l'application. Cable le coeur produit (orientation,
// classification), le moteur de defis et la couche navigateur (vue 3D, matrice,
// source de mouvement simulee, indicateur). C'est le seul fichier qui connait
// tout le monde ; chacun des modules reste ignorant des autres.

import { creerCubeState } from "../core/cubeState.js";
import { creerGestionnaireDefis } from "../challenges/gestionnaireDefis.js";
import { creerDefi1 } from "../challenges/defi1.js";
import { rouloCorpsDepuisMonde } from "./sourceMouvement.js";
import { creerIndicateurArretes } from "./indicateur.js";
import { creerMatrice, creerSauvegardes } from "./matrice.js";
import { creerVue3D } from "./vue3d.js";

const viewer = document.getElementById("viewer");

// Code revele a la resolution du defi (affiche dans la carte de victoire).
const CODE_SUCCES = "nocode";
// Delai avant de masquer la carte et de reinitialiser (laisse jouer le flash vert).
const SUCCES_DUREE_MS = 5200;

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

  // ---- Banc : matrice ----
  const matrice = creerMatrice({ tableBody: document.getElementById("matrix-body") });

  // ---- Moteur de defis ----
  const gestion = creerGestionnaireDefis();

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
      // Front montant de la resolution : on fete, puis reset comme apres une partie.
      const e = gestion.actif && gestion.actif.etat();
      if (e && e.resolu && !succesEnCours) declencherSucces();
    },
  });

  // ---- Indicateur lumineux : porte par les arretes du cube (a la place du voyant) ----
  // Le defi pilote la meme interface ; ici la "LED" est le cube lui-meme.
  const indicateur = creerIndicateurArretes(vue);
  gestion.enregistrer(creerDefi1({ indicateur, coeur }));

  gestion.activer("defi1");

  // ---- Reinitialisation : remet le cube et le defi a zero (etat de depart) ----
  function reinitialiser() {
    coeur.reset();
    vue.reinitialiserVue();
    indicateur.eteindre();
    sequence = [];
    gestion.activer("defi1"); // relance le defi (attente de calibration)
  }

  // ---- Succes : carte de victoire + flash vert, puis reset et disparition ----
  let succesEnCours = false;
  function declencherSucces() {
    succesEnCours = true;
    const carte = document.getElementById("succes");
    const codeEl = document.getElementById("succes-code");
    if (codeEl) codeEl.textContent = CODE_SUCCES;
    if (carte) { carte.classList.add("is-on"); carte.setAttribute("aria-hidden", "false"); }
    // Le clignotement vert (indicateur.flashSucces) est deja lance par le defi.
    // Apres l'animation : on efface la carte et on reinitialise comme apres defaite.
    setTimeout(() => {
      if (carte) { carte.classList.remove("is-on"); carte.setAttribute("aria-hidden", "true"); }
      reinitialiser();
      succesEnCours = false;
    }, SUCCES_DUREE_MS);
  }

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
  brancherReglagesLumieres(vue);

  // ---- Panneau banc : reglage en direct des lumieres ----
  // Branche les sliders sur l'API vue.reglages (glow/bloom/nappe) et sur la
  // variable CSS --aurora-opacity (orbs du decor). Tient a jour une zone de
  // texte copiable pour remonter les valeurs trouvees.
  function brancherReglagesLumieres(vue) {
    const r = vue.reglages;
    const root = document.documentElement;
    // Lit l'opacite d'aurore courante depuis la variable CSS (defaut 0.14).
    const auroreInit = parseFloat(
      getComputedStyle(root).getPropertyValue("--aurora-opacity")
    ) || 0.14;

    // Definition des controles : id, valeur initiale, et action de mise a jour.
    const controles = [
      { cle: "glow",   init: r.valeurs.glowArretes, set: (v) => r.setGlowArretes(v) },
      { cle: "force",  init: r.valeurs.bloomForce,  set: (v) => r.setBloomForce(v) },
      { cle: "rayon",  init: r.valeurs.bloomRayon,  set: (v) => r.setBloomRayon(v) },
      { cle: "seuil",  init: r.valeurs.bloomSeuil,  set: (v) => r.setBloomSeuil(v) },
      { cle: "aurore", init: auroreInit,            set: (v) => root.style.setProperty("--aurora-opacity", v) },
      { cle: "nappe",  init: r.valeurs.nappeSol,    set: (v) => r.setNappeSol(v) },
    ];

    const sortie = document.getElementById("lights-out");
    const valeurs = {};

    function majSortie() {
      if (!sortie) return;
      sortie.value =
        "Lumieres :\n" +
        `  glow arretes : ${valeurs.glow}\n` +
        `  bloom force  : ${valeurs.force}\n` +
        `  bloom rayon  : ${valeurs.rayon}\n` +
        `  bloom seuil  : ${valeurs.seuil}\n` +
        `  aurore orbs  : ${valeurs.aurore}\n` +
        `  nappe sol    : ${valeurs.nappe}`;
    }

    for (const c of controles) {
      const slider = document.getElementById("lr-" + c.cle);
      const affichage = document.getElementById("lo-" + c.cle);
      if (!slider) continue;
      const v0 = Number(c.init);
      slider.value = String(v0);
      valeurs[c.cle] = v0;
      if (affichage) affichage.textContent = v0.toFixed(2);
      c.set(v0); // applique l'etat initial (notamment l'aurore via CSS)
      slider.addEventListener("input", () => {
        const v = Number(slider.value);
        valeurs[c.cle] = v;
        if (affichage) affichage.textContent = v.toFixed(2);
        c.set(v);
        majSortie();
      });
    }
    majSortie();

    const boutonCopie = document.getElementById("lights-copy");
    if (boutonCopie && sortie) {
      boutonCopie.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(sortie.value);
          const libelle = boutonCopie.textContent;
          boutonCopie.textContent = "Copie !";
          setTimeout(() => { boutonCopie.textContent = libelle; }, 1200);
        } catch (e) {
          // Repli si l'API presse-papier est indisponible : selection du texte.
          sortie.focus();
          sortie.select();
        }
      });
    }
  }

  // ---- Traitement d'un appui directionnel ----
  function onFleche(direction) {
    if (succesEnCours) return;        // entrees verrouillees pendant la victoire
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

  // ---- Reinitialisation complete (bouton Recommencer) ----
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (vue.estEnAnimation()) return;
    reinitialiser();
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
