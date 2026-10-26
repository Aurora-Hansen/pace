// Starter appen: henter lagrede data, lager store og kobler hendelser til endringer.
import { load, save, loadTheme, saveTheme } from './data/storage.js';
import { createStore } from './data/store.js';
import * as actions from './data/actions.js';
import { createInitialState } from './logic/models.js';
import { toDateKey } from './logic/dates.js';
import { now, isSimulated } from './data/clock.js';
import { render } from './ui/render.js';
import { prepareExport } from './logic/ics.js';
import { serializeBackup, parseBackup, backupFilename, MAX_BACKUP_BYTES } from './logic/backup.js';
import { eksport } from './tekster.js';
import { greetingPeriod } from './logic/greeting.js';

const root = document.querySelector('#app');
const newId = () => crypto.randomUUID();

const loaded = load();
const data = loaded.state ?? createInitialState({ userId: newId() });

// Ukevisningen er for trang på mobil, så smale skjermer starter i dagsvisning
const calendarMode = window.matchMedia('(max-width: 40rem)').matches ? 'day' : 'week';

const startNow = now();

// Lys/mørk modus: lagret valg og systeminnstilling. data-theme er allerede satt av skriptet i <head>.
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

const store = createStore({
  state: {
    data,
    ui: actions.createInitialUi({
      error: loaded.error,
      today: toDateKey(startNow),
      calendarMode,
      simulatedNow: isSimulated() ? startNow.toISOString() : null,
      greeting: greetingPeriod(startNow),
      theme: loadTheme(),
      systemDark: darkQuery.matches,
    }),
  },
  save,
  render: (state) => render(state, root),
});

// Skjema: data-form="navn" → endring som får skjemaverdiene
const formActions = {
  settings: (values) => actions.submitSettings(values),
  course: (values) => actions.submitCourse(values, newId()),
  fixedBlock: (values) => actions.submitFixedBlock(values, newId()),
  // Oppgaveskjemaet har tre knapper: lagre, «Foreslå tidsbruk» og «Bruk forslaget»
  task: (values) => {
    if (values.intent === 'estimate') return actions.suggestEstimate(values);
    if (values.intent === 'use-estimate') return actions.useEstimate(values);
    return actions.submitTask(values, newId(), now());
  },
  progress: (values) => actions.submitProgress(values),
  adjust: (values) => actions.submitAdjust(values, now()),
  wizard: (values) => actions.submitWizard(values, newId(), now()),
};

// Knapper: data-action="navn" → endring som får knappens data-attributter
const clickActions = {
  'show-view': actions.showView,
  'dismiss-error': actions.dismissError,
  'calendar-mode': actions.setCalendarMode,
  'calendar-step': actions.stepCalendar,
  'calendar-today': actions.calendarToday,
  'calendar-open-day': actions.openCalendarDay,
  'add-fixed-from-calendar': actions.addFixedBlockFromCalendar,
  'edit-fixed-from-calendar': actions.editFixedBlockFromCalendar,
  'edit-course': actions.editCourse,
  'cancel-course': actions.cancelCourseForm,
  'open-fixed-block': actions.openFixedBlockForm,
  'edit-fixed-block': actions.editFixedBlock,
  'cancel-fixed-block': actions.cancelFixedBlockForm,
  'open-task': actions.openTaskForm,
  'open-task-from-today': actions.openTaskFromToday,
  'edit-task': actions.editTask,
  'cancel-task': actions.cancelTaskForm,
  'open-progress': actions.openProgressForm,
  'cancel-progress': actions.cancelProgressForm,
  'complete-task': actions.markTaskDone,
  'reopen-task': actions.reopenTaskAction,
  'toggle-session': actions.toggleSession,
  redistribute: actions.redistributeTask,
  'keep-plan': actions.keepPlan,
  'open-adjust': actions.openAdjustForm,
  'cancel-adjust': actions.cancelAdjustForm,
  'load-sample': () => actions.requestSampleData(now()),
  'confirm-sample': () => actions.loadSampleData(now()),
  'clear-all': actions.askClearAll,
  'confirm-reset': actions.clearAllData,
  'dismiss-notice': actions.dismissNotice,
  'open-export': actions.openExportForm,
  'cancel-export': actions.cancelExportForm,
  'close-wizard': actions.closeWizard,
  'restart-wizard': actions.restartWizard,
  'toggle-theme': actions.toggleTheme,
  'confirm-import': () => actions.confirmImport(now()),
  'cancel-import': actions.cancelImport,
  'set-theme': actions.setTheme,
  'ask-delete': actions.askDelete,
  'cancel-delete': actions.cancelDelete,
  'confirm-delete': () => actions.confirmDelete({ token: newId() }),
  'undo-delete': actions.undoDelete,
};

