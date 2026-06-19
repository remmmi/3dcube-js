// Banc : la matrice 8x3 des sommets et le panneau des sauvegardes.
// La matrice lit les positions monde fournies par la vue (le coeur ne porte pas
// l'affichage). Les sauvegardes sont une commodite de banc, nommees par la
// sequence de directions ; le coeur ne conserve aucun historique.

const VERTEX_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"];

// Arrondi qui evite l'affichage de "-0".
function cleanNumber(value, decimals) {
  let v = Number(value.toFixed(decimals));
  if (v === 0) v = 0;
  return v;
}

// Construit les 8 lignes de la matrice et retourne { rafraichir(positions, decimals) }.
export function creerMatrice({ tableBody }) {
  const cellRefs = {};
  for (const name of VERTEX_NAMES) {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.className = "vertex-name";
    tdName.textContent = name;
    tr.appendChild(tdName);
    const refs = {};
    for (const axis of ["x", "y", "z"]) {
      const td = document.createElement("td");
      td.id = "cell-" + name + "-" + axis;
      td.textContent = "0";
      tr.appendChild(td);
      refs[axis] = td;
    }
    cellRefs[name] = refs;
    tableBody.appendChild(tr);
  }

  function rafraichir(positions, decimals) {
    for (const name of VERTEX_NAMES) {
      const p = positions[name];
      cellRefs[name].x.textContent = String(cleanNumber(p.x, decimals));
      cellRefs[name].y.textContent = String(cleanNumber(p.y, decimals));
      cellRefs[name].z.textContent = String(cleanNumber(p.z, decimals));
    }
  }

  return { rafraichir };
}

// Correspondance direction monde -> lettre courte pour nommer une sequence.
const DIR_LABEL = { Haut: "H", Bas: "B", Gauche: "G", Droite: "D" };

function sequenceName(seq) {
  if (seq.length === 0) return "Etat initial";
  return seq.map((d) => DIR_LABEL[d] || "?").join(" ");
}

// Panneau des sauvegardes. Les callbacks injectes decouplent du reste :
// - getSequence() : la sequence de directions courante (depuis le montage) ;
// - capturerPose() / appliquerPose(pose) : pose visuelle (depuis la vue) ;
// - onChargement(sequence) : prevenir le montage qu'un etat a ete recharge.
export function creerSauvegardes({ savesList, savesEmpty, getSequence, capturerPose, appliquerPose, onChargement }) {
  function ajouter() {
    const etat = { sequence: getSequence().slice(), pose: capturerPose() };
    if (savesEmpty) savesEmpty.style.display = "none";

    const li = document.createElement("li");
    li.className = "save-item";

    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "save-name";
    nameBtn.textContent = sequenceName(etat.sequence);
    nameBtn.title = "Recharger cet etat";
    nameBtn.addEventListener("click", () => {
      appliquerPose(etat.pose);
      if (onChargement) onChargement(etat.sequence.slice());
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "save-del";
    delBtn.textContent = "x";
    delBtn.title = "Supprimer cette sauvegarde";
    delBtn.addEventListener("click", () => {
      li.remove();
      if (savesEmpty && savesList.querySelectorAll(".save-item").length === 0) {
        savesEmpty.style.display = "";
      }
    });

    li.appendChild(nameBtn);
    li.appendChild(delBtn);
    savesList.appendChild(li);
  }

  return { ajouter };
}
