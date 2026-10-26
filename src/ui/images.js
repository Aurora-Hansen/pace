// Illustrasjonene i to størrelser: 160 px for vanlige skjermer og 320 px for retina.
// Nettleseren velger ut fra `sizes` (hvor bredt bildet vises) og skjermens pikseltetthet.
import allDone160 from '../images/all-done-160.webp';
import allDone320 from '../images/all-done-320.webp';
import emptyCalendar160 from '../images/empty-calendar-160.webp';
import emptyCalendar320 from '../images/empty-calendar-320.webp';
import emptyTasks160 from '../images/empty-tasks-160.webp';
import emptyTasks320 from '../images/empty-tasks-320.webp';

const variants = {
  allDone: [allDone160, allDone320],
  emptyCalendar: [emptyCalendar160, emptyCalendar320],
  emptyTasks: [emptyTasks160, emptyTasks320],
};

// Pyntebilde (alt=""). `size` er visningsbredden i rem, som i CSS (10rem i tomme tilstander, 7,5rem i kompakt).
export function illustration(name, size = 10) {
  const [small, large] = variants[name];
  const px = size * 16;
  return `<img src="${small}" srcset="${small} 160w, ${large} 320w" sizes="${size}rem" alt="" width="${px}" height="${px}" decoding="async">`;
}
