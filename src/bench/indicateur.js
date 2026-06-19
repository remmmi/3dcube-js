// Banc : indicateur lumineux (LED simulee par un element DOM). En Arduino, cette
// couche est remplacee par le pilotage d'une LED physique. Le canal est volontai-
// rement etroit : on ne dispose que de lumiere. flashCode(n) clignote n fois (code
// de direction), flashErreur() clignote vite en rouge, eteindre() coupe.
export function creerIndicateur(element) {
  let minuteur = null;

  function arreter() {
    if (minuteur !== null) { clearTimeout(minuteur); minuteur = null; }
  }
  function eteindre() {
    arreter();
    element.style.background = "#222";
    element.style.boxShadow = "none";
  }

  // n impulsions de couleur, periode periodeMs (demi-periode allumee / eteinte).
  function pulse(n, couleur, periodeMs) {
    arreter();
    let i = 0;
    function tic() {
      if (i >= n * 2) { eteindre(); return; }
      const on = i % 2 === 0;
      element.style.background = on ? couleur : "#222";
      element.style.boxShadow = on ? "0 0 18px " + couleur : "none";
      i++;
      minuteur = setTimeout(tic, periodeMs / 2);
    }
    tic();
  }

  return {
    flashCode(n) { pulse(n, "#ffd23b", 520); },   // jaune, cadence lente lisible
    flashErreur() { pulse(9, "#e23b3b", 166); },   // rouge ~6 Hz sur ~3 s
    eteindre,
  };
}
