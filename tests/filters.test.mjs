import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialFilters, filterParams, PAGE_SIZE, gradeLabel, formatTime } from '../lib/filters.ts';
test('shared URLs preserve valid search and discard unsupported cohorts', () => {
  const filters = initialFilters('?q=育成&grade=99&semester=8&number=6&academic_year=undefined', true);
  assert.equal(filters.q, '育成');
  assert.equal(filters.grade, '11');
  assert.equal(filters.academic_year, '');
  assert.equal(filters.semester, '1');
  assert.equal(filters.number, '1');
  assert.equal(filters.subject, '數學A');
});
test('pagination encodes literal search, selected school and exact comparison cohort', () => {
  const filters = initialFilters('?school_id=ychs&academic_year=115&grade=10&subject=數學A&q=100%25', true);
  const params = new URLSearchParams(filterParams(filters, 2));
  assert.equal(params.get('q'), '100%');
  assert.equal(params.get('school_id'), 'ychs');
  assert.equal(params.get('academic_year'), '115');
  assert.equal(params.get('offset'), String(PAGE_SIZE * 2));
  assert.equal(new URLSearchParams(filterParams(filters, 0, false)).has('offset'), false);
});
test('grade and naive database timestamps display in Taiwan time', () => {
  assert.equal(gradeLabel(7), '國一');
  assert.equal(gradeLabel(12), '高三');
  assert.equal(formatTime('2026-10-04T04:30:00'), formatTime('2026-10-04T04:30:00Z'));
});
