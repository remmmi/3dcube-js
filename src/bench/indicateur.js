// Banc : indicateur lumineux (LED simulee par une barre DOM pleine largeur).
// En Arduino, cette couche est remplacee par le pilotage d'une LED physique. Le
// canal est volontairement etroit : on ne dispose que de lumiere.
//   flashCode(n)  : n clignotements jaunes (code de direction).
//   flashErreur() : clignotement rouge rapide (~6 Hz, ~3 s).
//   flashSucces() : clignotement vert accelere de 2 Hz a 20 Hz sur 5 s.
//   eteindre()    : coupe.
export function creerIndicateur(element) {
  let minuteur = null;

  function arreter() {
    if (minuteur !== null) { clearTimeout(minuteur); minuteur = null; }
  }
  function peindre(on, couleur) {
    element.style.background = on ? couleur : "#0c1322";
    element.style.boxShadow = on ? "inset 0 0 28px " + couleur + ", 0 0 16px " + couleur : "none";
  }
  function eteindre() {
    arreter();
    peindre(false, "#0c1322");
  }

  // n impulsions de couleur, periode periodeMs (demi-periode allumee / eteinte).
  function pulse(n, couleur, periodeMs) {
    arreter();
    let i = 0;
    function tic() {
      if (i >= n * 2) { eteindre(); return; }
      peindre(i % 2 === 0, couleur);
      i++;
      minuteur = setTimeout(tic, periodeMs / 2);
    }
    tic();
  }

  // Clignotement a frequence croissante de fDebut a fFin (Hz) sur dureeMs.
  // La demi-periode est recalculee a chaque bascule selon la frequence courante.
  function rampe(couleur, fDebut, fFin, dureeMs) {
    arreter();
    const debut = performance.now();
    let on = true;
    function tic() {
      const t = performance.now() - debut;
      if (t >= dureeMs) { eteindre(); return; }
      peindre(on, couleur);
      on = !on;
      const f = fDebut + (fFin - fDebut) * (t / dureeMs); // frequence a l'instant t
      minuteur = setTimeout(tic, 1000 / (2 * f));         // demi-periode
    }
    tic();
  }

  return {
    flashCode(n) { pulse(n, "#ffd23b", 700); },     // jaune, cadence lente lisible
    flashErreur() { pulse(9, "#e23b3b", 166); },     // rouge ~6 Hz sur ~3 s
    flashSucces() { rampe("#2ecc71", 2, 20, 5000); }, // vert 2->20 Hz sur 5 s
    eteindre,
  };
}
