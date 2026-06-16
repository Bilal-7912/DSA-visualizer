import { motion, AnimatePresence } from 'framer-motion';

export const QueueVisualizer = ({ nodes }) => {
  return (
    <div className="queue-layout">
      <div className="queue-conveyor">
        <AnimatePresence mode="popLayout" initial={false}>
          {nodes.map((node, index) => {
            const isFront = index === 0;
            const isRear = index === nodes.length - 1;
            return (
              <motion.div
                key={node.id}
                layout
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: -80,
                  transition: { duration: 0.20, ease: "power2.in" }
                }}
                transition={{
                  x: { type: "spring", stiffness: 150, damping: 10 }, // momentum overshoot
                  layout: { type: "spring", stiffness: 200, damping: 20 } // conveyor slide
                }}
                className="queue-node-block"
              >
                <span className="queue-node-val">{node.val}</span>
                <span className="queue-node-idx">idx: {index}</span>

                {/* FRONT label */}
                {isFront && (
                  <motion.span layoutId="queue-front-ptr" className="queue-ptr-label front">
                    ▲ FRONT
                  </motion.span>
                )}
                {/* REAR label */}
                {isRear && (
                  <motion.span layoutId="queue-rear-ptr" className="queue-ptr-label rear">
                    ▼ REAR
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default QueueVisualizer;
