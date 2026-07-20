import { cn } from "../../../lib/utils";

const STEPS = [
  { n: 1, label: "Select Company", hint: "Choose one company" },
  { n: 2, label: "Assign Products", hint: "Link products to the company" },
  { n: 3, label: "Assign Templates", hint: "One template per product" },
] as const;

export function StepRail({
  current,
  furthestUnlocked,
  onJump,
}: {
  current: number;
  /** Highest step the user is allowed to jump back/forward to without re-validating. */
  furthestUnlocked: number;
  onJump: (step: number) => void;
}) {
  return (
    <div className="flex items-stretch gap-0">
      {STEPS.map((s, i) => {
        const state =
          s.n < current ? "done" : s.n === current ? "active" : "todo";
        const clickable = s.n <= furthestUnlocked;
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump(s.n)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-left",
                clickable && "hover:bg-neutral-25 cursor-pointer",
                !clickable && "cursor-not-allowed opacity-60",
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-full grid place-items-center font-mono font-bold text-[12px] flex-shrink-0 transition",
                  state === "done" && "bg-success-500 text-white",
                  state === "active" &&
                    "bg-action-orange text-white shadow-doe-sm",
                  state === "todo" && "bg-neutral-100 text-neutral-500",
                )}
              >
                {state === "done" ? "✓" : s.n}
              </span>
              <span className="hidden sm:block">
                <span
                  className={cn(
                    "block text-[12.5px] font-semibold leading-tight",
                    state === "todo" ? "text-neutral-500" : "text-ink-950",
                  )}
                >
                  {s.label}
                </span>
                <span className="block text-[10.5px] text-neutral-500 leading-tight">
                  {s.hint}
                </span>
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-[2px] flex-1 mx-1 rounded-full",
                  s.n < current ? "bg-success-500" : "bg-neutral-100",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
