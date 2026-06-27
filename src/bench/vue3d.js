// Banc : la vue 3D Three.js. Extraite de l'ancien index.html monolithique.
// La vue ne porte plus l'etat logique du cube (qui vit dans le coeur produit) :
// elle se contente d'animer un roulement visuel et de refleter la pose.
// En Arduino, cette couche disparait (il n'y a pas d'ecran).

// Les 8 sommets imposes A..H, en coordonnees locales du cube (= monde au depart).
const VERTEX_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"];
const VERTEX_LOCAL = {
  A: [0, 0, 0], B: [1, 0, 0], C: [1, 1, 0], D: [0, 1, 0],
  E: [0, 0, 1], F: [1, 0, 1], G: [1, 1, 1], H: [0, 1, 1],
};

// Parametres de roulement par direction monde (convention francaise).
// Haut -> +Y, Bas -> -Y, Droite -> +X, Gauche -> -X.
const ROULEMENT_VUE = {
  Haut:   { axe: "x", angle: -Math.PI / 2, cible: "yMax" },
  Bas:    { axe: "x", angle: Math.PI / 2,  cible: "yMin" },
  Droite: { axe: "y", angle: Math.PI / 2,  cible: "xMax" },
  Gauche: { axe: "y", angle: -Math.PI / 2, cible: "xMin" },
};

