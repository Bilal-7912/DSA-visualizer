import { motion, AnimatePresence } from 'framer-motion';

export const StackVisualizer = ({ nodes }) => {
  const isBounce = nodes.length === 1;

  return (
    <div className="stack-layout">
      {/* Vertical Scale Ticks */}
      <div className="stack-ticks">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="stack-tick-label">{i}</div>
        ))}
      </div>

      {/* BASE line */}
      <div className="stack-base" />
      <span className="stack-base-label">BASE</span>

      {/* Node Towers Container */}
      <div className="stack-nodes-container">
        <AnimatePresence initial={false}>
          {nodes.map((node, index) => {
            const isTop = index === nodes.length - 1;
            return (
              <motion.div
                key={node.id}
                layoutId={node.id}
                initial={{ opacity: 0, y: -80, scale: 0.5 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: isTop ? 'var(--border-bright)' : 'var(--border-dim)'
                }}
                exit={{
                  opacity: 0,
                  y: -100,
                  scale: 0.4,
                  transition: { duration: 0.26, ease: [0.55, 0, 1, 0.45] }
                }}
                transition={
                  isBounce && isTop
                    ? { type: "spring", stiffness: 350, damping: 10 } // more bouncy at base
                    : { type: "spring", stiffness: 280, damping: 18 }
                }
                className={`stack-node-block ${isTop ? 'top-node' : ''}`}
              >
                <span>{node.val}</span>
                {isTop && (
                  <motion.div
                    layoutId="stack-top-ptr"
                    className="stack-arrow-ptr"
                  >
                    TOP ➔
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default StackVisualizer;
