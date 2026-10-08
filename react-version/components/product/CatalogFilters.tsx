'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { MATTRESS_TYPE_LABEL } from '@/lib/firmness';
import type { MattressType } from '@/lib/types';
import { buttonClassName } from '@/components/ui/Button';
import { iconButtonClassName } from '@/components/ui/IconButton';
import { cx } from '@/components/ui/cx';
import { CATALOG_RATING_FIELDS, CATALOG_RATING_KEYS, MATERIAL_TAGS } from '@/components/catalog/catalogData';
import { FIRMNESS_BANDS, PRICE_BUCKETS, TYPE_ORDER, RATED_THRESHOLD, FIT_POSITIONS, FIT_THRESHOLD } from './catalogQuery';
import type { CatalogState, FacetCounts, ListFacet } from './catalogQuery';
import styles from './Catalog.module.css';

/** Adds or removes one value of a list facet; `filterName` is the analytics name of the filter. */
export type ToggleFacet = (facet: ListFacet, value: string, filterName: string) => void;

/** Analytics payload for filter_used (minus the result count, added by the explorer). */
export interface FilterAnalytics {
  filter: string;
  value: string;
  action: 'add' | 'remove' | 'set';
}

export type UpdateState = (patch: Partial<CatalogState>, analytics?: FilterAnalytics) => void;

export interface FilterPanelProps {
  state: CatalogState;
  counts: FacetCounts;
  brands: readonly { slug: string; name: string }[];
  unpricedTotal: number;
  toggleFacet: ToggleFacet;
  update: UpdateState;
  hasReference: boolean;
}

const TYPE_LABEL: Partial<Record<MattressType, string>> = MATTRESS_TYPE_LABEL;

export function FilterPanel({ state, counts, brands, unpricedTotal, toggleFacet, update, hasReference }: FilterPanelProps) {
  const uid = useId();
  return (
    <div className={styles.panel}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Mattress type</legend>
        <div className={styles.options}>
          {TYPE_ORDER.map((t) => (
            <Option
              key={t}
              type="checkbox"
              name={`${uid}-type`}
              checked={state.types.includes(t)}
              onChange={() => toggleFacet('types', t, 'type')}
              label={TYPE_LABEL[t] ?? t}
              count={counts.types[t]}
            />
          ))}
        </div>
      </fieldset>

      {hasReference ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Strong fit for</legend>
          <div className={styles.options}>
            {FIT_POSITIONS.map((p) => (
              <Option
                key={p.id}
                type="checkbox"
                name={`${uid}-fit`}
                checked={state.fit.includes(p.id)}
                onChange={() => toggleFacet('fit', p.id, 'fit')}
                label={p.label}
                count={counts.fit[p.id]}
              />
            ))}
          </div>
          <p className={styles.hint}>
            Match Score of {FIT_THRESHOLD}+ for a reference 160 lb sleeper in that position (sleeping alone, neutral temperature, no firmness
            preference). Your own score may differ.
          </p>
        </fieldset>
      ) : null}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Firmness</legend>
        <div className={styles.options}>
          {FIRMNESS_BANDS.filter((b) => counts.firmness[b.id] > 0 || state.firmness.includes(b.id)).map((b) => (
            <Option
              key={b.id}
              type="checkbox"
              name={`${uid}-firm`}
              checked={state.firmness.includes(b.id)}
              onChange={() => toggleFacet('firmness', b.id, 'firmness')}
              label={b.label}
              count={counts.firmness[b.id]}
            />
          ))}
        </div>
        <p className={styles.hint}>Models sold in several firmness options appear under each one they offer.</p>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Queen price</legend>
        <div className={styles.options}>
          <Option type="radio" name={`${uid}-price`} checked={!state.price} onChange={() => update({ price: '' }, { filter: 'price', value: 'any', action: 'set' })} label="Any price" />
          {PRICE_BUCKETS.map((b) => (
            <Option
              key={b.id}
              type="radio"
              name={`${uid}-price`}
              checked={state.price === b.id}
              onChange={() => update({ price: b.id }, { filter: 'price', value: b.id, action: 'set' })}
              label={b.label}
              count={counts.price[b.id]}
            />
          ))}
        </div>
        <p className={styles.hint}>{unpricedTotal} mattresses have no confirmed US-dollar Queen price and are left out when you pick a range.</p>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Construction notes list</legend>
        <div className={styles.options}>
          {MATERIAL_TAGS.filter((m) => counts.material[m.id] > 0 || state.material.includes(m.id)).map((m) => (
            <Option
              key={m.id}
              type="checkbox"
              name={`${uid}-material`}
              checked={state.material.includes(m.id)}
              onChange={() => toggleFacet('material', m.id, 'material')}
              label={m.label}
              count={counts.material[m.id]}
            />
          ))}
        </div>
        <p className={styles.hint}>Matched against each manufacturer&apos;s published construction notes. We haven&apos;t cut these mattresses open.</p>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Rated {RATED_THRESHOLD}+ by independent reviewers</legend>
        <div className={styles.options}>
          {CATALOG_RATING_KEYS.map((key) => (
            <Option
              key={key}
              type="checkbox"
              name={`${uid}-rated`}
              checked={state.rated.includes(key)}
              onChange={() => toggleFacet('rated', key, 'rated')}
              label={CATALOG_RATING_FIELDS[key].label}
              count={counts.rated[key]}
            />
          ))}
        </div>
        <p className={styles.hint}>Only mattresses with a third-party rating on file can match. Unrated ones aren&apos;t assumed to be good or bad.</p>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Brand</legend>
        <div className={cx(styles.options, styles.brandList)}>
          {brands.map((b) => (
            <Option
              key={b.slug}
              type="checkbox"
              name={`${uid}-brand`}
              checked={state.brands.includes(b.slug)}
              onChange={() => toggleFacet('brands', b.slug, 'brand')}
              label={b.name}
              count={counts.brands[b.slug] ?? 0}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

interface OptionProps {
  type: 'checkbox' | 'radio';
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
}

function Option({ type, name, checked, onChange, label, count }: OptionProps) {
  const disabled = !checked && count === 0;
  return (
    <label className={cx(styles.option, disabled && styles.optionDisabled)}>
      <input type={type} name={name} checked={checked} onChange={onChange} disabled={disabled} />
      <span className={styles.optionLabel}>{label}</span>
      {typeof count === 'number' ? (
        <span className={styles.optionCount}>
          {count}
          <span className="sr-only"> {count === 1 ? 'mattress' : 'mattresses'}</span>
        </span>
      ) : null}
    </label>
  );
}

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  onClear: () => void;
  canClear: boolean;
  children: ReactNode;
}

/** Phone/tablet filters: a native modal <dialog> holding the same FilterPanel. */
export function FilterDrawer({ open, onClose, resultCount, onClear, canClear, children }: FilterDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.drawer}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className={styles.drawerInner}>
          <div className={styles.drawerHead}>
            <h2 id={titleId} className={styles.drawerTitle}>
              Filters
            </h2>
            <button type="button" className={iconButtonClassName} onClick={onClose} aria-label="Close filters">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className={styles.drawerBody}>{children}</div>
          <div className={styles.drawerFoot}>
            {canClear ? (
              <button type="button" className={buttonClassName({ variant: 'ghost', size: 'md' })} onClick={onClear}>
                Clear all
              </button>
            ) : (
              <span />
            )}
            <button type="button" className={buttonClassName({ variant: 'primary', size: 'md' })} onClick={onClose}>
              Show {resultCount} {resultCount === 1 ? 'mattress' : 'mattresses'}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
