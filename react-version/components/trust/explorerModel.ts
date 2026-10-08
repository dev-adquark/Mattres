/**
 * The answers the /methodology weight explorer lets you change, and how a
 * selection maps to a row of the engine-computed weight table built in
 * methodologyData.ts. Pure data + one index function, safe on the client.
 * Only answers that actually re-weight the score in lib/rules/0.2.json are
 * listed (firmness preference changes fit, not weights).
 */
import type { ExplorerField, ExplorerSelection } from './methodologyTypes';

export const EXPLORER_FIELDS: readonly ExplorerField[] = [
  {
    id: 'sleepPosition',
    legend: 'How you sleep',
    options: [
      { value: 'side', label: 'Side' },
      { value: 'back', label: 'Back' },
      { value: 'stomach', label: 'Stomach' },
      { value: 'combination', label: 'Combination' },
    ],
    defaultValue: 'combination',
  },
  {
    id: 'sleepTemperature',
    legend: 'Temperature',
    options: [
      { value: 'cold', label: 'Sleep cold' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'hot', label: 'Sleep hot' },
    ],
    defaultValue: 'neutral',
  },
  {
    id: 'motionSensitivity',
    legend: 'Sharing the bed',
    options: [
      { value: 'single', label: 'Sleep alone' },
      { value: 'couple-low', label: 'Partner, sound sleeper' },
      { value: 'couple-high', label: 'Partner, light sleeper' },
    ],
    defaultValue: 'couple-low',
  },
  {
    id: 'edgeImportance',
    legend: 'Edge support matters',
    options: [
      { value: 'low', label: 'A little' },
      { value: 'medium', label: 'Somewhat' },
      { value: 'high', label: 'A lot' },
    ],
    defaultValue: 'medium',
  },
  {
    id: 'painFocus',
    legend: 'Where you feel it',
    options: [
      { value: 'none', label: 'None' },
      { value: 'shoulders', label: 'Shoulders' },
      { value: 'hips', label: 'Hips' },
      { value: 'lower-back', label: 'Lower back' },
      { value: 'whole-body', label: 'Whole body' },
    ],
    defaultValue: 'none',
  },
  {
    id: 'bodyWeight',
    legend: 'Body weight',
    options: [
      { value: 'under', label: 'Under 230 lb', weightLb: 160 },
      { value: 'over', label: '230 lb and up', weightLb: 250 },
    ],
    defaultValue: 'under',
  },
];

/** Index of a combination in the flat table (row-major over EXPLORER_FIELDS). */
export function comboIndex(fields: readonly ExplorerField[], selection: ExplorerSelection): number {
  let index = 0;
  for (const field of fields) {
    const i = field.options.findIndex((o) => o.value === selection[field.id]);
    index = index * field.options.length + Math.max(0, i);
  }
  return index;
}

/** The default answer for every field. */
export function defaultSelection(fields: readonly ExplorerField[]): ExplorerSelection {
  return Object.fromEntries(fields.map((f) => [f.id, f.defaultValue])) as ExplorerSelection;
}
