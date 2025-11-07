import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Hero from "./components/Hero";
import HackCard from "./components/HackCard";
import DarkModeToggle from "./components/DarkModeToggle";
import "./styles/global.css";
import { generateHack } from "./lib/generateHack";

const CATEGORIES = [
  { key: "All", label: "All", emoji: "➕" },
  { key: "Study", label: "Study", emoji: "🧠" },
  { key: "Tech", label: "Tech", emoji: "💻" },
  { key: "Smartphone", label: "Smartphone", emoji: "📱" },
  { key: "Money", label: "Money", emoji: "🤑" },
  { key: "Fitness", label: "Fitness", emoji: "🏋️" },
  { key: "Life", label: "Life", emoji: "🧼" },
  { key: "Social", label: "Social", emoji: "🎭" },
  { key: "Aesthetic", label: "Aesthetic", emoji: "✨" },
  { key: "Motivation", label: "Motivation", emoji: "🔥" },
  { key: "Funny", label: "Funny", emoji: "😂" },
];

export default function App() {
  const [hack, setHack] = useState(null);
  const [activeCategory, setActiveCategory] = useState(() => {
    return localStorage.getItem('activeCategory') || 'All'
  });
  const [toast, setToast] = useState("");
  const lastClickRef = useRef(0);
  const heroRef = useRef(null);

  const onGenerate = useCallback(async () => {
    const now = Date.now();
    if (now - lastClickRef.current < 500) return; // debounce 500ms
    lastClickRef.current = now;

    const prompt = `Generate one short, actionable hack for category: ${activeCategory === 'All' ? 'any' : activeCategory}.`;
    try {
      const data = await generateHack(prompt);
      // Validate category when not All
      if (activeCategory !== 'All') {
        const normalized = (data.category || '').toLowerCase();
        if (!normalized.includes(activeCategory.toLowerCase())) {
          setToast("No hacks in this category yet—try another or tap Generate again.");
          setTimeout(() => setToast(""), 2000);
          return;
        }
      }
      setHack(data);
    } catch (e) {
      setToast("Failed to generate. Please try again.");
      setTimeout(() => setToast(""), 2000);
    }
  }, [activeCategory]);

  useEffect(() => {
    function handler(e) {
      if (e.code === "Space" && !/input|textarea/i.test(e.target.tagName)) {
        e.preventDefault();
        onGenerate();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onGenerate]);

  // Persist category
  useEffect(() => {
    localStorage.setItem('activeCategory', activeCategory);
  }, [activeCategory]);


  async function handleShare() {
    if (!hack) return;
    const text = `${hack.title}\n\n${hack.description}\n#RandomHack`;
    if (navigator.share) {
      try { await navigator.share({ title: hack.title, text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    }
  }

  return (
    <div className="min-h-screen">
      <DarkModeToggle />
      {/* Doodles removed */}
      {/* ONE hero with the ONLY generate button */}
      <motion.div
        ref={heroRef}
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: hack ? -24 : 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <Hero
          onGenerate={onGenerate}
          centered={!hack}
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onChangeCategory={setActiveCategory}
        />
      </motion.div>
      {/* Hack card (readable on both themes) */}
      <div aria-live="polite">
        <HackCard hack={hack} onShare={handleShare} />
      </div>
      {/* Hide any old/duplicate generate sections if still present */}
      <div className="hidden-once" />
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 text-white px-4 py-2 text-sm shadow dark:bg-white dark:text-zinc-900">
          {toast}
        </div>
      )}
    </div>
  );
}

