import { motion } from 'framer-motion'

const hoverAnim = {
  whileHover: { scale: 1.08, rotate: 8, y: -6 },
  transition: { type: 'spring', stiffness: 300, damping: 15 },
}

export default function Doodles() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      {/* Cloud */}
      <motion.svg
        {...hoverAnim}
        className="pointer-events-auto absolute top-10 left-6 drop-shadow-sm"
        width="72" height="44" viewBox="0 0 72 44" fill="none"
      >
        <path d="M18 35h36a10 10 0 0 0 0-20h-1.2A16 16 0 0 0 19 12a12 12 0 0 0-1 23Z" fill="#bfdbfe"/>
        <path d="M22 34h28" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" opacity=".7"/>
      </motion.svg>

      {/* Star */}
      <motion.svg
        {...hoverAnim}
        className="pointer-events-auto absolute top-20 right-10 drop-shadow-sm"
        width="40" height="40" viewBox="0 0 40 40" fill="none"
      >
        <path d="M20 3l4.4 9.2 10.1 1.2-7.3 6.8 2 9.8L20 26.6 10.8 30l2-9.8L5.5 13.4l10.1-1.2L20 3Z" fill="#fde68a"/>
        <circle cx="20" cy="20" r="2" fill="#f59e0b"/>
      </motion.svg>

      {/* Heart */}
      <motion.svg
        {...hoverAnim}
        className="pointer-events-auto absolute bottom-24 left-10 drop-shadow-sm"
        width="44" height="40" viewBox="0 0 44 40" fill="none"
      >
        <path d="M22 36s-12-7.8-16-14.2C1.8 14.7 6 6 13.6 6 18 6 20.6 8.6 22 10.6 23.4 8.6 26 6 30.4 6 38 6 42.2 14.7 38 21.8 34 28.2 22 36 22 36Z" fill="#fbcfe8"/>
        <path d="M22 34s-10.4-6.8-13.8-12.3" stroke="#f472b6" strokeWidth="1.5" opacity=".7"/>
      </motion.svg>

      {/* Mail */}
      <motion.svg
        {...hoverAnim}
        className="pointer-events-auto absolute bottom-12 right-8 drop-shadow-sm"
        width="52" height="40" viewBox="0 0 52 40" fill="none"
      >
        <rect x="6" y="8" width="40" height="24" rx="6" fill="#e9d5ff"/>
        <path d="M10 12l16 11 16-11" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
      </motion.svg>

      {/* Palette */}
      <motion.svg
        {...hoverAnim}
        className="pointer-events-auto absolute top-40 left-1/2 -translate-x-1/2 drop-shadow-sm"
        width="56" height="40" viewBox="0 0 56 40" fill="none"
      >
        <path d="M28 6c12 0 20 6.8 20 14.5S41 34 32.5 34c-1.8 0-3-1.2-3-2.7 0-1.4 1.1-2.6 2.4-2.6 2.7 0 4.1-1.5 4.1-3.4C36 20.2 31.4 18 26 18s-10 3.4-10 8.5S21 40 28 40c-15 0-24-8.7-24-19S13 6 28 6Z" fill="#bfdbfe"/>
        <circle cx="34" cy="14" r="3" fill="#fdba74"/>
        <circle cx="26" cy="14" r="3" fill="#fca5a5"/>
        <circle cx="20" cy="20" r="3" fill="#86efac"/>
      </motion.svg>

      {/* Lamp / Idea */}
      <motion.svg
        {...hoverAnim}
        className="pointer-events-auto absolute top-6 left-1/2 translate-x-24 drop-shadow-sm"
        width="40" height="56" viewBox="0 0 40 56" fill="none"
      >
        <circle cx="20" cy="16" r="12" fill="#fde68a"/>
        <rect x="14" y="26" width="12" height="10" rx="3" fill="#f59e0b"/>
        <rect x="12" y="38" width="16" height="4" rx="2" fill="#94a3b8"/>
      </motion.svg>

      {/* Sparkles */}
      <motion.svg {...hoverAnim} className="pointer-events-auto absolute bottom-40 right-1/2 translate-x-24 drop-shadow-sm" width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#a7f3d0"/>
      </motion.svg>
      <motion.svg {...hoverAnim} className="pointer-events-auto absolute top-1/2 left-8 drop-shadow-sm" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 1l1.4 4.2L16 6l-4.6 1.1L10 11 8.6 7.1 4 6l4.6-0.8L10 1Z" fill="#e0e7ff"/>
      </motion.svg>
    </div>
  )
}


