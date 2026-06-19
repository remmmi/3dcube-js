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
export function creerVue3D({ THREE, OrbitControls, CSS2DRenderer, CSS2DObject, conteneur, onFrame }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f7fb);

  const camera = new THREE.PerspectiveCamera(45, conteneur.clientWidth / conteneur.clientHeight, 0.1, 100);
  // Axe Z vertical : le "haut" de la camera est +Z.
  camera.up.set(0, 0, 1);
  camera.position.set(3.5, -4.5, 3.2);
  camera.lookAt(0.5, 0.5, 0.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(conteneur.clientWidth, conteneur.clientHeight);
  conteneur.appendChild(renderer.domElement);

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

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(4, -3, 6);
  scene.add(directional);

  // Sol : grille horizontale (le GridHelper par defaut est dans XZ, on le tourne).
  const grid = new THREE.GridHelper(10, 10, 0x9fb4c8, 0xcdd9e4);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  // Graduations numeriques des axes X et Y, fixes dans la scene (reperes de lecture).
  function makeAxisTick(text, x, y, variant) {
    const div = document.createElement("div");
    div.className = "axis-tick axis-tick-" + variant;
    div.textContent = text;
    const obj = new CSS2DObject(div);
    obj.position.set(x, y, 0);
    scene.add(obj);
  }
  const GRID_HALF = 5;
  const TICK_GAP = 0.12;

  // Lignes d'axes colorees : X rouge, Y vert, Z bleu (vertical).
  function makeAxisLine(from, to, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color: color });
    scene.add(new THREE.Line(geo, mat));
  }
  const zLift = 0.002; // evite le z-fighting avec la grille
  makeAxisLine(new THREE.Vector3(-GRID_HALF, 0, zLift), new THREE.Vector3(GRID_HALF, 0, zLift), 0xd23b3b);
  makeAxisLine(new THREE.Vector3(0, -GRID_HALF, zLift), new THREE.Vector3(0, GRID_HALF, zLift), 0x1f9e4d);
  makeAxisLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 2), 0x3b6fd2);
  for (let i = -GRID_HALF; i <= GRID_HALF; i++) {
    if (i === 0) continue;
    makeAxisTick(String(i), i, -TICK_GAP, "x");
    makeAxisTick(String(i), -TICK_GAP, i, "y");
  }
  makeAxisTick("0", -TICK_GAP, -TICK_GAP, "o");

  // Cube dans un groupe : au depart sa matrice est l'identite.
  const cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0.5, 0.5, 0.5);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x4a90d9, transparent: true, opacity: 0.55, metalness: 0.05, roughness: 0.6,
  });
  cubeGroup.add(new THREE.Mesh(boxGeo, boxMat));

  const edges = new THREE.EdgesGeometry(boxGeo);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x14304d });
  cubeGroup.add(new THREE.LineSegments(edges, edgeMat));

  // Noeuds des sommets + labels CSS2D, enfants du cubeGroup (ils suivent le cube).
  const CENTER = new THREE.Vector3(0.5, 0.5, 0.5);
  const vertexNodes = {};
  for (const name of VERTEX_NAMES) {
    const [x, y, z] = VERTEX_LOCAL[name];
    const node = new THREE.Object3D();
    node.position.set(x, y, z);
    cubeGroup.add(node);
    vertexNodes[name] = node;

    const dir = new THREE.Vector3(x, y, z).sub(CENTER).normalize();
    const div = document.createElement("div");
    div.className = "vertex-label";
    div.textContent = name;
    const label = new CSS2DObject(div);
    label.position.copy(dir.multiplyScalar(0.25));
    node.add(label);
  }

  let isRolling = false;
  const tmpVec = new THREE.Vector3();

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
    labelRenderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // Boucle de rendu unique. onFrame permet de cadencer la logique du defi (tick).
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (onFrame) onFrame(performance.now());
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  // Demarrage differe : le premier frame s'execute apres le retour de creerVue3D,
  // pour que onFrame (qui reference la vue) ne tourne pas avant son initialisation.
  requestAnimationFrame(animate);

  return {
    animerRoulement, reinitialiserVue, lirePositionsMonde,
    estEnAnimation, capturerPose, appliquerPose,
    VERTEX_NAMES,
  };
}
