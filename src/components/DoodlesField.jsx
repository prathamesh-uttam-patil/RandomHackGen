import React, { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Renders N doodles at random positions/angles around the hero area.
 * Positions are computed once per mount; they re-randomize on reload.
 */
export default function DoodlesField({ count = 18, excludeRect = null }) {
  const items = useMemo(() => {
    const svgs = [Cloud, Star, Heart, Mail, Spark, Palette, Lamp];
    const results = [];
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    function overlapsHero(x, y) {
      if (!excludeRect) return false;
      const pad = 120; // safe padding around hero/title
      const rect = { x: excludeRect.x - pad, y: excludeRect.y - pad, w: excludeRect.w + pad * 2, h: excludeRect.h + pad * 2 };
      return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    for (let i = 0; i < count; i++) {
      const Svg = svgs[i % svgs.length];
      let tries = 0;
      let px = 0, py = 0;
      do {
        px = Math.random() * vw;
        py = Math.random() * vh;
        tries++;
      } while (overlapsHero(px, py) && tries < 50);
      const r = Math.round(Math.random() * 22 - 11);
      const s = 0.8 + Math.random() * 0.5;
      results.push({ id: i, Svg, left: px, top: py, r, s });
    }
    return results;
    // Recompute when hero rect changes size/position
  }, [count, excludeRect?.x, excludeRect?.y, excludeRect?.w, excludeRect?.h]);

  return (
    <>
      {items.map(({ id, Svg, left, top, r, s }) => (
        <motion.div
          key={id}
          className="pointer-events-auto fixed z-10"
          style={{ left, top }}
          initial={{ opacity: 0.9, rotate: r, scale: s }}
          whileHover={{ y: -6, scale: s + 0.08, rotate: r + 8 }}
          transition={{ type: "spring", stiffness: 220, damping: 15 }}
        >
          <Svg />
        </motion.div>
      ))}
    </>
  );
}

/* ===== pastel inline doodles ===== */
const cls = "drop-shadow-sm";

function Cloud() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" className={cls} aria-hidden="true">
      <path d="M7 18h9a4 4 0 0 0 0-8 5 5 0 0 0-9.7 1.5A3.5 3.5 0 0 0 7 18Z" fill="#c7d2fe"/>
    </svg>
  );
}

function Star() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" className={cls} aria-hidden="true">
      <path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.6L12 16l-4.9 2.3.9-5.6-4-3.9 5.6-.8L12 3Z" fill="#fde68a"/>
    </svg>
  );
}

function Heart() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" className={cls} aria-hidden="true">
      <path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 8.8 7c1.5 0 2.6.8 3.2 1.8C12.6 7.8 13.7 7 15.2 7A3.8 3.8 0 0 1 19 10.8C19 15.7 12 20 12 20Z" fill="#fbcfe8"/>
    </svg>
  );
}

function Mail() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" className={cls} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="3" fill="#ddd6fe"/>
      <path d="M4 8l8 6 8-6" stroke="#a78bfa" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function Spark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className={cls} aria-hidden="true">
      <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#bae6fd"/>
    </svg>
  );
}

function Palette() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" className={cls} aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 1 0 0-4h-1.2A2.8 2.8 0 0 1 10 14V13a2 2 0 0 1 2-2h1.2A4 4 0 0 0 17 7.5 5 5 0 0 0 12 3Z" fill="#fdba74"/>
    </svg>
  );
}

function Lamp() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" className={cls} aria-hidden="true">
      <path d="M12 4a6 6 0 0 1 6 6c0 2-1 3.5-2.3 4.6-.6.5-1.1 1.2-1.2 1.9H9.5c-.1-.7-.6-1.4-1.2-1.9C7 13.5 6 12 6 10a6 6 0 0 1 6-6Z" fill="#93c5fd"/>
      <rect x="9" y="16" width="6" height="2" rx="1" fill="#1f2937"/>
      <rect x="10" y="19" width="4" height="2" rx="1" fill="#1f2937"/>
    </svg>
  );
}


