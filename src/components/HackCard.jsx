import React from "react";
import { motion } from "framer-motion";

export default function HackCard({ hack, onShare }) {
  if (!hack) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mx-auto mt-10 w-full max-w-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="card-title text-xl">{hack.title}</h3>
        <button
          onClick={onShare}
          className="rounded-full bg-violet-500/15 px-3 py-1 text-sm text-violet-700 hover:bg-violet-500/25 dark:text-violet-200"
        >
          Share
        </button>
      </div>

      <p className="card-text mt-2">{hack.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-zinc-50 p-3 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
          <dt className="font-medium">Category</dt>
          <dd>{hack.category}</dd>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
          <dt className="font-medium">Difficulty</dt>
          <dd>{hack.difficulty}</dd>
        </div>
        <div className="col-span-2 rounded-lg bg-zinc-50 p-3 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
          <dt className="font-medium">Usefulness</dt>
          <dd className="mt-1 h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded bg-emerald-500"
              style={{ width: `${Math.min(100, Math.max(0, hack.usefulness))}%` }}
            />
          </dd>
        </div>
        {hack.bonus && (
          <div className="col-span-2 rounded-lg bg-zinc-50 p-3 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
            <dt className="font-medium">Bonus</dt>
            <dd>{hack.bonus}</dd>
          </div>
        )}
      </dl>
    </motion.div>
  );
}

