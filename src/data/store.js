// Holder hele tilstanden i appen: { data, ui }.
// `data` lagres i localStorage. `ui` er midlertidig (åpne skjema, feil, meldinger).
// Tilstanden endres bare via update(), og etter hver endring kalles render én gang.

export function createStore({ state, save, render }) {
  let current = state;

  return {
    getState() {
      return current;
    },

    // `change` er en ren funksjon: state → nyState
    update(change) {
      const next = change(current);
      if (next === current) return;

      let result = next;
      if (next.data !== current.data) {
        const saved = save(next.data);
        if (!saved.ok) {
          // Endringen beholdes i minnet, så neste lagring kan prøve igjen
          result = { ...next, ui: { ...next.ui, error: saved.error } };
        }
      }

      current = result;
      render(current);
    },

    // Første tegning når appen starter
    start() {
      render(current);
    },
  };
}
