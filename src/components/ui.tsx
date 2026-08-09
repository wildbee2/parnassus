import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function cn(...classes: Array<string | undefined | false | null>): string {
  return classes.filter(Boolean).join(' ');
}

type Variant = 'default' | 'secondary' | 'ghost' | 'danger';

export function Button({
  className,
  variant = 'default',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';
  const variants: Record<Variant, string> = {
    default: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-500'
  };
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white/90 shadow-soft backdrop-blur', className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('border-b border-slate-200 px-4 py-3', className)}>{children}</div>;
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn('text-sm font-medium text-slate-700', className)}>{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20', props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20', props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20', props.className)} />;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  };
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}
