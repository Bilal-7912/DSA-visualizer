import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useStore } from '../../store';

export const GraphVisualizer = ({ graph, highlights, simulationRef, selectedNode, ghostTarget }) => {
  const svgRef = useRef(null);
  const draggedNodeRef = useRef(null);
  const [, setTickCount] = useState(0);

  const simNodes = useMemo(() => graph.nodes.map(node => ({ ...node })), [graph.nodes]);

  const simEdges = useMemo(() => graph.edges.map(edge => ({
    ...edge,
    source: edge.source.id || edge.source,
    target: edge.target.id || edge.target
  })), [graph.edges]);

  // Instatiate and run D3 force simulations
  useEffect(() => {
    if (!simNodes || simNodes.length === 0) return;
    
    simulationRef.current = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges).id(d => d.id).distance(110))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(400, 200))
      .force('collision', d3.forceCollide().radius(25))
      .alphaDecay(0.06)
      .on('tick', () => {
        setTickCount(t => t + 1);
      });

    simulationRef.current.tick(150); // settle positions

    return () => {
      if (simulationRef.current) simulationRef.current.stop();
    };
  }, [simNodes, simEdges, simulationRef]);

  const sonarPos = useMemo(() => {
    if (!selectedNode) return null;
    const matched = simNodes.find(n => n.id === selectedNode);
    return matched ? { x: matched.x, y: matched.y } : null;
  }, [selectedNode, simNodes]);

  // Drag coordinates calculator
  const startDrag = (e, node) => {
    if (selectedNode) return;
    e.preventDefault();
    draggedNodeRef.current = node;
    node.fx = node.x;
    node.fy = node.y;
    if (simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
  };

  const handleDrag = (e) => {
    if (!svgRef.current) return;
    const draggedNode = draggedNodeRef.current;
    if (draggedNode) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      draggedNode.fx = Math.max(20, Math.min(780, x));
      draggedNode.fy = Math.max(20, Math.min(420, y));
    } else if (selectedNode) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      window.dispatchEvent(new CustomEvent('graph-ghost-move', { detail: { x, y } }));
    }
  };

  const endDrag = () => {
    const draggedNode = draggedNodeRef.current;
    if (draggedNode) {
      const nextX = draggedNode.x;
      const nextY = draggedNode.y;
      draggedNode.fx = null;
      draggedNode.fy = null;
      draggedNodeRef.current = null;
      if (simulationRef.current) simulationRef.current.alphaTarget(0);
      useStore.setState({
        graph: {
          ...graph,
          nodes: graph.nodes.map(node => (
            node.id === draggedNode.id ? { ...node, x: nextX, y: nextY } : node
          ))
        }
      });
    }
  };

  // Selected coordinate calculations for edge builder lines
  const selectedCoords = useMemo(() => {
    if (!selectedNode) return null;
    const node = simNodes.find(n => n.id === selectedNode);
    return node ? { x: node.x, y: node.y } : null;
  }, [selectedNode, simNodes]);

  // Node weight manual prompts
  const handleWeightClick = (e, edge) => {
    e.stopPropagation();
    const newWeight = prompt("Enter new edge weight (0 - 99):", edge.weight || 1);
    if (newWeight !== null) {
      const parsed = parseInt(newWeight);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 99) {
        useStore.setState({
          graph: {
            ...graph,
            edges: graph.edges.map(currentEdge => {
              const source = currentEdge.source.id || currentEdge.source;
              const target = currentEdge.target.id || currentEdge.target;
              return source === edge.source && target === edge.target
                ? { ...currentEdge, weight: parsed }
                : currentEdge;
            })
          }
        });
      }
    }
  };

  return (
    <div 
      className="graph-layout" 
      onMouseMove={handleDrag} 
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      {/* Live Stack/Queue structure overlay on traversals */}
      {highlights && highlights.queueState && (
        <div className="graph-structure-overlay">
          <span>ACTIVE COMPONENT ({highlights.queueState.type})</span>
          <div className="graph-structure-list">
            {highlights.queueState.list.map((nodeId, idx) => (
              <span key={idx} className="graph-structure-badge" style={{ borderColor: `var(--node-${nodeId})` }}>
                {nodeId}
              </span>
            ))}
          </div>
        </div>
      )}

      <svg className="graph-svg" ref={svgRef}>
        {/* Draw Edges */}
        {simEdges.map((edge, idx) => {
          const sourceId = edge.source.id || edge.source;
          const targetId = edge.target.id || edge.target;
          const u = simNodes.find(n => n.id === sourceId);
          const v = simNodes.find(n => n.id === targetId);
          if (!u || !v) return null;

          const isVisitedLink = highlights && highlights.links && 
            highlights.links.some(l => (l.source === u.id && l.target === v.id) || (l.source === v.id && l.target === u.id));
          
          const isUnvisitedNodeDim = highlights && (!highlights.nodes[u.id] && !highlights.nodes[v.id]);

          return (
            <g key={`edge-${idx}`}>
              <line
                x1={u.x}
                y1={u.y}
                x2={v.x}
                y2={v.y}
                stroke={isVisitedLink ? 'var(--op-search)' : 'var(--border-mid)'}
                strokeWidth="2"
                opacity={isUnvisitedNodeDim ? 0.35 : 1}
              />

              {/* Edge Weight label rendering */}
              {(useStore.getState().graphWeighted || edge.weight !== undefined) && (
                <text
                  x={(u.x + v.x) / 2}
                  y={(u.y + v.y) / 2 - 6}
                  className="graph-edge-weight"
                  onClick={(e) => handleWeightClick(e, edge)}
                >
                  {edge.weight !== undefined ? edge.weight : 1}
                </text>
              )}
            </g>
          );
        })}

        {/* Ghost Edge tracker lines */}
        {selectedCoords && ghostTarget && (
          <line
            x1={selectedCoords.x}
            y1={selectedCoords.y}
            x2={ghostTarget.x}
            y2={ghostTarget.y}
            stroke="var(--border-bright)"
            strokeDasharray="4,4"
            strokeWidth="2"
          />
        )}

        {/* Selected node Sonar Ring */}
        {sonarPos && (
          <circle
            cx={sonarPos.x}
            cy={sonarPos.y}
            r="26"
            fill="none"
            stroke="var(--blue-200)"
            strokeWidth="2"
            style={{
              transformOrigin: `${sonarPos.x}px ${sonarPos.y}px`,
              animation: 'sonarPing 1.5s infinite linear'
            }}
          />
        )}

        {/* Draw Nodes */}
        {simNodes.map((node) => {
          const isSearching = highlights && highlights.nodes && highlights.nodes[node.id] === 'active';
          const isVisited = highlights && highlights.nodes && highlights.nodes[node.id] === 'green';
          const isNeighbour = highlights && highlights.nodes && highlights.nodes[node.id] === 'amber';
          const isUnvisitedDim = highlights && !highlights.nodes[node.id];

          let fill = 'var(--bg-elevated)';
          let stroke = `var(--node-${node.id})`;
          let glow = 'none';

          if (isSearching) { fill = 'var(--bg-hover)'; stroke = 'var(--op-search)'; glow = 'drop-shadow(0 0 6px var(--op-search))'; }
          if (isVisited) { fill = 'var(--bg-glass)'; stroke = 'var(--op-insert)'; glow = 'drop-shadow(0 0 6px var(--op-insert-glow))'; }
          if (isNeighbour) { fill = 'var(--bg-hover)'; stroke = 'var(--op-traverse)'; glow = 'drop-shadow(0 0 6px var(--op-traverse-glow))'; }

          return (
            <g
              key={node.id}
              className="graph-node-group"
              onMouseDown={(e) => startDrag(e, node)}
              onClick={(e) => {
                e.stopPropagation();
                if (useStore.getState().isPlaying) return;
                window.dispatchEvent(new CustomEvent('graph-node-clicked', { detail: node }));
              }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r="18"
                fill={fill}
                stroke={stroke}
                strokeWidth="2.5"
                opacity={isUnvisitedDim ? 0.35 : 1}
                style={{ filter: glow }}
              />
              <text
                x={node.x}
                y={node.y}
                className="graph-node-text"
                opacity={isUnvisitedDim ? 0.35 : 1}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
export default GraphVisualizer;