// Laster ned en fil. Dette er en sideeffekt og hører ikke hjemme i render eller i endringene.
function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Eksport til kalenderfil: filen lages av en ren funksjon, så lastes den ned, og tilstanden oppdateres
function exportCalendar(values) {
  const state = store.getState();
  const result = prepareExport(state.data, values, { today: state.ui.today, now: now(), text: eksport.ics });
  if (result.error) {
    store.update(actions.exportFailed(values, result.error));
    return;
  }
  downloadFile(result.filename, result.content, 'text/calendar;charset=utf-8');
  store.update(actions.exportDone());
}

// Alle endringer går via withReplan, så planen bygges på nytt når lagrede data endres.
// Når veiviseren lukkes, flyttes fokus til hovedinnholdet, så tastatur- og skjermleserbrukere ikke mister plassen.
// --- Angre sletting: 5 sekunder, men pause mens meldingen har tastaturfokus eller musepekeren over seg ---
const UNDO_MS = 5000;
let undoTimer = null;

function scheduleUndoExpiry() {
  clearTimeout(undoTimer);
  const undo = store.getState().ui.undo;
  if (!undo) return;
  const toast = root.querySelector('.undo-toast');
  const active = document.activeElement;
  const keyboardFocus = toast?.contains(active) && active.matches(':focus-visible');
  if (toast?.matches(':hover') || keyboardFocus) return;
  undoTimer = setTimeout(() => store.update(actions.expireUndo({ token: undo.token })), UNDO_MS);
}

for (const type of ['focusin', 'focusout', 'mouseover', 'mouseout']) {
  root.addEventListener(type, (event) => {
    // Vent til fokus/peker har flyttet seg ferdig før vi sjekker
    if (event.target.closest?.('.undo-toast')) setTimeout(scheduleUndoExpiry, 0);
  });
}

// Valg av lys/mørk modus brukes på <html> og lagres med en gang.
function update(change) {
  const before = store.getState().ui;
  store.update(actions.withReplan(change, now()));
  const after = store.getState().ui;
  if (before.wizard && !after.wizard) root.querySelector('#innhold')?.focus();
  if (before.undo?.token !== after.undo?.token) scheduleUndoExpiry();
  if (before.theme !== after.theme) {
    applyTheme(after.theme);
    saveTheme(after.theme);
  }
}

root.addEventListener('submit', (event) => {
  if (event.target.dataset.form === 'export') {
    event.preventDefault();
    exportCalendar(Object.fromEntries(new FormData(event.target)));
    return;
  }
  const action = formActions[event.target.dataset.form];
  if (!action) return;
  event.preventDefault();
  // `submitter` tar med navnet på knappen som ble trykket (f.eks. intent=estimate)
  const values = Object.fromEntries(new FormData(event.target, event.submitter));
  update(action(values));
});

// Sikkerhetskopi: last ned alle data som JSON
function exportBackup() {
  const state = store.getState();
  downloadFile(backupFilename(state.ui.today), serializeBackup(state.data, now()), 'application/json');
  update(actions.backupExported());
}

// Gjenopprett: les filen, valider den, og la brukeren bekrefte før noe erstattes
async function importBackup(file) {
  const result = file.size > MAX_BACKUP_BYTES ? { error: 'FILEN_ER_FOR_STOR' } : parseBackup(await file.text());
  update(actions.importLoaded(result));
}

root.addEventListener('click', (event) => {
  if (event.target.closest('[data-action="export-backup"]')) {
    exportBackup();
    return;
  }
  const button = event.target.closest('[data-action]');
  const action = clickActions[button?.dataset.action];
  if (action) update(action({ ...button.dataset }));
});

// Radioknapper (lys/mørk modus) kan også endres med piltaster
root.addEventListener('change', (event) => {
  const input = event.target;
  if (input.matches('[data-import]') && input.files?.[0]) {
    importBackup(input.files[0]);
    return;
  }
  if (input.type !== 'radio' || !input.dataset.action) return;
  const action = clickActions[input.dataset.action];
  if (action) update(action({ ...input.dataset }));
});

// Systeminnstillingen kan endres mens appen er åpen
darkQuery.addEventListener('change', (event) => store.update(actions.setSystemDark(event.matches)));

// Veiviseren: Esc lukker, og Tab går i ring inne i dialogen (WAI-ARIA-mønster for modale dialoger)
document.addEventListener('keydown', (event) => {
  if (!store.getState().ui.wizard) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    update(actions.closeWizard());
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...root.querySelectorAll('.wizard :is(button, input, select, textarea, [href])')].filter(
    (element) => !element.disabled,
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !root.querySelector('.wizard').contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !root.querySelector('.wizard').contains(active))) {
    event.preventDefault();
    first.focus();
  }
});

// Daglig sjekk når appen åpnes, og når den vises igjen etter å ha stått åpen over midnatt.
// Veiviseren vises første gang appen åpnes.
store.start();
store.update(actions.startDay(startNow));
store.update(actions.showWizardIfNew());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  store.update(actions.newDay(now()));
  store.update(actions.refreshGreeting(now()));
});