// Cree la vue 3D dans le conteneur donne. Retourne une API qui masque Three.js.
// onFrame(temps) est appele a chaque frame (pour cadencer le defi via tick).
export function creerVue3D({
  THREE, OrbitControls, CSS2DRenderer, CSS2DObject,
  EffectComposer, RenderPass, UnrealBloomPass, OutputPass,
  RoundedBoxGeometry,
  conteneur, onFrame,
}) {
  const scene = new THREE.Scene();
  // Salle sombre : fond bleu nuit et brume pour fondre le sol dans le noir.
  scene.background = new THREE.Color(0x0a0f1a);
  scene.fog = new THREE.Fog(0x0a0f1a, 7, 17);

  const camera = new THREE.PerspectiveCamera(45, conteneur.clientWidth / conteneur.clientHeight, 0.1, 100);
  // Axe Z vertical : le "haut" de la camera est +Z.
  camera.up.set(0, 0, 1);
  // Pose 3/4 de base. Sur ecran etroit (mobile portrait), on recule la camera
  // le long du meme axe pour que le cube ne deborde pas.
  const CAM_TARGET = new THREE.Vector3(0.5, 0.5, 0.5);
  const CAM_OFFSET = new THREE.Vector3(3.0, -5.0, 2.7); // = (3.5,-4.5,3.2) - cible
  const aspectInit = conteneur.clientWidth / conteneur.clientHeight;
  const reculInit = aspectInit < 0.7 ? 1.7 : aspectInit < 1.0 ? 1.3 : 1;
  camera.position.copy(CAM_TARGET).addScaledVector(CAM_OFFSET, reculInit);
  camera.lookAt(CAM_TARGET);

  // alpha:true => le canvas peut devenir transparent (theme psychedelique : on
  // laisse voir le fond CSS anime derriere le cube). En theme sombre, un fond
  // opaque est repose sur la scene et recouvre tout.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  // Theme actif : en "psyche", on rend sans le composer (canvas transparent) pour
  // laisser voir le decor CSS 70s ; en "sombre", on passe par le bloom.
  let themePsyche = false;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(conteneur.clientWidth, conteneur.clientHeight);
  conteneur.appendChild(renderer.domElement);

  // ---- Post-traitement : bloom pour une lueur organique ----
  // Seules les zones lumineuses (arretes du cube, halo, axes) diffusent ; le
  // fond sombre reste net. OutputPass applique la conversion sRGB en fin de pile.
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(window.devicePixelRatio);
  composer.setSize(conteneur.clientWidth, conteneur.clientHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(conteneur.clientWidth, conteneur.clientHeight),
    0.7,  // force
    0.7,  // rayon (diffusion douce)
    0.27  // seuil de luminosite
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Calque CSS2D pour les labels HTML, superpose au canvas WebGL.
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(conteneur.clientWidth, conteneur.clientHeight);
  labelRenderer.domElement.classList.add("css2d-layer");
  conteneur.appendChild(labelRenderer.domElement);

  // OrbitControls deplace la camera seulement : aucun effet sur les coordonnees.
  const controls = new OrbitControls(camera, labelRenderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0.5, 0.5, 0.5);
  controls.update();

  // Eclairage de scene sombre : ambiance basse, une cle blanche, un remplissage
  // froid cyan pour sculpter le cube de cristal.
  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 0.95);
  directional.position.set(4, -3, 6);
  scene.add(directional);
  // Bi-teinte aurore : remplissage cyan d'un cote, frange violette de l'autre.
  const fill = new THREE.DirectionalLight(0x5bc8ff, 0.5);
  fill.position.set(-6, 2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xb478ff, 0.5);
  rim.position.set(6, 4, -1);
  scene.add(rim);

  // Sol : grille holographique (lignes bleutees qui se perdent dans la brume).
  // Recreee lors d'un changement de theme (les couleurs sont figees a la creation).
  let grid = null;
  function recreerGrille(c1, c2) {
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(100, 100, c1, c2);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
  }
  recreerGrille(0x3a72ad, 0x18283f);

  // Echafaudage cartesien (axes colores) : repere de lecture du jumeau.
  // Masque en theme psyche, ou le decor organique remplace les maths. La grille
  // (recreee a chaque theme) est geree a part via grid.visible.
  const mathHelpers = [];

  const GRID_HALF = 5;

  // Lignes d'axes colorees : X rouge, Y vert, Z bleu (vertical).
  function makeAxisLine(from, to, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color: color });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    mathHelpers.push(line);
  }
  const zLift = 0.002; // evite le z-fighting avec la grille
  makeAxisLine(new THREE.Vector3(-GRID_HALF, 0, zLift), new THREE.Vector3(GRID_HALF, 0, zLift), 0xff5a5a);
  makeAxisLine(new THREE.Vector3(0, -GRID_HALF, zLift), new THREE.Vector3(0, GRID_HALF, zLift), 0x36d07a);
  makeAxisLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 2), 0x5b9bff);

  // Cube dans un groupe : au depart sa matrice est l'identite.
  const cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  // Cube a chanfrein arrondi (RoundedBoxGeometry) si l'addon est fourni, sinon
  // cube net. Le rayon reste petit pour garder la lecture "cube" du jumeau.
  const CHANFREIN = RoundedBoxGeometry ? 0.1 : 0;
  const boxGeo = CHANFREIN > 0
    ? new RoundedBoxGeometry(1, 1, 1, 4, CHANFREIN)
    : new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0.5, 0.5, 0.5);
  // Cube de cristal : verre bleu translucide, legere lueur interne.
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x4aa3e0, transparent: true, opacity: 0.42,
    metalness: 0.1, roughness: 0.32,
    emissive: 0x103a5c, emissiveIntensity: 0.7,
  });
  cubeGroup.add(new THREE.Mesh(boxGeo, boxMat));
  const CUBE_BASE = new THREE.Color(0x4aa3e0);     // teinte de repos des faces
  const CUBE_EMISSIVE_BASE = new THREE.Color(0x103a5c);

  // Arretes lumineuses cyan : le cube lit comme un fil de neon.
  // Couleur sur-brillante (composantes > 1, hors tone mapping) pour que le
  // bloom deborde et forme un halo qui enveloppe le cube, sans nappe au sol.
  const EDGE_BASE = new THREE.Color(0x7fe3ff); // teinte de reference (avant gain)
  const GLOW_ARRETES = 1.1; // gain HDR initial applique a la teinte de reference
  // Arretes : 12 lignes propres posees sur la crete des congos arrondis. On les
  // calcule sur une boite legerement reduite (decalage = rayon * (1 - 1/racine2),
  // soit l'inset du point a 45 degres du congo) plutot que sur le maillage du
  // chanfrein (qui donnerait une nuee de segments).
  const insetArrete = CHANFREIN * (1 - Math.SQRT1_2);
  const edgeBox = new THREE.BoxGeometry(1 - 2 * insetArrete, 1 - 2 * insetArrete, 1 - 2 * insetArrete);
  edgeBox.translate(0.5, 0.5, 0.5);
  const edges = new THREE.EdgesGeometry(edgeBox);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x7fe3ff });
  edgeMat.toneMapped = false;
  edgeMat.color.copy(EDGE_BASE).multiplyScalar(GLOW_ARRETES); // nourrit le bloom
  const arretesMesh = new THREE.LineSegments(edges, edgeMat);
  cubeGroup.add(arretesMesh); // masque en psyche (le cube garde juste l'arrondi)

  // Lampe interne (theme psyche) : le cube EMET une lumiere dont la teinte tourne
  // cycliquement. Une point light + un halo additif donnent l'impression que la
  // lumiere emane du cube (il n'y a pas de bloom en psyche). Les flashs du defi
  // sont joues comme un gonflement lisse de cette lampe (cf. peindreSignal/animate).
  function texRadialeBlanche() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.45, "rgba(255,255,255,0.45)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const lampeLight = new THREE.PointLight(0xffffff, 0, 5);
  lampeLight.position.set(0.5, 0.5, 0.5);
  cubeGroup.add(lampeLight);
  const halo3d = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texRadialeBlanche(), color: 0xffffff, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
  }));
  halo3d.scale.set(2.7, 2.7, 1);
  halo3d.position.set(0.5, 0.5, 0.5);
  halo3d.visible = false;
  cubeGroup.add(halo3d);
  // Couleur de la lampe (repos cyclique) + etat de flash lisse.
  const _lampColor = new THREE.Color();
  const _flashColor = new THREE.Color();
  const _flashTmp = new THREE.Color();
  const _warmCream = new THREE.Color(0xfff0d8);
  let flashCible = null;        // couleur de flash adoucie, ou null
  let flashNiveau = 0;          // 0..1 niveau lisse courant
  let flashNiveauCible = 0;     // 0 ou 1 (pilote par l'indicateur)

  // Halo organique : nappe de lumiere additive posee au sol, qui suit le cube.
  // Texture radiale generee a la volee (degrade cyan vers transparent).
  function textureHalo() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(130,235,255,0.6)");
    grd.addColorStop(0.4, "rgba(80,180,255,0.2)");
    grd.addColorStop(1, "rgba(80,180,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2),
    new THREE.MeshBasicMaterial({
      map: textureHalo(), transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, fog: false,
      opacity: 0.04, // nappe au sol tres discrete : l'essentiel du halo vient des arretes
    })
  );
  halo.position.set(0.5, 0.5, 0.02); // plan XY = sol (axe Z vertical)
  scene.add(halo);
  const haloTmp = new THREE.Vector3();

  // Noeuds des sommets, enfants du cubeGroup (ils suivent le cube). Ils servent a
  // lire les positions monde et a placer le pivot ; les etiquettes A..H ont ete
  // retirees de l'affichage.
  const vertexNodes = {};
  const vertexLabels = []; // conserve vide : plus d'etiquettes de sommets
  for (const name of VERTEX_NAMES) {
    const [x, y, z] = VERTEX_LOCAL[name];
    const node = new THREE.Object3D();
    node.position.set(x, y, z);
    cubeGroup.add(node);
    vertexNodes[name] = node;
  }

  let isRolling = false;
  const tmpVec = new THREE.Vector3();

  // Easing doux partage (roulement et recadrage camera).
  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // ---- Suivi de camera : recadrage quand le cube approche du bord ----
  // On ne deplace jamais la camera pendant que le cube reste visible (il peut
  // rouler librement dans le cadre). Des que son centre sort d'une zone sure,
  // on translate camera et cible du meme vecteur (l'angle et le zoom sont
  // conserves) pour le ramener au centre, avec une transition douce.
  let recadrage = null; // { camPos, cible, delta, debut, duree }
  const MARGE_NDC = 0.7; // 1 = bord exact de l'ecran ; 0.7 garde une marge

  function centreCubeMonde() {
    const c = new THREE.Vector3(0.5, 0.5, 0.5);
    cubeGroup.localToWorld(c);
    return c;
  }
  function demarrerRecadrage(delta, duree) {
    recadrage = {
      camPos: camera.position.clone(),
      cible: controls.target.clone(),
      delta, debut: performance.now(), duree,
    };
  }
  function verifierEtRecadrer() {
    const centre = centreCubeMonde();
    const ndc = centre.clone().project(camera);
    if (Math.abs(ndc.x) > MARGE_NDC || Math.abs(ndc.y) > MARGE_NDC) {
      demarrerRecadrage(centre.sub(controls.target), 450);
    }
  }

  // Sommets de la face au sol (z minimal), pour placer le pivot.
  function getBottomVertices() {
    const positions = VERTEX_NAMES.map((name) => {
      const p = new THREE.Vector3();
      vertexNodes[name].getWorldPosition(p);
      return { name, p };
    });
    let minZ = Infinity;
    for (const v of positions) minZ = Math.min(minZ, v.p.z);
    return positions.filter((v) => Math.abs(v.p.z - minZ) < 1e-3);
  }

  // Anime un roulement de 90 degres autour d'une arrete au sol. onFini appele au snap.
  function animerRoulement(direction, onFini) {
    if (isRolling) return;
    const params = ROULEMENT_VUE[direction];
    if (!params) return;
    isRolling = true;

    const bottom = getBottomVertices();
    const faceCenter = new THREE.Vector3();
    for (const v of bottom) faceCenter.add(v.p);
    faceCenter.multiplyScalar(1 / bottom.length);
    const groundZ = bottom[0].p.z;

    let pivotPoint, axis;
    const angle = params.angle;
    if (params.axe === "x") {
      const targetY = params.cible === "yMax"
        ? Math.max(...bottom.map((v) => v.p.y))
        : Math.min(...bottom.map((v) => v.p.y));
      axis = new THREE.Vector3(1, 0, 0);
      pivotPoint = new THREE.Vector3(faceCenter.x, targetY, groundZ);
    } else {
      const targetX = params.cible === "xMax"
        ? Math.max(...bottom.map((v) => v.p.x))
        : Math.min(...bottom.map((v) => v.p.x));
      axis = new THREE.Vector3(0, 1, 0);
      pivotPoint = new THREE.Vector3(targetX, faceCenter.y, groundZ);
    }

    const pivot = new THREE.Group();
    pivot.position.copy(pivotPoint);
    scene.add(pivot);
    pivot.attach(cubeGroup); // conserve la pose monde

    const duration = 350;
    const startTime = performance.now();
    const quatStart = pivot.quaternion.clone();
    const quatDelta = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    const quatEnd = quatDelta.clone().multiply(quatStart);

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    function animateRoll(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      pivot.quaternion.copy(quatStart).slerp(quatEnd, easeInOut(t));
      if (t < 1) {
        requestAnimationFrame(animateRoll);
      } else {
        pivot.quaternion.copy(quatEnd);
        scene.attach(cubeGroup);
        scene.remove(pivot);
        // Snap position et orientation pour eviter la derive numerique.
        cubeGroup.position.x = Math.round(cubeGroup.position.x);
        cubeGroup.position.y = Math.round(cubeGroup.position.y);
        cubeGroup.position.z = Math.round(cubeGroup.position.z);
        const euler = new THREE.Euler().setFromQuaternion(cubeGroup.quaternion, "XYZ");
        const half = Math.PI / 2;
        euler.x = Math.round(euler.x / half) * half;
        euler.y = Math.round(euler.y / half) * half;
        euler.z = Math.round(euler.z / half) * half;
        cubeGroup.quaternion.setFromEuler(euler);
        cubeGroup.updateMatrixWorld(true);
        isRolling = false;
        verifierEtRecadrer();
        if (onFini) onFini();
      }
    }
    requestAnimationFrame(animateRoll);
  }

  // Remet le cube a sa pose d'origine (position et orientation identite).
  function reinitialiserVue() {
    if (isRolling) return;
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.quaternion.identity();
    cubeGroup.updateMatrixWorld(true);
    // Recentre instantanement la camera sur le cube revenu a l'origine.
    recadrage = null;
    const delta = new THREE.Vector3(0.5, 0.5, 0.5).sub(controls.target);
    camera.position.add(delta);
    controls.target.add(delta);
  }

  // Positions monde des 8 sommets, pour alimenter la matrice.
  function lirePositionsMonde() {
    const out = {};
    for (const name of VERTEX_NAMES) {
      vertexNodes[name].getWorldPosition(tmpVec);
      out[name] = { x: tmpVec.x, y: tmpVec.y, z: tmpVec.z };
    }
    return out;
  }

  function estEnAnimation() { return isRolling; }

  // Capture / restauration de pose pour les sauvegardes.
  function capturerPose() {
    const q = cubeGroup.quaternion, p = cubeGroup.position;
    return { pos: { x: p.x, y: p.y, z: p.z }, quat: { x: q.x, y: q.y, z: q.z, w: q.w } };
  }
  function appliquerPose(pose) {
    if (isRolling) return;
    cubeGroup.position.set(pose.pos.x, pose.pos.y, pose.pos.z);
    cubeGroup.quaternion.set(pose.quat.x, pose.quat.y, pose.quat.z, pose.quat.w);
    cubeGroup.updateMatrixWorld(true);
  }

  function onResize() {
    const w = conteneur.clientWidth, h = conteneur.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    labelRenderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // Boucle de rendu unique. onFrame permet de cadencer la logique du defi (tick).
  function animate() {
    requestAnimationFrame(animate);
    // Recadrage en cours : on translate camera et cible du meme vecteur.
    if (recadrage) {
      const t = Math.min((performance.now() - recadrage.debut) / recadrage.duree, 1);
      const e = ease(t);
      camera.position.copy(recadrage.camPos).addScaledVector(recadrage.delta, e);
      controls.target.copy(recadrage.cible).addScaledVector(recadrage.delta, e);
      if (t >= 1) recadrage = null;
    }
    controls.update();
    // Le halo suit le centre horizontal du cube (nappe de lumiere au sol).
    haloTmp.set(0.5, 0.5, 0);
    cubeGroup.localToWorld(haloTmp);
    halo.position.x = haloTmp.x;
    halo.position.y = haloTmp.y;
    if (onFrame) onFrame(performance.now());
    // Lampe interne (psyche) : teinte de repos qui tourne (~18 s), gonflee vers
    // la couleur de flash de maniere lisse (attaque vive, relache douce) pour un
    // rendu organique. Le cube EMET (emissif) + halo + point light => la lumiere
    // semble emaner du cube.
    if (themePsyche) {
      const h = (performance.now() * 0.000055) % 1;
      _lampColor.setHSL(h, 0.68, 0.6); // un peu moins sature = moins criard
      const k = flashNiveauCible > flashNiveau ? 0.16 : 0.05; // monte vite, retombe doux
      flashNiveau += (flashNiveauCible - flashNiveau) * k;
      _flashColor.copy(_lampColor);
      if (flashCible) _flashColor.lerp(flashCible, flashNiveau);
      boxMat.emissive.copy(_flashColor);
      boxMat.emissiveIntensity = 0.5 + 0.7 * flashNiveau;
      lampeLight.color.copy(_flashColor);
      lampeLight.intensity = 1.1 + 1.6 * flashNiveau;
      halo3d.material.color.copy(_flashColor);
      halo3d.material.opacity = 0.3 + 0.45 * flashNiveau;
    }
    // Psyche : rendu direct (canvas transparent, decor CSS visible). Sinon bloom.
    if (themePsyche) renderer.render(scene, camera);
    else composer.render();
    labelRenderer.render(scene, camera);
  }
  // Demarrage differe : le premier frame s'execute apres le retour de creerVue3D,
  // pour que onFrame (qui reference la vue) ne tourne pas avant son initialisation.
  requestAnimationFrame(animate);

  // ---- API de reglage des lumieres (banc) ----
  // Permet d'ajuster a chaud le glow des arretes, le bloom et la nappe au sol.
  // .valeurs reflete l'etat courant (pour affichage / copie depuis le banc).
  const reglages = {
    valeurs: {
      glowArretes: GLOW_ARRETES,
      bloomForce: bloom.strength,
      bloomRayon: bloom.radius,
      bloomSeuil: bloom.threshold,
      nappeSol: halo.material.opacity,
    },
    setGlowArretes(v) {
      reglages.valeurs.glowArretes = v;
      edgeMat.color.copy(EDGE_BASE).multiplyScalar(v);
    },
    setBloomForce(v) { reglages.valeurs.bloomForce = v; bloom.strength = v; },
    setBloomRayon(v) { reglages.valeurs.bloomRayon = v; bloom.radius = v; },
    setBloomSeuil(v) { reglages.valeurs.bloomSeuil = v; bloom.threshold = v; },
    setNappeSol(v) { reglages.valeurs.nappeSol = v; halo.material.opacity = v; },
  };

  // ---- Retour lumineux porte par les arretes (a la place d'une LED externe) ----
  // peindreArretes(couleur) : couleur != null => teinte de flash sur-brillante ;
  // couleur == null => retour a la teinte de repos (cyan, gain courant).
  const GLOW_FLASH = 5.0;        // gain HDR pendant un flash : fort pour que le
                                 // clignotement (surtout le rouge, peu lumineux)
                                 // ressorte au bloom, y compris sur mobile
  const _cFlash = new THREE.Color();
  function peindreArretes(couleur) {
    if (couleur == null) {
      edgeMat.color.copy(EDGE_BASE).multiplyScalar(reglages.valeurs.glowArretes);
    } else {
      _cFlash.set(couleur);
      edgeMat.color.copy(_cFlash).multiplyScalar(GLOW_FLASH);
    }
  }
  // Signal lumineux du defi, adapte au theme :
  //  - sombre : seules les arretes changent (fil de neon, on/off net assume).
  //  - psyche : on pilote la cible du flash de la lampe ; le gonflement et la
  //    retombee sont lisses dans animate (rendu organique, pas un on/off sec).
  function peindreSignal(couleur) {
    if (themePsyche) {
      if (couleur == null) {
        flashNiveauCible = 0; // relache : la lampe revient a sa teinte cyclique
      } else {
        // Adoucit la couleur (moins mecanique) : on la tire vers un blanc creme chaud.
        _flashTmp.set(couleur).lerp(_warmCream, 0.22);
        if (!flashCible) flashCible = new THREE.Color();
        flashCible.copy(_flashTmp);
        flashNiveauCible = 1;
      }
    } else {
      peindreArretes(couleur);
    }
  }

  // ---- Themes de la scene 3D ----
  // sombre : la salle sombre d'origine (fond nuit, brume, arretes cyan).
  // psyche : fond transparent (le decor CSS 70s passe au travers), arretes
  // magenta, grille acidulee, ambiance plus claire.
  const THEMES = {
    // sombre : la salle sombre (cube cristal bleu translucide, arretes cyan, maths visibles).
    sombre: { fond: 0x0a0f1a, fog: [0x0a0f1a, 7, 17], arrete: 0x7fe3ff, grille: [0x3a72ad, 0x18283f], ambient: 0.45, cubeOpacity: 0.42, cubeColor: 0x4aa3e0, cubeEmissive: 0x103a5c, math: true,  arretes: true },
    // psyche : poster 70s organique (cube blanc translucide arrondi, lampe interne cyclique, sans arretes ni labels).
    psyche: { fond: null,     fog: null,               arrete: 0x3a2233, grille: [0xcf8f6a, 0xe8c79a], ambient: 1.1,  cubeOpacity: 0.6,  cubeColor: 0xffffff, cubeEmissive: 0x000000, math: false, arretes: false },
  };
  function appliquerTheme(nom) {
    const t = THEMES[nom] || THEMES.sombre;
    themePsyche = (nom === "psyche");
    scene.background = (t.fond == null) ? null : new THREE.Color(t.fond);
    scene.fog = t.fog ? new THREE.Fog(t.fog[0], t.fog[1], t.fog[2]) : null;
    EDGE_BASE.set(t.arrete);
    edgeMat.color.copy(EDGE_BASE).multiplyScalar(reglages.valeurs.glowArretes);
    ambient.intensity = t.ambient;
    recreerGrille(t.grille[0], t.grille[1]);
    // Cube : teinte de repos + opacite selon le theme (on annule un flash residuel).
    CUBE_BASE.set(t.cubeColor);
    CUBE_EMISSIVE_BASE.set(t.cubeEmissive);
    boxMat.opacity = t.cubeOpacity;
    boxMat.transparent = t.cubeOpacity < 1;
    boxMat.needsUpdate = true;
    boxMat.color.copy(CUBE_BASE);
    boxMat.emissive.copy(CUBE_EMISSIVE_BASE);
    // Echafaudage cartesien : visible en sombre, masque en psyche (le decor
    // organique du poster fait office de monde).
    grid.visible = t.math;
    for (const o of mathHelpers) o.visible = t.math;
    // Arretes : tracees en sombre (fil de neon / indicateur), masquees en psyche.
    arretesMesh.visible = t.arretes;
    // Labels de sommets : visibles en sombre, retires en psyche.
    for (const l of vertexLabels) l.visible = !themePsyche;
    // Lampe interne (psyche) : halo + point light actifs en psyche seulement ;
    // l'emissif du cube est pilote image par image dans animate.
    halo3d.visible = themePsyche;
    lampeLight.intensity = themePsyche ? 1.1 : 0;
    flashCible = null;
    flashNiveau = 0;
    flashNiveauCible = 0;
    boxMat.emissiveIntensity = 0.7; // base (sombre) ; psyche la pilote dans animate
  }

  return {
    animerRoulement, reinitialiserVue, lirePositionsMonde,
    estEnAnimation, capturerPose, appliquerPose,
    VERTEX_NAMES, reglages, peindreArretes, peindreSignal, appliquerTheme,
  };
}
