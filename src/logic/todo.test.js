import { describe, it, expect } from 'vitest';
import { groupTasks, daysUntil } from './todo.js';
import { STATUS } from './models.js';
import { atMinutes } from './dates.js';

const TODAY = '2026-11-04';

function task(id, deadlineDate, status = STATUS.NOT_STARTED) {
  return { id, deadline: atMinutes(deadlineDate, 23 * 60 + 59).toISOString(), status };
}

const ids = (list) => list.map((t) => t.id);

describe('daysUntil', () => {
  it('teller dager til fristen', () => {
    expect(daysUntil(task('a', '2026-11-04').deadline, TODAY)).toBe(0);
    expect(daysUntil(task('a', '2026-11-05').deadline, TODAY)).toBe(1);
    expect(daysUntil(task('a', '2026-11-02').deadline, TODAY)).toBe(-2);
  });
});

describe('groupTasks', () => {
  it('regner frist innen 7 dager som aktiv, og 7 dager eller mer som kommende', () => {
    const { active, upcoming } = groupTasks([task('6-dager', '2026-11-10'), task('7-dager', '2026-11-11')], TODAY);
    expect(ids(active)).toEqual(['6-dager']);
    expect(ids(upcoming)).toEqual(['7-dager']);
  });

  it('regner påbegynt oppgave med fjern frist som aktiv', () => {
    const { active, upcoming } = groupTasks([task('fjern', '2026-12-20', STATUS.IN_PROGRESS)], TODAY);
    expect(ids(active)).toEqual(['fjern']);
    expect(upcoming).toEqual([]);
  });

  it('regner oppgave med passert frist som aktiv', () => {
    expect(ids(groupTasks([task('passert', '2026-11-01')], TODAY).active)).toEqual(['passert']);
  });

  it('legger fullførte oppgaver for seg, nyeste frist først', () => {
    const { active, completed } = groupTasks(
      [
        task('gammel', '2026-10-01', STATUS.COMPLETED),
        task('ny', '2026-11-06', STATUS.COMPLETED),
        task('aktiv', '2026-11-05'),
      ],
      TODAY,
    );
    expect(ids(completed)).toEqual(['ny', 'gammel']);
    expect(ids(active)).toEqual(['aktiv']);
  });

  it('sorterer aktive og kommende etter tidligste frist', () => {
    const { active, upcoming } = groupTasks(
      [task('b', '2026-11-08'), task('a', '2026-11-05'), task('d', '2026-12-01'), task('c', '2026-11-20')],
      TODAY,
    );
    expect(ids(active)).toEqual(['a', 'b']);
    expect(ids(upcoming)).toEqual(['c', 'd']);
  });

  it('gir tomme lister uten oppgaver', () => {
    expect(groupTasks([], TODAY)).toEqual({ active: [], upcoming: [], completed: [] });
  });
});
