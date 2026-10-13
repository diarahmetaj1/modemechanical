import { useId, useState } from 'react';
import './FaqAccordion.css';

interface Props { items: { q: string; a: string }[]; defaultOpen?: number }

export default function FaqAccordion({ items, defaultOpen = 0 }: Props) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const base = useId();
  return (
    <div className="faq">
      {items.map((item, i) => {
        const isOpen = open === i;
        const btnId = `${base}-q${i}`;
        const panelId = `${base}-a${i}`;
        return (
          <div key={item.q} className="faq__item" data-open={isOpen}>
            <h3 className="faq__q">
              <button id={btnId} type="button" aria-expanded={isOpen} aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}>
                <span>{item.q}</span><span className="faq__sign" aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} className="faq__a">
              <div className="faq__a-inner"><p>{item.a}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
