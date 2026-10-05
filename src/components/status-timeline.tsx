import type { OrderStatus } from '@prisma/client';

export type TimelineStep = {
  status: OrderStatus;
  label: string;
  at: Date | null;
  done: boolean;
  current: boolean;
};

export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative ml-1 border-l border-neutral-200 pl-5">
      {steps.map((step) => (
        <li key={step.status} className="pb-5 last:pb-0">
          <span
            className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${
              step.done ? 'bg-neutral-900' : 'bg-neutral-300'
            }`}
            aria-hidden
          />
          <p className={`text-sm font-medium ${step.done ? 'text-neutral-950' : 'text-neutral-400'}`}>
            {step.label}
            {step.current && step.status !== 'DELIVERED' && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-700">
                now
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-500">
            {step.at ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(step.at) : '—'}
          </p>
        </li>
      ))}
    </ol>
  );
}
