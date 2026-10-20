// Knappen «Prøv med eksempeldata», med spørsmål når det finnes data som blir erstattet.
// Brukes i tomme tilstander og under Innstillinger.
import { eksempeldata as t, knapper } from '../tekster.js';

export function sampleDataButton(state, buttonClass = 'btn btn-secondary') {
  if (state.ui.confirm?.kind === 'sample') {
    return `
      <div class="confirm">
        <p>${t.sporsmal}</p>
        <div class="row-actions">
          <button class="btn btn-primary btn-small" type="button" data-action="confirm-sample" data-autofocus>${t.jaErstatt}</button>
          <button class="btn btn-secondary btn-small" type="button" data-action="cancel-delete">${knapper.avbryt}</button>
        </div>
      </div>`;
  }
  return `<button class="${buttonClass}" type="button" data-action="load-sample">${t.knapp}</button>`;
}
