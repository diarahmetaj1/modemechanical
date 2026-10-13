import './ContactForm.css';
import { useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';
import {
  LIMITS, buildPayload, emptyContact, submitContact, validateContact, validateField,
  ContactNotConfiguredError, type ContactErrors, type ContactField, type ContactValues,
} from '../../lib/contact';

interface Props { phone: string; phoneHref: string; email: string }
type Status = 'idle' | 'sending' | 'sent' | 'failed' | 'not-configured';

const FIELDS: { id: ContactField; label: string; type: string; autoComplete: string; inputMode?: 'email' | 'tel' }[] = [
  { id: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { id: 'email', label: 'Email', type: 'email', autoComplete: 'email', inputMode: 'email' },
  { id: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', inputMode: 'tel' },
];

export default function ContactForm({ phone, phoneHref, email }: Props) {
  const [values, setValues] = useState<ContactValues>(emptyContact);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const formRef = useRef<HTMLFormElement>(null);

  const onChange = (f: ContactField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValues((x) => ({ ...x, [f]: v }));
    if (touched[f]) setErrors((x) => ({ ...x, [f]: validateField(f, v) }));
    if (status === 'failed' || status === 'not-configured') setStatus('idle');
  };
  const onBlur = (f: ContactField) => (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTouched((t) => ({ ...t, [f]: true }));
    setErrors((x) => ({ ...x, [f]: validateField(f, e.target.value) }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'sending') return;
    const found = validateContact(values);
    setErrors(found);
    setTouched({ name: true, email: true, phone: true, message: true });
    if (Object.keys(found).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const honeypot = (e.currentTarget.elements.namedItem('company_website') as HTMLInputElement | null)?.value;
    if (honeypot) return; // bots: drop silently, never call the backend

    setStatus('sending');
    try {
      await submitContact(buildPayload(values));
      setStatus('sent');
      setValues(emptyContact);
      setTouched({});
    } catch (err) {
      setStatus(err instanceof ContactNotConfiguredError ? 'not-configured' : 'failed');
    }
  }

  if (status === 'sent') {
    return (
      <div className="cform__result cform__result--ok" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <p className="cform__result-title">Message sent.</p>
        <p>Thanks for reaching out. One of our technicians will contact you shortly. For emergencies, call <a href={phoneHref}>{phone}</a>.</p>
        <button type="button" className="cform__again" onClick={() => setStatus('idle')}>Send another message</button>
      </div>
    );
  }

  const describedBy = (f: ContactField) => (errors[f] ? `cf-${f}-err` : undefined);

  return (
    <form ref={formRef} className="cform" noValidate onSubmit={onSubmit} aria-label="Contact Mode Mechanical">
      <div className="cform__grid">
        {FIELDS.map((f) => (
          <div key={f.id} className={`cform__field cform__field--${f.id}`}>
            <label htmlFor={`cf-${f.id}`}>{f.label} <span className="cform__req" aria-hidden="true">*</span></label>
            <input
              id={`cf-${f.id}`} name={f.id} type={f.type} autoComplete={f.autoComplete} inputMode={f.inputMode}
              required aria-required="true" maxLength={LIMITS[f.id]}
              value={values[f.id]} onChange={onChange(f.id)} onBlur={onBlur(f.id)}
              aria-invalid={Boolean(errors[f.id])} aria-describedby={describedBy(f.id)}
            />
            {errors[f.id] && <p id={`cf-${f.id}-err`} className="cform__error">{errors[f.id]}</p>}
          </div>
        ))}
        <div className="cform__field cform__field--message">
          <label htmlFor="cf-message">Message <span className="cform__req" aria-hidden="true">*</span></label>
          <textarea
            id="cf-message" name="message" rows={6} required aria-required="true" maxLength={LIMITS.message}
            value={values.message} onChange={onChange('message')} onBlur={onBlur('message')}
            aria-invalid={Boolean(errors.message)} aria-describedby={describedBy('message')}
          />
          {errors.message && <p id="cf-message-err" className="cform__error">{errors.message}</p>}
        </div>
      </div>

      <div className="cform__hp" aria-hidden="true">
        <label htmlFor="cf-hp">Leave this field empty</label>
        <input id="cf-hp" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div aria-live="polite">
        {status === 'failed' && (
          <p className="cform__banner cform__banner--error" role="alert">
            Your message wasn’t sent. Try again in a moment, or call <a href={phoneHref}>{phone}</a> or email <a href={`mailto:${email}`}>{email}</a>.
          </p>
        )}
        {status === 'not-configured' && (
          <p className="cform__banner cform__banner--error" role="alert">
            Online messages aren’t connected yet, so this one wasn’t sent. Call <a href={phoneHref}>{phone}</a> or email <a href={`mailto:${email}`}>{email}</a> and we’ll help you right away.
          </p>
        )}
      </div>

      <button className="btn btn--primary cform__submit" type="submit" disabled={status === 'sending'} aria-busy={status === 'sending'}>
        {status === 'sending' ? <><span className="cform__spinner" aria-hidden="true" /> Sending…</> : 'Send Message'}
      </button>
      <p className="cform__note"><span aria-hidden="true">*</span> Required fields</p>
    </form>
  );
}
