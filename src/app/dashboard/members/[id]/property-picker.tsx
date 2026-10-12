'use client';

import {useId, useRef, useState} from 'react';

type Property = {id: string; name: string};

export function PropertyPicker({properties, value, onChange, disabled}: {
  properties: Property[]; value: string; onChange: (id: string) => void; disabled: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const selected = properties.find(property => property.id === value);
  const results = properties.filter(property => property.name.toLowerCase().includes(query.trim().toLowerCase()));
  const expanded = open && !disabled;

  function choose(property: Property) {
    onChange(property.id);
    setOpen(false);
    setQuery('');
  }

  function move(index: number) {
    const next = Math.max(0, Math.min(index, results.length - 1));
    setActive(next);
    list.current?.children[next]?.scrollIntoView({block: 'nearest'});
  }

  return <div className="property-picker" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <label htmlFor={id}>Property</label>
    <div className={`property-picker-control${expanded ? ' is-open' : ''}`}>
      <input id={id} role="combobox" autoComplete="off" disabled={disabled}
        aria-expanded={expanded} aria-controls={`${id}-options`} aria-autocomplete="list"
        aria-activedescendant={expanded && results[active] ? `${id}-option-${active}` : undefined}
        placeholder={expanded ? 'Search properties…' : ''}
        value={expanded ? query : selected?.name || ''}
        onFocus={() => {setQuery(''); setActive(0); setOpen(true);}}
        onClick={() => {if (!open) {setQuery(''); setActive(0); setOpen(true);}}}
        onChange={event => {setQuery(event.target.value); setActive(0); setOpen(true);}}
        onKeyDown={event => {
          if (event.key === 'Escape' && expanded) {event.preventDefault(); event.stopPropagation(); setOpen(false);}
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!expanded) {setQuery(''); setActive(0); setOpen(true);}
            else move(active + (event.key === 'ArrowDown' ? 1 : -1));
          }
          if (event.key === 'Enter' && expanded) {
            event.preventDefault();
            if (results[active]) choose(results[active]);
          }
        }}/>
      <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 8 5 5 5-5"/></svg>
      {expanded && <div className="property-picker-menu">
        <ul id={`${id}-options`} role="listbox" aria-label="Properties" ref={list}>
          {results.map((property, index) => <li key={property.id} id={`${id}-option-${index}`}
            role="option" aria-selected={property.id === value} className={index === active ? 'is-active' : ''}
            onMouseDown={event => event.preventDefault()} onClick={() => choose(property)}>
            <span>{property.name}</span>{property.id === value && <span aria-hidden="true">✓</span>}
          </li>)}
        </ul>
        {!results.length && <p className="property-picker-empty" role="status">No properties found.</p>}
      </div>}
    </div>
  </div>;
}
