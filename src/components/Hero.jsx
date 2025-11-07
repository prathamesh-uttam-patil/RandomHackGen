import React from "react";
import { motion } from "framer-motion";

const Badge = ({ children }) => (
  <span className="rounded-full bg-zinc-900/5 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-white/10 dark:text-zinc-100">
    {children}
  </span>
);

export default function Hero({ onGenerate, centered = false, categories = [], activeCategory = 'All', onChangeCategory = () => {} }) {
  return (
    <section className={"relative isolate overflow-visible " + (centered ? "min-h-screen grid place-items-center" : "pt-20 pb-10") }>
      {/* page-wide gradient */}
      <div className="bg-page-gradient" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center">
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <Badge>✨ Simple</Badge>
          <Badge>⚡ Fast</Badge>
          <Badge>🧠 Clever</Badge>
        </div>

        <h1 className="text-balance text-5xl font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
          Random Hack Generator <span className="align-middle">💡⚡✨</span>
        </h1>

        <p className="mt-3 max-w-2xl text-pretty text-lg leading-7 text-zinc-600 dark:text-zinc-300">
          Get playful, practical hack ideas in a click. Fresh. Fun. Shareable.
        </p>

        {/* Category pills */}
        {categories && categories.length > 0 && (
          <div className="mt-6 w-full max-w-4xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((c) => {
                const selected = c.key === activeCategory;
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChangeCategory(c.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onChangeCategory(c.key);
                      }
                    }}
                    className={(selected
                      ? "bg-indigo-600 text-white border-transparent "
                      : "bg-transparent text-zinc-800 dark:text-zinc-100 border-zinc-300/70 dark:border-white/15 ") +
                      " inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 w-36"}
                  >
                    <span aria-hidden>{c.emoji}</span>
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={onGenerate}
            className="rounded-full bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            Generate a hack
          </button>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Tip: Press <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">Space</kbd> to generate
          </p>
        </div>
      </div>
    </section>
  );
}


