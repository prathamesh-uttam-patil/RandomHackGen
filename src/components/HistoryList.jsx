import { motion, AnimatePresence } from 'framer-motion'

export default function HistoryList({ history, onSelect }) {
  if (!history || history.length === 0) return null

  return (
    <motion.div
      className="mt-8 glass p-4 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Recent Hacks</h3>
      <div className="space-y-2">
        <AnimatePresence>
          {history.slice(0, 5).map((hack, index) => (
            <motion.div
              key={`${hack.title}-${index}`}
              onClick={() => onSelect(hack)}
              className="glass-light p-3 rounded-lg cursor-pointer hover:bg-white/20 dark:hover:bg-white/20 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {hack.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-white/70 truncate">
                    {hack.category} • {hack.difficulty}
                  </p>
                </div>
                <span className="ml-2 text-xs px-2 py-1 rounded-full bg-purple-500/30 text-gray-800 dark:text-white">
                  {hack.usefulness}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

