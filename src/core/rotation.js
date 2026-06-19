// src/core/rotation.js
// Maths entieres sur matrices 3x3 et vecteurs 3. Aucune dependance.
// Repere corps vers monde. Code produit, transposable en C++.

export const IDENTITE = [[1,0,0],[0,1,0],[0,0,1]];

// Produit matriciel 3x3 (a . b).
export function multiplier(a, b) {
  const r = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++)
        r[i][j] += a[i][k] * b[k][j];
  return r;
}

// Transposee (inverse d'une matrice de rotation).
export function transposer(m) {
  return [[m[0][0],m[1][0],m[2][0]],
          [m[0][1],m[1][1],m[2][1]],
          [m[0][2],m[1][2],m[2][2]]];
}

// Applique m a un vecteur colonne v.
export function appliquer(m, v) {
  return [m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2],
          m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2],
          m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]];
}

// Colonne j de m (= m . e_j).
export function colonne(m, j) {
  return [m[0][j], m[1][j], m[2][j]];
}

// Egalite stricte de deux matrices 3x3.
export function egales(a, b) {
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (a[i][j] !== b[i][j]) return false;
  return true;
}
