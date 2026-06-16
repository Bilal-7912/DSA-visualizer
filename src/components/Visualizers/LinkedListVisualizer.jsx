import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

export const LinkedListVisualizer = ({ nodes, highlights, listPointers = {} }) => {
  const pathRefs = useRef({});
  const dotRefs = useRef({});

  // GSAP path animation scheduler
  useEffect(() => {
    if (!highlights || highlights.activeIdx === undefined) return;
    
    const activeIdx = highlights.activeIdx;
    let tween = null;
    if (activeIdx > 0) {
      const prevIdx = activeIdx - 1;
      const path = pathRefs.current[prevIdx];
      const dot = dotRefs.current[prevIdx];
      if (path && dot) {
        const startPoint = path.getPointAtLength(0);
        gsap.set(dot, { opacity: 1 });
        dot.setAttribute('cx', startPoint.x);
        dot.setAttribute('cy', startPoint.y);
        tween = gsap.to(dot, {
          opacity: 0,
          duration: 0.22,
          ease: "power2.out"
        });
      }
    }

    return () => {
      if (tween) tween.kill();
    };
  }, [highlights]);

  return (
    <div className="list-layout">
      <AnimatePresence mode="popLayout" initial={false}>
        {nodes.map((node, index) => {
          const highlightState = highlights && highlights.nodes && highlights.nodes[index];
          const isHead = index === 0;

          // Curve arrows parameters
          const startX = 0;
          const startY = 22;
          const endX = 60;
          const endY = 22;
          const pathD = `M ${startX} ${startY} C ${startX + 15} ${startY - 10}, ${endX - 15} ${startY - 10}, ${endX} ${endY}`;

          return (
            <div key={node.id} className="list-node-container">
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                className="list-card"
              >
                {/* Node Box */}
                <div 
                  className="list-box"
                  style={{
                    borderColor: highlightState === 'active' ? 'var(--op-search)' :
                                 highlightState === 'green' ? 'var(--op-insert)' :
                                 highlightState === 'purple' ? 'var(--op-traverse)' :
                                 highlightState === 'coral' ? 'var(--op-delete)' : 'var(--border-dim)',
                    boxShadow: highlightState ? `0 0 14px var(--op-${highlightState}-glow)` : 'none'
                  }}
                >
                  <div className="list-box-val">{node.val}</div>
                  <div className="list-box-next">
                    {index === nodes.length - 1 ? '∅' : `0x${((index + 1) * 16 + 4096).toString(16).toUpperCase()}`}
                  </div>
                </div>

                {/* Node Address */}
                <div className="list-addr">
                  0x{(index * 16 + 4096).toString(16).toUpperCase()}
                </div>

                {/* Head ptr label */}
                {isHead && (
                  <span className="list-ptr-tag">HEAD</span>
                )}

                {/* Temp ptr label */}
                {listPointers[index] && (
                  <span className="list-ptr-tag temp">{listPointers[index]}</span>
                )}
              </motion.div>

              {/* Connected Arrow */}
              {index < nodes.length - 1 && (
                <motion.div layout className="list-arrow-box">
                  <svg className="list-arrow-svg">
                    <defs>
                      <marker
                        id={`arrow-${index}`}
                        viewBox="0 0 10 10"
                        refX="7"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 2 L 10 5 L 0 8 z" fill={highlightState === 'purple' ? 'var(--op-traverse)' : 'var(--border-mid)'} />
                      </marker>
                    </defs>
                    <path
                      ref={el => pathRefs.current[index] = el}
                      d={pathD}
                      fill="none"
                      stroke={highlightState === 'purple' ? 'var(--op-traverse)' : 'var(--border-mid)'}
                      strokeWidth="2"
                      markerEnd={`url(#arrow-${index})`}
                    />
                    <circle
                      ref={el => dotRefs.current[index] = el}
                      cx="0" cy="22" r="3.5"
                      fill="var(--op-traverse)"
                      opacity="0"
                    />
                  </svg>
                </motion.div>
              )}
            </div>
          );
        })}

        {/* Ending Null Node */}
        <div className="list-node-container" style={{ marginLeft: nodes.length > 0 ? '12px' : 0 }}>
          <div className="list-card" title="null — end of list">
            <div className="list-box null-node">
              <div className="list-box-val" style={{ border: 'none', color: 'var(--op-delete)' }}>∅</div>
            </div>
            <div className="list-addr">NULL</div>
          </div>
        </div>
      </AnimatePresence>
    </div>
  );
};
export default LinkedListVisualizer;
