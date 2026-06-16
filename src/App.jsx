import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { ThreeBackground } from './components/ThreeBackground';
import { DebuggerLog } from './components/DebuggerLog';
import { StackVisualizer } from './components/Visualizers/StackVisualizer';
import { QueueVisualizer } from './components/Visualizers/QueueVisualizer';
import { LinkedListVisualizer } from './components/Visualizers/LinkedListVisualizer';
import { BstVisualizer } from './components/Visualizers/BstVisualizer';
import { GraphVisualizer } from './components/Visualizers/GraphVisualizer';
import gsap from 'gsap';
import * as d3 from 'd3';

export const App = () => {
  const state = useStore();
  const simulationRef = useRef(null);

  // Controller states
  const [inputVal, setInputVal] = useState('');
  const [listIndex, setListIndex] = useState('');
  const [graphNode, setGraphNode] = useState('');
  const [graphWeight, setGraphWeight] = useState('');

  // Customizable Linked List Inputs (like reference site)
  const [listVal0, setListVal0] = useState('10');
  const [listVal1, setListVal1] = useState('20');
  const [listVal2, setListVal2] = useState('30');
  const [listVal3, setListVal3] = useState('40');

  // Traversal helper highlights
  const [listPointers, setListPointers] = useState({});
  const [bstHighlights, setBstHighlights] = useState({});
  const [bstCompareText, setBstCompareText] = useState(null);
  const [graphHighlights, setGraphHighlights] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [ghostTarget, setGhostTarget] = useState(null);
  const [bstFloatingNode, setBstFloatingNode] = useState(null);

  // Dynamic particle burst coordinate resolver
  const triggerCanvasBurst = useCallback((colorClass) => {
    const container = document.querySelector('.canvas-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      const relativeX = rect.width / 2;
      const relativeY = rect.height / 2;

      const particles = [];
      const particleCount = 8;
      const angleStep = (Math.PI * 2) / particleCount;

      for (let i = 0; i < particleCount; i++) {
        const dot = document.createElement('div');
        dot.className = `burst-particle`;
        dot.style.left = `${relativeX}px`;
        dot.style.top = `${relativeY}px`;
        dot.style.backgroundColor = colorClass === 'insert' ? 'var(--op-insert)' : 'var(--op-delete)';
        container.appendChild(dot);
        particles.push(dot);

        const angle = angleStep * i;
        const distance = colorClass === 'insert' ? 20 : 14;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;

        gsap.to(dot, {
          x: targetX,
          y: targetY,
          opacity: 0,
          duration: colorClass === 'insert' ? 0.28 : 0.20,
          ease: "power2.out",
          onComplete: () => dot.remove()
        });
      }

      window.dispatchEvent(new CustomEvent('three-particle-burst'));
    }
  }, []);

  // Bind custom events for graph interaction & BST successor teleport
  useEffect(() => {
    const handleNodeClick = (e) => {
      const clickedNode = e.detail;
      const store = useStore.getState();
      if (store.currentTab !== 'graph') return;

      if (!selectedNode) {
        setSelectedNode(clickedNode.id);
        store.addLog('READY', `Source node (${clickedNode.id}) selected. Click another node to create edge.`);
      } else {
        if (selectedNode === clickedNode.id) {
          setSelectedNode(null);
          setGhostTarget(null);
          store.addLog('READY', 'Edge creation cancelled.');
          return;
        }
        const source = selectedNode;
        const target = clickedNode.id;
        const weight = parseInt(graphWeight) || 1;

        const edgeExists = store.graph.edges.some(edge => {
          const s = edge.source.id || edge.source;
          const t = edge.target.id || edge.target;
          return (s === source && t === target) || (s === target && t === source);
        });

        if (edgeExists) {
          store.addLog('ERROR', `Edge between (${source}) and (${target}) already exists.`);
          setSelectedNode(null);
          setGhostTarget(null);
          return;
        }

        store.saveHistory();
        const updatedEdges = [...store.graph.edges, { source, target, weight }];
        useStore.setState({
          graph: {
            ...store.graph,
            edges: updatedEdges
          }
        });

        store.addLog('INSERT', `Edge (${source}) -> (${target}) added with weight ${weight}.`);
        setSelectedNode(null);
        setGhostTarget(null);
        setGraphWeight('');
        triggerCanvasBurst('insert');
      }
    };

    const handleGhostMove = (e) => {
      setGhostTarget(e.detail);
    };

    const handleFloat = (e) => {
      setBstFloatingNode(e.detail);
    };

    const handleFloatClear = () => {
      setBstFloatingNode(null);
    };

    window.addEventListener('graph-node-clicked', handleNodeClick);
    window.addEventListener('graph-ghost-move', handleGhostMove);
    window.addEventListener('bst-successor-float', handleFloat);
    window.addEventListener('bst-successor-float-clear', handleFloatClear);

    return () => {
      window.removeEventListener('graph-node-clicked', handleNodeClick);
      window.removeEventListener('graph-ghost-move', handleGhostMove);
      window.removeEventListener('bst-successor-float', handleFloat);
      window.removeEventListener('bst-successor-float-clear', handleFloatClear);
    };
  }, [selectedNode, graphWeight, triggerCanvasBurst]);

  // Playback loop controller timer
  useEffect(() => {
    let interval = null;
    if (state.isPlaying && state.animationFrames.length > 0) {
      const stepDelay = 1100 - (state.speed * 90); // 200ms to 1000ms delay
      interval = setInterval(() => {
        const store = useStore.getState();
        if (store.currentFrameIdx < store.animationFrames.length - 1) {
          store.nextStep();
        } else {
          useStore.setState({ isPlaying: false });
        }
      }, stepDelay);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isPlaying, state.currentFrameIdx, state.animationFrames, state.speed, state.nextStep]);

  // Tab active indicator (GSAP sliding bar)
  useEffect(() => {
    const activeTab = document.querySelector(`.nav-tab-btn[data-tab="${state.currentTab}"]`);
    const indicator = document.querySelector('.tab-active-indicator');
    if (activeTab && indicator) {
      const rect = activeTab.getBoundingClientRect();
      const wrapperRect = activeTab.parentElement.parentElement.getBoundingClientRect();
      gsap.to(indicator, {
        left: rect.left - wrapperRect.left,
        width: rect.width,
        duration: 0.25,
        ease: "power2.inOut"
      });
    }
  }, [state.currentTab]);

  // Tab switching animations (GSAP stagger wipe)
  const switchTab = (tab) => {
    if (state.isPlaying) return;

    const outgoingPanel = document.querySelector('.canvas-container');
    const rim = document.querySelector('.rim-light');

    gsap.timeline()
      .to(outgoingPanel, { opacity: 0, x: -8, duration: 0.18, ease: "power2.in" })
      .to(rim, { opacity: 0, duration: 0.2 }, 0)
      .call(() => {
        state.setTab(tab);
        state.stopAnimation();
        setInputVal('');
        setListIndex('');
        setGraphNode('');
        setGraphWeight('');
        setSelectedNode(null);
        setGhostTarget(null);
        setListPointers({});
        setBstHighlights({});
        setBstCompareText(null);
        setGraphHighlights(null);
      })
      .to(outgoingPanel, { x: 8, duration: 0 })
      .to(outgoingPanel, { opacity: 1, x: 0, duration: 0.2, ease: "power2.out" })
      .fromTo(rim, { width: "0%", opacity: 0 }, { width: "100%", opacity: 1, duration: 0.4, ease: "power2.out" });
  };

  // Mount page load ceremony
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo('body', { opacity: 0 }, { opacity: 1, duration: 0.5 })
      .fromTo('.hero-badge', { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, 0.15)
      .fromTo('.hero-title', { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }, 0.25)
      .fromTo('.hero-subtitle', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, 0.4)
      .fromTo('.nav-tab-btn', { y: 8, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.25 }, 0.5)
      .fromTo('.rim-light', { width: "0%" }, { width: "100%", duration: 0.5, ease: "power2.out" }, 0.7)
      .fromTo('.canvas-container', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.9)
      .fromTo('.controls-bar', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 }, 1.1)
      .call(() => {
        useStore.getState().addLog('READY', 'Structura initialized - select a structure and start exploring.');
      });
  }, []);

  const shakeInput = (inputId) => {
    const el = document.getElementById(inputId);
    if (el) {
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 280);
    }
  };

  const calculateDuration = (start) => {
    return Math.round(performance.now() - start);
  };

  // -------------------------------------------------------------
  // STACK OPERATIONS
  // -------------------------------------------------------------
  const handleStackPush = () => {
    const val = parseInt(inputVal);
    if (isNaN(val) || val < -9999 || val > 9999) {
      state.addLog('ERROR', 'Integers only. Range: -9999 to 9999.');
      shakeInput('stack-input');
      return;
    }
    if (state.stack.length >= 10) {
      state.addLog('ERROR', 'Stack full. 10/10.');
      return;
    }

    const start = performance.now();
    state.saveHistory();
    const newId = 's' + Date.now();
    useStore.setState(prev => ({ stack: [...prev.stack, { id: newId, val }] }));
    
    state.addLog('INSERT', `Node(${val}) pushed onto stack.`, calculateDuration(start));
    setInputVal('');
    triggerCanvasBurst('insert');
  };

  const handleStackPop = () => {
    if (state.stack.length === 0) {
      state.addLog('ERROR', 'Nothing to pop.');
      return;
    }

    const start = performance.now();
    state.saveHistory();
    const popped = state.stack[state.stack.length - 1];

    useStore.setState(prev => ({ stack: prev.stack.slice(0, -1) }));
    state.addLog('DELETE', `Node(${popped.val}) popped from stack.`, calculateDuration(start));
    triggerCanvasBurst('delete');
  };

  // -------------------------------------------------------------
  // QUEUE OPERATIONS
  // -------------------------------------------------------------
  const handleQueueEnqueue = () => {
    const val = parseInt(inputVal);
    if (isNaN(val) || val < -9999 || val > 9999) {
      state.addLog('ERROR', 'Integers only. Range: -9999 to 9999.');
      shakeInput('queue-input');
      return;
    }
    if (state.queue.length >= 8) {
      state.addLog('ERROR', 'Queue full. 8/8.');
      return;
    }

    const start = performance.now();
    state.saveHistory();
    const newId = 'q' + Date.now();
    useStore.setState(prev => ({ queue: [...prev.queue, { id: newId, val }] }));
    state.addLog('INSERT', `Node(${val}) enqueued at rear.`, calculateDuration(start));
    setInputVal('');
    triggerCanvasBurst('insert');
  };

  const handleQueueDequeue = () => {
    if (state.queue.length === 0) {
      state.addLog('ERROR', 'Nothing to dequeue.');
      return;
    }

    const start = performance.now();
    state.saveHistory();
    const dequeued = state.queue[0];

    useStore.setState(prev => ({ queue: prev.queue.slice(1) }));
    state.addLog('DELETE', `Node(${dequeued.val}) dequeued from front.`, calculateDuration(start));
    triggerCanvasBurst('delete');
  };

  // -------------------------------------------------------------
  // LINKED LIST OPERATIONS
  // -------------------------------------------------------------
  const initializeCustomList = () => {
    const val0 = parseInt(listVal0);
    const val1 = parseInt(listVal1);
    const val2 = parseInt(listVal2);
    const val3 = parseInt(listVal3);

    if (isNaN(val0) || isNaN(val1) || isNaN(val2) || isNaN(val3)) {
      state.addLog('ERROR', 'Enter valid integers for all 4 nodes.');
      return;
    }

    state.saveHistory();
    useStore.setState({
      linkedList: [
        { id: 'l1', val: val0 },
        { id: 'l2', val: val1 },
        { id: 'l3', val: val2 },
        { id: 'l4', val: val3 }
      ]
    });
    state.addLog('READY', `Initialized Linked List: ${val0} -> ${val1} -> ${val2} -> ${val3} -> NULL`);
  };

  const handleListInsertHead = () => {
    const val = parseInt(inputVal);
    if (isNaN(val) || val < -9999 || val > 9999) {
      state.addLog('ERROR', 'Integers only. Range: -9999 to 9999.');
      shakeInput('list-val-input');
      return;
    }

    const listSnapshot = [...state.linkedList];
    const newId = 'l' + Date.now();
    const newNode = { id: newId, val };
    const updatedList = [newNode, ...listSnapshot];

    const frames = [];
    
    frames.push({
      explanation: "Step 1: Display initial linked list. Prepare to insert at head.",
      valSnapshot: listSnapshot.map(n => ({...n})),
      action: () => {
        setListPointers({});
        setBstHighlights({});
      }
    });

    frames.push({
      explanation: `Step 2: Create new node with value ${val}. Set its next pointer to current Head (value ${listSnapshot[0]?.val || 'NULL'}).`,
      valSnapshot: listSnapshot.map(n => ({...n})),
      action: () => {
        setBstHighlights({ nodes: {} });
      }
    });

    frames.push({
      explanation: `Step 3: Update HEAD pointer to point to the new node. Node inserted at head successfully.`,
      valSnapshot: updatedList.map(n => ({...n})),
      action: () => {
        useStore.setState({ linkedList: updatedList });
        triggerCanvasBurst('insert');
        setBstHighlights({ nodes: { 0: 'green' } });
      }
    });

    frames.push({
      explanation: `Step 4: Insertion completed. Addresses and next pointers updated correctly.`,
      valSnapshot: updatedList.map(n => ({...n})),
      action: () => {
        setBstHighlights({});
      }
    });

    state.startAnimation(frames);
    setInputVal('');
  };

  const handleListInsertTail = () => {
    const val = parseInt(inputVal);
    if (isNaN(val) || val < -9999 || val > 9999) {
      state.addLog('ERROR', 'Integers only. Range: -9999 to 9999.');
      shakeInput('list-val-input');
      return;
    }

    const listSnapshot = [...state.linkedList];
    const newId = 'l' + Date.now();
    const newNode = { id: newId, val };
    const updatedList = [...listSnapshot, newNode];

    const frames = [];

    frames.push({
      explanation: "Step 1: Display initial linked list. Traverse to find the tail node.",
      valSnapshot: listSnapshot.map(n => ({...n})),
      action: () => {
        setListPointers({});
        setBstHighlights({});
      }
    });

    for (let i = 0; i < listSnapshot.length; i++) {
      const isTail = i === listSnapshot.length - 1;
      const currentList = listSnapshot.map(n => ({...n}));
      frames.push({
        explanation: isTail
          ? `Tail node found at index ${i} (value ${listSnapshot[i].val}). Preparing link update.`
          : `Inspecting index ${i} (value ${listSnapshot[i].val})... descending downstream.`,
        valSnapshot: currentList,
        action: () => {
          setListPointers({ [i]: 'temp' });
          setBstHighlights({
            activeIdx: i,
            nodes: { [i]: isTail ? 'green' : 'active' }
          });
        }
      });
    }

    frames.push({
      explanation: `Step 3: Connect tail node's next pointer to the new Node(${val}).`,
      valSnapshot: updatedList.map(n => ({...n})),
      action: () => {
        setListPointers({});
        setBstHighlights({});
        useStore.setState({ linkedList: updatedList });
        triggerCanvasBurst('insert');
      }
    });

    frames.push({
      explanation: `Insertion at tail completed. Address pointers updated correctly.`,
      valSnapshot: updatedList.map(n => ({...n})),
      action: () => {
        setBstHighlights({});
      }
    });

    state.startAnimation(frames);
    setInputVal('');
  };

  const handleListInsertIndex = () => {
    const val = parseInt(inputVal);
    const idx = parseInt(listIndex);

    if (isNaN(val) || val < -9999 || val > 9999) {
      state.addLog('ERROR', 'Integers only. Range: -9999 to 9999.');
      shakeInput('list-val-input');
      return;
    }

    if (isNaN(idx) || idx < 0 || idx > state.linkedList.length) {
      state.addLog('ERROR', `Valid index range: 0 to ${state.linkedList.length}.`);
      return;
    }

    if (idx === 0) {
      handleListInsertHead();
      return;
    }
    if (idx === state.linkedList.length) {
      handleListInsertTail();
      return;
    }

    const listSnapshot = [...state.linkedList];
    const newId = 'l' + Date.now();
    const newNode = { id: newId, val };
    
    const updatedList = [
      ...listSnapshot.slice(0, idx),
      newNode,
      ...listSnapshot.slice(idx)
    ];

    const frames = [];

    frames.push({
      explanation: `Step 1: Display initial linked list. Traverse to index ${idx - 1} (node before insertion point).`,
      valSnapshot: listSnapshot.map(n => ({...n})),
      action: () => {
        setListPointers({});
        setBstHighlights({});
      }
    });

    for (let i = 0; i < idx; i++) {
      const isPredecessor = i === idx - 1;
      const currentList = listSnapshot.map(n => ({...n}));
      frames.push({
        explanation: isPredecessor
          ? `Predecessor node found at index ${i} (value ${listSnapshot[i].val}). Ready to insert.`
          : `Traversing... inspecting node at index ${i} (value ${listSnapshot[i].val}).`,
        valSnapshot: currentList,
        action: () => {
          setListPointers({ [i]: 'temp' });
          setBstHighlights({
            activeIdx: i,
            nodes: { [i]: isPredecessor ? 'green' : 'active' }
          });
        }
      });
    }

    frames.push({
      explanation: `Step 3: Set new Node(${val}).next = temp.next (Node at index ${idx}, value ${listSnapshot[idx].val}).`,
      valSnapshot: listSnapshot.map(n => ({...n})),
      action: () => {
        setListPointers({ [idx - 1]: 'temp' });
      }
    });

    frames.push({
      explanation: `Step 4: Update temp.next = new Node(${val}). Dynamic linked list updated successfully.`,
      valSnapshot: updatedList.map(n => ({...n})),
      action: () => {
        setListPointers({});
        setBstHighlights({});
        useStore.setState({ linkedList: updatedList });
        triggerCanvasBurst('insert');
      }
    });

    frames.push({
      explanation: `Insertion completed. Reference addresses refreshed.`,
      valSnapshot: updatedList.map(n => ({...n})),
      action: () => {
        setBstHighlights({});
      }
    });

    state.startAnimation(frames);
    setInputVal('');
    setListIndex('');
  };

  const handleListDelete = () => {
    const val = parseInt(inputVal);
    if (isNaN(val)) {
      state.addLog('ERROR', 'Enter value to delete.');
      shakeInput('list-val-input');
      return;
    }

    const targetIdx = state.linkedList.findIndex(n => n.val === val);
    if (targetIdx === -1) {
      state.addLog('ERROR', `Node(${val}) not found in the list.`);
      return;
    }

    // Step-by-step reference visualization builder
    const frames = [];
    const listSnapshot = [...state.linkedList];

    // Frame 0: Display initial state
    frames.push({
      explanation: "Step 1: Display initial linked list. Prepare preceding pointer scan.",
      valSnapshot: listSnapshot.map(n => ({...n})),
      action: () => {
        setListPointers({});
        setBstHighlights({});
      }
    });

    // Traverse up to target
    for (let i = 0; i <= targetIdx; i++) {
      const isTarget = i === targetIdx;
      const currentList = listSnapshot.map(n => ({...n}));
      frames.push({
        explanation: isTarget 
          ? `Step 2: temp points to Node ${i - 1} (before target), highlight Node ${i} (target value ${val}).`
          : `Searching for target node... Inspecting index ${i} (value ${listSnapshot[i].val}).`,
        valSnapshot: currentList,
        action: () => {
          setListPointers({ [Math.max(0, i - 1)]: 'temp' });
          setBstHighlights({
            activeIdx: i,
            nodes: { [i]: isTarget ? 'coral' : 'active' }
          });
        }
      });
    }

    // Re-link preceding node to target's successor
    const relinkedList = listSnapshot.filter((_, index) => index !== targetIdx);
    frames.push({
      explanation: targetIdx === 0
        ? `Step 3: Move HEAD to the next node. Target Node is visually removed.`
        : `Step 3: Update predecessor pointer to bypass target (temp.next = temp.next.next). Target Node is visually removed.`,
      valSnapshot: relinkedList.map(n => ({...n})),
      action: () => {
        setListPointers({});
        setBstHighlights({});
        useStore.setState({ linkedList: relinkedList });
        triggerCanvasBurst('delete');
      }
    });

    // Complete Deletion
    frames.push({
      explanation: `Step 4: Node containing value ${val} deleted successfully. Chain links updated.`,
      valSnapshot: relinkedList.map(n => ({...n})),
      action: () => {
        setListPointers({});
        setBstHighlights({});
      }
    });

    state.startAnimation(frames);
    setInputVal('');
  };

  const handleListTraverse = () => {
    if (state.linkedList.length === 0) return;

    const frames = [];
    const listSnapshot = [...state.linkedList];

    for (let i = 0; i < listSnapshot.length; i++) {
      frames.push({
        explanation: `TRAVERSE -> temp points to index ${i} (value ${listSnapshot[i].val}) at 0x${(i * 16 + 4096).toString(16).toUpperCase()}.`,
        valSnapshot: listSnapshot.map(n => ({...n})),
        action: () => {
          setListPointers({ [i]: 'temp' });
          setBstHighlights({
            activeIdx: i,
            nodes: Array.from({ length: i + 1 }).reduce((acc, _, index) => ({ ...acc, [index]: 'purple' }), {})
          });
        }
      });
    }

    frames.push({
      explanation: `TRAVERSE -> Finished traversal. Total nodes: ${listSnapshot.length}`,
      valSnapshot: listSnapshot.map(n => ({...n})),
      action: () => {
        setListPointers({});
        setBstHighlights({});
      }
    });

    state.startAnimation(frames);
  };

  // -------------------------------------------------------------
  // BST OPERATIONS
  // -------------------------------------------------------------
  const handleBstInsert = () => {
    const val = parseInt(inputVal);
    if (isNaN(val) || val < -9999 || val > 9999) {
      state.addLog('ERROR', 'Integers only. Range: -9999 to 9999.');
      shakeInput('bst-input');
      return;
    }

    if (state.bstNodes.some(n => n.val === val)) {
      state.addLog('ERROR', `Value ${val} already exists in BST.`);
      return;
    }

    const bstSnapshot = state.bstNodes.map(n => ({ ...n }));
    const root = bstSnapshot.find(n => !bstSnapshot.some(p => p.left === n.id || p.right === n.id));
    
    if (!root) {
      // Empty tree insertion
      const start = performance.now();
      state.saveHistory();
      useStore.setState({
        bstNodes: [{ id: String(val), val, left: null, right: null }]
      });
      state.addLog('INSERT', `Inserted root node (${val}).`, calculateDuration(start));
      setInputVal('');
      triggerCanvasBurst('insert');
      return;
    }

    const frames = [];
    let curr = root;
    const path = [];

    // Frame-by-frame descent path builder
    while (curr) {
      path.push(curr.val);
      const activePath = [...path];
      const currNode = curr;

      if (val < curr.val) {
        frames.push({
          explanation: `Compare ${val} < ${curr.val} -> Descend left subtree.`,
          valSnapshot: bstSnapshot.map(n => ({...n})),
          action: () => {
            setBstHighlights({ active: activePath });
            setBstCompareText({ nodeId: currNode.id, text: `${val} < ${currNode.val} - go left` });
          }
        });

        if (!curr.left) {
          const newId = String(val);
          const newNode = { id: newId, val, left: null, right: null };
          curr.left = newId;
          bstSnapshot.push(newNode);
          
          frames.push({
            explanation: `Left child is null. Node (${val}) inserted as left child of Node (${currNode.val}).`,
            valSnapshot: bstSnapshot.map(n => ({...n})),
            action: () => {
              setBstCompareText(null);
              useStore.setState({ bstNodes: bstSnapshot.map(n => ({...n})) });
              setBstHighlights({ green: [val] });
              triggerCanvasBurst('insert');
            }
          });
          break;
        }
        curr = bstSnapshot.find(n => n.id === curr.left);
      } else {
        frames.push({
          explanation: `Compare ${val} > ${curr.val} -> Descend right subtree.`,
          valSnapshot: bstSnapshot.map(n => ({...n})),
          action: () => {
            setBstHighlights({ active: activePath });
            setBstCompareText({ nodeId: currNode.id, text: `${val} > ${currNode.val} - go right` });
          }
        });

        if (!curr.right) {
          const newId = String(val);
          const newNode = { id: newId, val, left: null, right: null };
          curr.right = newId;
          bstSnapshot.push(newNode);
          
          frames.push({
            explanation: `Right child is null. Node (${val}) inserted as right child of Node (${currNode.val}).`,
            valSnapshot: bstSnapshot.map(n => ({...n})),
            action: () => {
              setBstCompareText(null);
              useStore.setState({ bstNodes: bstSnapshot.map(n => ({...n})) });
              setBstHighlights({ green: [val] });
              triggerCanvasBurst('insert');
            }
          });
          break;
        }
        curr = bstSnapshot.find(n => n.id === curr.right);
      }
    }

    state.startAnimation(frames);
    setInputVal('');
  };

  const getBstNodeCoords = (nodes, nodeId) => {
    const findNode = (id) => nodes.find(n => n.id === id);
    const buildTree = (id) => {
      const n = findNode(id);
      if (!n) return null;
      return {
        val: n.val,
        id: n.id,
        left: buildTree(n.left),
        right: buildTree(n.right)
      };
    };
    const rootNode = nodes.find(n => !nodes.some(p => p.left === n.id || p.right === n.id));
    if (!rootNode) return null;
    const rootData = buildTree(rootNode.id);
    const d3Root = d3.hierarchy(rootData, d => [d.left, d.right].filter(Boolean));
    const treeLayout = d3.tree().size([600, 220]);
    treeLayout(d3Root);
    const matched = d3Root.descendants().find(d => d.data.id === nodeId);
    if (matched) {
      return { x: matched.x + 80, y: matched.y + 60 };
    }
    return null;
  };

  const handleBstDelete = () => {
    const val = parseInt(inputVal);
    if (isNaN(val)) {
      state.addLog('ERROR', 'Enter value to delete.');
      shakeInput('bst-input');
      return;
    }

    const nodeToDelete = state.bstNodes.find(n => n.val === val);
    if (!nodeToDelete) {
      state.addLog('ERROR', `Value ${val} not found in BST.`);
      return;
    }

    const bstSnapshot = state.bstNodes.map(n => ({ ...n }));
    const root = bstSnapshot.find(n => !bstSnapshot.some(p => p.left === n.id || p.right === n.id));
    
    const frames = [];
    let curr = root;
    const path = [];

    // Search target node path
    while (curr) {
      path.push(curr.val);
      const activePath = [...path];
      const currNode = curr;

      if (val === curr.val) {
        frames.push({
          explanation: `Target Node (${val}) found. Preparing deletion.`,
          valSnapshot: bstSnapshot.map(n => ({...n})),
          action: () => {
            setBstHighlights({ active: activePath, coral: [val] });
          }
        });
        break;
      } else if (val < curr.val) {
        frames.push({
          explanation: `Compare ${val} < ${curr.val} -> Descend left subtree.`,
          valSnapshot: bstSnapshot.map(n => ({...n})),
          action: () => {
            setBstHighlights({ active: activePath });
            setBstCompareText({ nodeId: currNode.id, text: `${val} < ${currNode.val} - go left` });
          }
        });
        curr = bstSnapshot.find(n => n.id === curr.left);
      } else {
        frames.push({
          explanation: `Compare ${val} > ${curr.val} -> Descend right subtree.`,
          valSnapshot: bstSnapshot.map(n => ({...n})),
          action: () => {
            setBstHighlights({ active: activePath });
            setBstCompareText({ nodeId: currNode.id, text: `${val} > ${currNode.val} - go right` });
          }
        });
        curr = bstSnapshot.find(n => n.id === curr.right);
      }
    }

    const getParent = (tree, nodeId) => {
      return tree.find(n => n.left === nodeId || n.right === nodeId);
    };

    const targetId = nodeToDelete.id;
    const targetNodeInSnapshot = bstSnapshot.find(n => n.id === targetId);

    if (!targetNodeInSnapshot.left && !targetNodeInSnapshot.right) {
      const parent = getParent(bstSnapshot, targetId);
      if (parent) {
        if (parent.left === targetId) parent.left = null;
        else parent.right = null;
      }
      const finalTree = bstSnapshot.filter(n => n.id !== targetId);
      
      frames.push({
        explanation: `Node (${val}) is a leaf node. Disconnecting parent pointer. Node deleted.`,
        valSnapshot: finalTree.map(n => ({...n})),
        action: () => {
          setBstCompareText(null);
          setBstHighlights({});
          useStore.setState({ bstNodes: finalTree });
          triggerCanvasBurst('delete');
        }
      });

    } else if (!targetNodeInSnapshot.left || !targetNodeInSnapshot.right) {
      const childId = targetNodeInSnapshot.left || targetNodeInSnapshot.right;
      const parent = getParent(bstSnapshot, targetId);
      
      if (parent) {
        if (parent.left === targetId) parent.left = childId;
        else parent.right = childId;
      }
      const finalTree = bstSnapshot.filter(n => n.id !== targetId);

      frames.push({
        explanation: `Node (${val}) has one child (${bstSnapshot.find(n => n.id === childId).val}). Bypassing node to link parent directly.`,
        valSnapshot: finalTree.map(n => ({...n})),
        action: () => {
          setBstCompareText(null);
          setBstHighlights({});
          useStore.setState({ bstNodes: finalTree });
          triggerCanvasBurst('delete');
        }
      });

    } else {
      let successorParent = targetNodeInSnapshot;
      let successor = bstSnapshot.find(n => n.id === targetNodeInSnapshot.right);
      const successorPath = [successor.val];

      frames.push({
        explanation: `Node (${val}) has two children. Finding in-order successor (smallest node in right subtree)...`,
        valSnapshot: bstSnapshot.map(n => ({...n})),
        action: () => {
          setBstHighlights({ active: [...path], amber: [...successorPath] });
        }
      });

      while (successor.left) {
        successorParent = successor;
        successor = bstSnapshot.find(n => n.id === successor.left);
        successorPath.push(successor.val);
        
        const currentSuccessorPath = [...successorPath];
        frames.push({
          explanation: `Descend left to find successor: inspecting Node (${successor.val}).`,
          valSnapshot: bstSnapshot.map(n => ({...n})),
          action: () => {
            setBstHighlights({ active: [...path], amber: currentSuccessorPath });
          }
        });
      }

      const successorVal = successor.val;
      const successorId = successor.id;

      const coordsTarget = getBstNodeCoords(state.bstNodes, targetId);
      const coordsSuccessor = getBstNodeCoords(state.bstNodes, successorId);

      frames.push({
        explanation: `In-order successor found: Node (${successorVal}). Swapping value with target Node (${val}).`,
        valSnapshot: bstSnapshot.map(n => ({...n})),
        action: () => {
          setBstHighlights({ active: [...path], green: [successorVal] });
          if (coordsTarget && coordsSuccessor) {
            window.dispatchEvent(new CustomEvent('bst-successor-float', {
              detail: {
                val: successorVal,
                fromX: coordsSuccessor.x,
                fromY: coordsSuccessor.y,
                toX: coordsTarget.x,
                toY: coordsTarget.y
              }
            }));
          }
        }
      });

      const successorRightChildId = successor.right;
      if (successorParent.id === targetId) {
        successorParent.right = successorRightChildId;
      } else {
        successorParent.left = successorRightChildId;
      }

      const targetNodeInFinal = bstSnapshot.find(n => n.id === targetId);
      targetNodeInFinal.val = successorVal;

      const finalTree = bstSnapshot.filter(n => n.id !== successorId);

      frames.push({
        explanation: `Teleport complete. Node (${successorVal}) deleted from original position, replacing the deleted value.`,
        valSnapshot: finalTree.map(n => ({...n})),
        action: () => {
          setBstCompareText(null);
          setBstHighlights({});
          window.dispatchEvent(new CustomEvent('bst-successor-float-clear'));
          useStore.setState({ bstNodes: finalTree });
          triggerCanvasBurst('delete');
        }
      });
    }

    state.startAnimation(frames);
    setInputVal('');
  };

  const handleBstWalk = (type) => {
    if (state.bstNodes.length === 0) return;

    const walkList = [];
    const findN = (id) => state.bstNodes.find(x => x.id === id);
    const root = state.bstNodes.find(n => !state.bstNodes.some(p => p.left === n.id || p.right === n.id));

    const inorder = (node) => {
      if (!node) return;
      inorder(findN(node.left));
      walkList.push(node.val);
      inorder(findN(node.right));
    };
    const preorder = (node) => {
      if (!node) return;
      walkList.push(node.val);
      preorder(findN(node.left));
      preorder(findN(node.right));
    };
    const postorder = (node) => {
      if (!node) return;
      postorder(findN(node.left));
      postorder(findN(node.right));
      walkList.push(node.val);
    };

    if (type === 'in') inorder(root);
    if (type === 'pre') preorder(root);
    if (type === 'post') postorder(root);

    const bstSnapshot = state.bstNodes.map(n => ({...n}));
    const frames = [];
    const visited = [];

    for (let i = 0; i < walkList.length; i++) {
      visited.push(walkList[i]);
      const currentVisited = [...visited];
      frames.push({
        explanation: `TRAVERSE -> Visited value ${walkList[i]}. Adding to traversal output.`,
        valSnapshot: bstSnapshot,
        action: () => {
          setBstHighlights({ amber: currentVisited });
        }
      });
    }

    frames.push({
      explanation: `${type.toUpperCase()}-ORDER traversal completed: ${walkList.join(', ')}`,
      valSnapshot: bstSnapshot,
      action: () => {
        setBstHighlights({});
      }
    });

    state.startAnimation(frames);
  };

  // -------------------------------------------------------------
  // GRAPH OPERATIONS
  // -------------------------------------------------------------
  const handleGraphAddNode = () => {
    const label = graphNode.trim().toUpperCase();
    if (!label) {
      state.addLog('ERROR', 'Node label required.');
      shakeInput('graph-node-input');
      return;
    }

    if (state.graph.nodes.some(n => n.label === label)) {
      state.addLog('ERROR', `Node with label ${label} already exists.`);
      return;
    }

    const start = performance.now();
    state.saveHistory();

    const x = 200 + Math.random() * 400;
    const y = 100 + Math.random() * 200;
    
    const updatedNodes = [...state.graph.nodes, { id: label, label, x, y, color: `var(--node-${label})` }];
    useStore.setState({ graph: { ...state.graph, nodes: updatedNodes } });
    
    state.addLog('INSERT', `Node (${label}) added.`, calculateDuration(start));
    setGraphNode('');
    triggerCanvasBurst('insert');
  };

  const handleGraphAddEdge = () => {
    const source = graphNode.trim().toUpperCase();
    const weight = parseInt(graphWeight) || 1;
    
    if (source && selectedNode) {
      if (source === selectedNode) {
        state.addLog('ERROR', 'Cannot create self-loop.');
        return;
      }
      const target = source;
      const sNode = selectedNode;
      
      if (!state.graph.nodes.some(n => n.id === target)) {
        state.addLog('ERROR', `Target node (${target}) does not exist.`);
        return;
      }

      const edgeExists = state.graph.edges.some(edge => {
        const s = edge.source.id || edge.source;
        const t = edge.target.id || edge.target;
        return (s === sNode && t === target) || (s === target && t === sNode);
      });

      if (edgeExists) {
        state.addLog('ERROR', `Edge between (${sNode}) and (${target}) already exists.`);
        return;
      }

      state.saveHistory();
      const updatedEdges = [...state.graph.edges, { source: sNode, target, weight }];
      useStore.setState({ graph: { ...state.graph, edges: updatedEdges } });
      state.addLog('INSERT', `Edge (${sNode}) -> (${target}) added with weight ${weight}.`);
      setSelectedNode(null);
      setGhostTarget(null);
      setGraphNode('');
      setGraphWeight('');
      triggerCanvasBurst('insert');
    } else {
      state.addLog('READY', 'Click source node on canvas, then target node to create edge. Use "w" input to set weight.');
    }
  };

  const handleGraphRemoveNode = () => {
    const nodeLabel = graphNode.trim().toUpperCase();
    const targetId = nodeLabel || selectedNode;
    
    if (!targetId) {
      state.addLog('ERROR', 'Specify node label in input or select a node to remove.');
      return;
    }

    const nodeExists = state.graph.nodes.some(n => n.id === targetId);
    if (!nodeExists) {
      state.addLog('ERROR', `Node (${targetId}) not found.`);
      return;
    }

    const start = performance.now();
    state.saveHistory();

    const updatedNodes = state.graph.nodes.filter(n => n.id !== targetId);
    const updatedEdges = state.graph.edges.filter(edge => {
      const s = edge.source.id || edge.source;
      const t = edge.target.id || edge.target;
      return s !== targetId && t !== targetId;
    });

    useStore.setState({
      graph: {
        nodes: updatedNodes,
        edges: updatedEdges
      }
    });

    state.addLog('DELETE', `Node (${targetId}) and its connected edges removed.`, calculateDuration(start));
    setGraphNode('');
    setSelectedNode(null);
    setGhostTarget(null);
    triggerCanvasBurst('delete');
  };

  const handleGraphClear = () => {
    state.saveHistory();
    useStore.setState({
      graph: { nodes: [], edges: [] }
    });
    state.addLog('DELETE', 'Graph cleared.');
    setSelectedNode(null);
    setGhostTarget(null);
  };

  const handleGraphBfs = () => {
    const nodes = state.graph.nodes;
    const edges = state.graph.edges;
    if (nodes.length === 0) return;

    const startNodeId = selectedNode || nodes[0].id;
    const queue = [startNodeId];
    const visited = new Set();
    const traversalOrder = [];
    const frames = [];

    const getNeighbors = (nodeId) => {
      const neighbors = [];
      edges.forEach(e => {
        const s = e.source.id || e.source;
        const t = e.target.id || e.target;
        if (s === nodeId) neighbors.push(t);
        else if (t === nodeId) neighbors.push(s);
      });
      return neighbors;
    };

    const parentMap = {};

    frames.push({
      explanation: `BFS traversal started from Node (${startNodeId}). Queue initialized: [${startNodeId}]`,
      valSnapshot: { ...state.graph },
      action: () => {
        setGraphHighlights({
          nodes: { [startNodeId]: 'active' },
          links: [],
          queueState: { type: 'QUEUE', list: [startNodeId] }
        });
      }
    });

    const nodeColors = {};
    const traversedLinks = [];

    while (queue.length > 0) {
      const current = queue.shift();
      visited.add(current);
      traversalOrder.push(current);
      nodeColors[current] = 'green';

      if (parentMap[current]) {
        traversedLinks.push({ source: parentMap[current], target: current });
      }

      const neighbors = getNeighbors(current);
      const unvisitedNeighbors = neighbors.filter(n => !visited.has(n) && !queue.includes(n));

      const activeNodes = { ...nodeColors, [current]: 'active' };
      unvisitedNeighbors.forEach(n => {
        activeNodes[n] = 'amber';
      });

      unvisitedNeighbors.forEach(n => {
        queue.push(n);
        parentMap[n] = current;
      });

      const queueSnapshot = [...queue];
      const currentHighlights = {
        nodes: { ...activeNodes },
        links: [...traversedLinks],
        queueState: { type: 'QUEUE', list: queueSnapshot }
      };

      frames.push({
        explanation: `BFS: Dequeued Node (${current}). Processing neighbors: [${neighbors.join(', ')}]. Enqueued: [${unvisitedNeighbors.join(', ')}].`,
        valSnapshot: { ...state.graph },
        action: () => {
          setGraphHighlights(currentHighlights);
        }
      });
    }

    frames.push({
      explanation: `BFS Traversal completed. Visited sequence: ${traversalOrder.join(' -> ')}`,
      valSnapshot: { ...state.graph },
      action: () => {
        setGraphHighlights({
          nodes: nodeColors,
          links: traversedLinks,
          queueState: null
        });
      }
    });

    state.startAnimation(frames);
  };

  const handleGraphDfs = () => {
    const nodes = state.graph.nodes;
    const edges = state.graph.edges;
    if (nodes.length === 0) return;

    const startNodeId = selectedNode || nodes[0].id;
    const stack = [startNodeId];
    const visited = new Set();
    const traversalOrder = [];
    const frames = [];

    const getNeighbors = (nodeId) => {
      const neighbors = [];
      edges.forEach(e => {
        const s = e.source.id || e.source;
        const t = e.target.id || e.target;
        if (s === nodeId) neighbors.push(t);
        else if (t === nodeId) neighbors.push(s);
      });
      return neighbors;
    };

    frames.push({
      explanation: `DFS traversal started from Node (${startNodeId}). Stack initialized: [${startNodeId}]`,
      valSnapshot: { ...state.graph },
      action: () => {
        setGraphHighlights({
          nodes: { [startNodeId]: 'active' },
          links: [],
          queueState: { type: 'STACK', list: [startNodeId] }
        });
      }
    });

    const nodeColors = {};
    const traversedLinks = [];
    const parentMap = {};

    while (stack.length > 0) {
      const current = stack.pop();
      
      if (visited.has(current)) {
        frames.push({
          explanation: `DFS: Popped Node (${current}) from stack, but it was already visited. Skipping.`,
          valSnapshot: { ...state.graph },
          action: () => {
            setGraphHighlights({
              nodes: { ...nodeColors },
              links: [...traversedLinks],
              queueState: { type: 'STACK', list: [...stack] }
            });
          }
        });
        continue;
      }

      visited.add(current);
      traversalOrder.push(current);
      nodeColors[current] = 'green';

      if (parentMap[current]) {
        traversedLinks.push({ source: parentMap[current], target: current });
      }

      const neighbors = getNeighbors(current);
      const unvisitedNeighbors = neighbors.filter(n => !visited.has(n));

      const activeNodes = { ...nodeColors, [current]: 'active' };
      unvisitedNeighbors.forEach(n => {
        activeNodes[n] = 'amber';
      });

      unvisitedNeighbors.forEach(n => {
        stack.push(n);
        parentMap[n] = current;
      });

      const stackSnapshot = [...stack];
      const currentHighlights = {
        nodes: { ...activeNodes },
        links: [...traversedLinks],
        queueState: { type: 'STACK', list: stackSnapshot }
      };

      frames.push({
        explanation: `DFS: Popped Node (${current}) from stack. Processing neighbors: [${neighbors.join(', ')}]. Pushed: [${unvisitedNeighbors.join(', ')}].`,
        valSnapshot: { ...state.graph },
        action: () => {
          setGraphHighlights(currentHighlights);
        }
      });
    }

    frames.push({
      explanation: `DFS Traversal completed. Visited sequence: ${traversalOrder.join(' -> ')}`,
      valSnapshot: { ...state.graph },
      action: () => {
        setGraphHighlights({
          nodes: nodeColors,
          links: traversedLinks,
          queueState: null
        });
      }
    });

    state.startAnimation(frames);
  };

  return (
    <React.Fragment>
      <ThreeBackground />

      <div className="app-shell">
      <section className="hero-section">
          <div className="hero-badge">
            <span className="badge-dot" />
            Interactive Playground
          </div>
          <h1 className="hero-title">
            Visualize <span className="accent-word">Data Structures</span><br />
            Step by Step
          </h1>
          <p className="hero-subtitle">
            Explore stacks, queues, linked lists, binary search trees, and
            graphs with real-time animated operations and a built-in debugger.
          </p>
        </section>

        <div className="nav-tabs-wrapper">
          <ul className="nav-tabs">
            {['stack', 'queue', 'linkedList', 'bst', 'graph'].map((tab) => (
              <li key={tab} className="nav-tab-item">
                <button
                  data-tab={tab}
                  className={`nav-tab-btn ${state.currentTab === tab ? 'active' : ''}`}
                  onClick={() => switchTab(tab)}
                >
                  {tab === 'linkedList' ? 'Linked List' : tab === 'bst' ? 'Trees' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <main className="terminal-panel">
          <div className="rim-light" />

          <div className="terminal-titlebar">
            <div className="terminal-titlebar-left">
              <div className="traffic-lights">
                <span className="light-rose" />
                <span className="light-amber" />
                <span className="light-mint" />
              </div>
              <span className="structure-name">
                {state.currentTab === 'linkedList' ? 'Linked List' : state.currentTab === 'bst' ? 'Binary Search Tree' : state.currentTab.charAt(0).toUpperCase() + state.currentTab.slice(1)}
              </span>
              <span className="node-count">
                {state.currentTab === 'stack' ? state.stack.length :
                  state.currentTab === 'queue' ? state.queue.length :
                  state.currentTab === 'linkedList' ? state.linkedList.length :
                  state.currentTab === 'bst' ? state.bstNodes.length :
                  state.graph.nodes.length} nodes
              </span>
            </div>
            
            <div className="undo-btn-wrapper">
              <button onClick={state.undo} disabled={state.isPlaying}>
                Undo
              </button>
            </div>
          </div>

          <div className="canvas-container">
            {state.currentTab === 'stack' && <StackVisualizer nodes={state.stack} />}
            {state.currentTab === 'queue' && <QueueVisualizer nodes={state.queue} />}
            {state.currentTab === 'linkedList' && (
              <LinkedListVisualizer
                nodes={state.linkedList}
                highlights={bstHighlights}
                listPointers={listPointers}
              />
            )}
            {state.currentTab === 'bst' && (
              <BstVisualizer
                nodes={state.bstNodes}
                highlights={bstHighlights}
                compareText={bstCompareText}
                bstFloatingNode={bstFloatingNode}
              />
            )}
            {state.currentTab === 'graph' && (
              <GraphVisualizer
                graph={state.graph}
                highlights={graphHighlights}
                simulationRef={simulationRef}
                selectedNode={selectedNode}
                ghostTarget={ghostTarget}
              />
            )}
          </div>

          {/* Controls Panel Section */}
          <div className="controls-bar">
            
            {/* Stack Controls */}
            {state.currentTab === 'stack' && (
              <div className="controls-group">
                <input
                  type="number"
                  id="stack-input"
                  placeholder="0"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStackPush()}
                  disabled={state.isPlaying}
                />
                <button className="primary-action" onClick={handleStackPush} disabled={state.isPlaying}>Push</button>
                <button className="danger-action" onClick={handleStackPop} disabled={state.isPlaying}>Pop</button>
                <button onClick={() => {
                  if (state.stack.length === 0) return;
                  state.addLog('SEARCH', `Peeking top value: ${state.stack[state.stack.length - 1].val}`);
                }} disabled={state.isPlaying}>Peek</button>
                <button onClick={() => {
                  state.saveHistory();
                  useStore.setState({ stack: [] });
                  state.addLog('DELETE', 'Stack cleared.');
                }} disabled={state.isPlaying}>Clear</button>
              </div>
            )}

            {/* Queue Controls */}
            {state.currentTab === 'queue' && (
              <div className="controls-group">
                <input
                  type="number"
                  id="queue-input"
                  placeholder="0"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQueueEnqueue()}
                  disabled={state.isPlaying}
                />
                <button className="primary-action" onClick={handleQueueEnqueue} disabled={state.isPlaying}>Enqueue</button>
                <button className="danger-action" onClick={handleQueueDequeue} disabled={state.isPlaying}>Dequeue</button>
                <button onClick={() => {
                  if (state.queue.length === 0) return;
                  state.addLog('SEARCH', `Peeked front value: ${state.queue[0].val}`);
                }} disabled={state.isPlaying}>Peek</button>
                <button onClick={() => {
                  state.saveHistory();
                  useStore.setState({ queue: [] });
                  state.addLog('DELETE', 'Queue cleared.');
                }} disabled={state.isPlaying}>Clear</button>
              </div>
            )}

            {/* Linked List Customizer Controls */}
            {state.currentTab === 'linkedList' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>INITIAL LIST:</span>
                  <input type="number" style={{ width: '48px' }} value={listVal0} onChange={(e) => setListVal0(e.target.value)} />
                  <input type="number" style={{ width: '48px' }} value={listVal1} onChange={(e) => setListVal1(e.target.value)} />
                  <input type="number" style={{ width: '48px' }} value={listVal2} onChange={(e) => setListVal2(e.target.value)} />
                  <input type="number" style={{ width: '48px' }} value={listVal3} onChange={(e) => setListVal3(e.target.value)} />
                  <button onClick={initializeCustomList} disabled={state.isPlaying}>Initialize</button>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      id="list-val-input"
                      placeholder="Node Val"
                      style={{ width: '80px' }}
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      disabled={state.isPlaying}
                    />
                    <input
                      type="number"
                      placeholder="Index"
                      style={{ width: '50px' }}
                      value={listIndex}
                      onChange={(e) => setListIndex(e.target.value)}
                      disabled={state.isPlaying}
                    />
                    <button className="primary-action" onClick={handleListInsertHead} disabled={state.isPlaying}>Insert Head</button>
                    <button className="primary-action" onClick={handleListInsertTail} disabled={state.isPlaying}>Insert Tail</button>
                    <button onClick={handleListInsertIndex} disabled={state.isPlaying}>At Index</button>
                    <button className="danger-action" onClick={handleListDelete} disabled={state.isPlaying}>Delete</button>
                    <button onClick={handleListTraverse} disabled={state.isPlaying}>Traverse</button>
                  </div>
                </div>
              </div>
            )}

            {/* BST Controls */}
            {state.currentTab === 'bst' && (
              <div className="controls-group">
                <input
                  type="number"
                  id="bst-input"
                  placeholder="0"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={state.isPlaying}
                />
                <button className="primary-action" onClick={handleBstInsert} disabled={state.isPlaying}>Insert</button>
                <button className="danger-action" onClick={handleBstDelete} disabled={state.isPlaying}>Delete</button>
                <button onClick={() => handleBstWalk('in')} disabled={state.isPlaying}>In-Order</button>
                <button onClick={() => handleBstWalk('pre')} disabled={state.isPlaying}>Pre-Order</button>
                <button onClick={() => handleBstWalk('post')} disabled={state.isPlaying}>Post-Order</button>
                <button onClick={() => {
                  state.saveHistory();
                  useStore.setState({ bstNodes: [] });
                  state.addLog('DELETE', 'BST Cleared.');
                }} disabled={state.isPlaying}>Clear</button>
              </div>
            )}

            {/* Graph Controls */}
            {state.currentTab === 'graph' && (
              <div className="controls-group">
                <input
                  type="text"
                  id="graph-node-input"
                  placeholder="A"
                  style={{ width: '50px' }}
                  value={graphNode}
                  onChange={(e) => setGraphNode(e.target.value)}
                  disabled={state.isPlaying}
                />
                <button className="primary-action" onClick={handleGraphAddNode} disabled={state.isPlaying}>Add Node</button>
                
                <input
                  type="number"
                  placeholder="w"
                  style={{ width: '50px' }}
                  value={graphWeight}
                  onChange={(e) => setGraphWeight(e.target.value)}
                  disabled={state.isPlaying}
                />
                <button onClick={handleGraphAddEdge} disabled={state.isPlaying}>
                  {selectedNode ? 'Edge Mode OK' : 'Add Edge'}
                </button>
                
                <button className="danger-action" onClick={handleGraphRemoveNode} disabled={state.isPlaying}>Remove Node</button>
                <button onClick={handleGraphBfs} disabled={state.isPlaying}>BFS</button>
                <button onClick={handleGraphDfs} disabled={state.isPlaying}>DFS</button>
                <button onClick={handleGraphClear} disabled={state.isPlaying}>Clear</button>
              </div>
            )}

            {/* Debugger Step Controls */}
            <div className="debugger-controls">
              <div className="playback-controls">
                <button onClick={state.prevStep} disabled={state.currentFrameIdx <= 0}>
                  Prev
                </button>
                <button 
                  onClick={() => useStore.setState(prev => ({ isPlaying: !prev.isPlaying }))}
                  disabled={state.animationFrames.length === 0}
                  className="primary-action"
                >
                  {state.isPlaying ? 'Pause' : 'Play'}
                </button>
                <button onClick={state.nextStep} disabled={state.currentFrameIdx === -1 || state.currentFrameIdx >= state.animationFrames.length - 1}>
                  Step
                </button>
                <button onClick={state.resetAnimation} disabled={state.animationFrames.length === 0}>
                  Reset
                </button>
              </div>

              <div className="speed-slider-container">
                <span>SPEED:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={state.speed}
                  onChange={(e) => state.setSpeed(parseInt(e.target.value))}
                />
              </div>

              {/* Explanations text banner */}
              <div className="explanation-banner">
                {state.activeExplanation}
              </div>
            </div>

          </div>

          <DebuggerLog />
        </main>
      </div>
    </React.Fragment>
  );
};
export default App;

