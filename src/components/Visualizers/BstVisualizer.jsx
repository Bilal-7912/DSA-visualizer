import { useMemo } from 'react';
import * as d3 from 'd3';

export const BstVisualizer = ({ nodes, highlights, compareText, bstFloatingNode }) => {
  const layoutData = useMemo(() => {
    const findNode = (id) => nodes.find(n => n.id === id);
    const buildTree = (nodeId) => {
      const n = findNode(nodeId);
      if (!n) return null;
      return {
        val: n.val,
        id: n.id,
        left: buildTree(n.left),
        right: buildTree(n.right)
      };
    };

    const rootNode = nodes.find(n => !nodes.some(p => p.left === n.id || p.right === n.id));
    if (!rootNode) return { nodes: [], links: [] };

    const rootData = buildTree(rootNode.id);
    const d3Root = d3.hierarchy(rootData, d => [d.left, d.right].filter(Boolean));
    const treeLayout = d3.tree().size([600, 220]);
    treeLayout(d3Root);

    return {
      nodes: d3Root.descendants().map(n => ({ ...n, x: n.x + 80, y: n.y + 60 })),
      links: d3Root.links().map(l => ({
        ...l,
        source: { ...l.source, x: l.source.x + 80, y: l.source.y + 60 },
        target: { ...l.target, x: l.target.x + 80, y: l.target.y + 60 }
      }))
    };
  }, [nodes]);

  const bstHeight = useMemo(() => {
    const getDepth = (id) => {
      const n = nodes.find(x => x.id === id);
      if (!n) return 0;
      return 1 + Math.max(getDepth(n.left), getDepth(n.right));
    };
    const root = nodes.find(n => !nodes.some(p => p.left === n.id || p.right === n.id));
    return root ? getDepth(root.id) : 0;
  }, [nodes]);

  const isBalanced = useMemo(() => {
    if (nodes.length === 0) return true;
    const limit = Math.ceil(Math.log2(nodes.length + 1));
    return bstHeight <= limit;
  }, [nodes, bstHeight]);

  return (
    <div className="bst-layout">
      <div className="bst-info-overlay">
        <span>HEIGHT: {bstHeight} | NODES: {nodes.length}</span>
        <span style={{ color: isBalanced ? 'var(--op-insert)' : 'var(--op-traverse)' }}>
          {isBalanced ? 'Balanced OK' : 'Unbalanced'}
        </span>
      </div>

      <svg className="bst-svg" viewBox="0 0 760 340" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker
            id="bst-arrow"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--border-mid)" />
          </marker>
        </defs>

        {layoutData.links.map((link, idx) => {
          const isActive = highlights?.links?.includes(`${link.source.data.val}-${link.target.data.val}`);
          return (
            <line
              key={`link-${idx}`}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke={isActive ? 'var(--op-search)' : 'var(--border-mid)'}
              strokeWidth="2"
              markerEnd="url(#bst-arrow)"
            />
          );
        })}

        {layoutData.nodes.map((node) => {
          const val = node.data.val;
          const isSearching = highlights?.active?.includes(val);
          const isFound = highlights?.green?.includes(val);
          const isTraverse = highlights?.amber?.includes(val);
          const isDeleting = highlights?.coral?.includes(val);

          let fill = 'var(--bg-elevated)';
          let stroke = 'var(--border-dim)';
          let glow = 'none';

          if (isSearching) { fill = 'var(--bg-hover)'; stroke = 'var(--op-search)'; glow = 'drop-shadow(0 0 6px var(--op-search))'; }
          if (isFound) { fill = 'var(--bg-glass)'; stroke = 'var(--op-insert)'; glow = 'drop-shadow(0 0 6px var(--op-insert-glow))'; }
          if (isTraverse) { fill = 'var(--bg-hover)'; stroke = 'var(--op-traverse)'; glow = 'drop-shadow(0 0 6px var(--op-traverse-glow))'; }
          if (isDeleting) { fill = 'var(--bg-hover)'; stroke = 'var(--op-delete)'; glow = 'drop-shadow(0 0 6px var(--op-delete-glow))'; }

          return (
            <g key={node.data.id} className="bst-node-group">
              <g transform={`translate(${node.x}, ${node.y})`}>
                <circle
                  r="18"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="2"
                  style={{ filter: glow }}
                  className="bst-node-circle"
                />
                <text className="bst-node-text" fill="var(--text-code)">{val}</text>
              </g>

              {compareText && compareText.nodeId === node.data.id && (
                <foreignObject x={node.x - 75} y={node.y - 45} width="150" height="35">
                  <div className="bst-compare-tooltip">{compareText.text}</div>
                </foreignObject>
              )}
            </g>
          );
        })}

        {bstFloatingNode && (
          <g key="bst-floating-node" transform={`translate(${bstFloatingNode.toX}, ${bstFloatingNode.toY})`}>
            <circle
              r="18"
              fill="var(--bg-glass)"
              stroke="var(--op-insert)"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 6px var(--op-insert-glow))' }}
            />
            <text className="bst-node-text" fill="var(--text-code)">
              {bstFloatingNode.val}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
export default BstVisualizer;
