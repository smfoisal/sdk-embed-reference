import './part';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button part={`button button-${variant}`} type={type} className={`fl-btn fl-btn--${variant} ${className}`} {...rest} />;
}

export function Badge({ tone = 'neutral', children }: { tone?: 'positive' | 'neutral'; children: ReactNode }) {
  return (
    <span part="badge" className={`fl-badge fl-badge--${tone}`}>
      {children}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="fl-field">
      <span className="fl-field-label">{label}</span>
      {children}
    </label>
  );
}
