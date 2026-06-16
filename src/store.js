import { create } from 'zustand';

export const useStore = create((set, get) => ({
  currentTab: 'stack',
  speed: 5,
  
  // Data States
  stack: [
    { id: 's1', val: 7 },
    { id: 's2', val: 23 },
    { id: 's3', val: 41 },
    { id: 's4', val: 15 }
  ],
  queue: [
    { id: 'q1', val: 3 },
    { id: 'q2', val: 19 },
    { id: 'q3', val: 8 },
    { id: 'q4', val: 42 }
  ],
  linkedList: [
    { id: 'l1', val: 10 },
    { id: 'l2', val: 20 },
    { id: 'l3', val: 30 },
    { id: 'l4', val: 40 }
  ],
  bstNodes: [
    { id: '50', val: 50, left: '30', right: '70' },
    { id: '30', val: 30, left: '20', right: '40' },
    { id: '70', val: 70, left: '60', right: '80' },
    { id: '20', val: 20, left: null, right: null },
    { id: '40', val: 40, left: null, right: null },
    { id: '60', val: 60, left: null, right: null },
    { id: '80', val: 80, left: null, right: null }
  ],
  graph: {
    nodes: [
      { id: 'A', label: 'A', x: 250, y: 150, color: 'var(--node-A)' },
      { id: 'B', label: 'B', x: 380, y: 100, color: 'var(--node-B)' },
      { id: 'C', label: 'C', x: 500, y: 130, color: 'var(--node-C)' },
      { id: 'D', label: 'D', x: 300, y: 280, color: 'var(--node-D)' },
      { id: 'E', label: 'E', x: 440, y: 290, color: 'var(--node-E)' },
      { id: 'F', label: 'F', x: 580, y: 220, color: 'var(--node-F)' }
    ],
    edges: [
      { source: 'A', target: 'B', weight: 3 },
      { source: 'A', target: 'C', weight: 5 },
      { source: 'B', target: 'D', weight: 2 },
      { source: 'B', target: 'E', weight: 7 },
      { source: 'C', target: 'F', weight: 4 },
      { source: 'D', target: 'F', weight: 6 },
      { source: 'E', target: 'F', weight: 1 }
    ]
  },
  graphWeighted: false,
  log: [],
  history: [], // Undo snapshots
  
  // Dynamic Playback Engine States
  isPlaying: false,
  animationFrames: [], // { explanation, action, highlights, valSnapshot }
  currentFrameIdx: -1,
  activeExplanation: 'Select an operation to begin.',

  setTab: (tab) => set({ currentTab: tab }),
  setSpeed: (val) => set({ speed: val }),
  toggleWeighted: () => set(state => ({ graphWeighted: !state.graphWeighted })),

  // Set and start animations
  startAnimation: (frames) => {
    // Save state before animations start
    get().saveHistory();

    set({
      animationFrames: frames,
      currentFrameIdx: 0,
      isPlaying: false,
      activeExplanation: frames[0]?.explanation || ''
    });
    // Run the first frame action
    if (frames[0]?.action) {
      frames[0].action();
    }
  },

  nextStep: () => {
    const { animationFrames, currentFrameIdx } = get();
    if (currentFrameIdx >= animationFrames.length - 1) {
      set({ isPlaying: false });
      return;
    }
    const nextIdx = currentFrameIdx + 1;
    const nextFrame = animationFrames[nextIdx];
    if (nextFrame.action) nextFrame.action();
    set({
      currentFrameIdx: nextIdx,
      activeExplanation: nextFrame.explanation
    });
  },

  prevStep: () => {
    const { animationFrames, currentFrameIdx } = get();
    if (currentFrameIdx <= 0) return;
    const prevIdx = currentFrameIdx - 1;
    const prevFrame = animationFrames[prevIdx];
    
    // To go backward correctly, we apply the snapshot of that frame
    if (prevFrame.valSnapshot) {
      const tab = get().currentTab;
      if (tab === 'stack') set({ stack: prevFrame.valSnapshot });
      if (tab === 'queue') set({ queue: prevFrame.valSnapshot });
      if (tab === 'linkedList') set({ linkedList: prevFrame.valSnapshot });
      if (tab === 'bst') set({ bstNodes: prevFrame.valSnapshot });
      if (tab === 'graph') set({ graph: prevFrame.valSnapshot });
    }
    
    set({
      currentFrameIdx: prevIdx,
      activeExplanation: prevFrame.explanation
    });
  },

  resetAnimation: () => {
    const { animationFrames } = get();
    if (animationFrames.length === 0) return;
    const firstFrame = animationFrames[0];
    
    if (firstFrame.valSnapshot) {
      const tab = get().currentTab;
      if (tab === 'stack') set({ stack: firstFrame.valSnapshot });
      if (tab === 'queue') set({ queue: firstFrame.valSnapshot });
      if (tab === 'linkedList') set({ linkedList: firstFrame.valSnapshot });
      if (tab === 'bst') set({ bstNodes: firstFrame.valSnapshot });
      if (tab === 'graph') set({ graph: firstFrame.valSnapshot });
    }

    set({
      currentFrameIdx: 0,
      isPlaying: false,
      activeExplanation: firstFrame.explanation
    });
  },

  stopAnimation: () => {
    set({ isPlaying: false, animationFrames: [], currentFrameIdx: -1, activeExplanation: 'Select an operation to begin.' });
  },

  // Save history snapshot helper
  saveHistory: () => {
    const state = get();
    const snapshot = {
      stack: state.stack.map(n => ({...n})),
      queue: state.queue.map(n => ({...n})),
      linkedList: state.linkedList.map(n => ({...n})),
      bstNodes: state.bstNodes.map(n => ({...n})),
      graph: {
        nodes: state.graph.nodes.map(n => ({...n})),
        edges: state.graph.edges.map(e => ({...e}))
      }
    };
    set(state => {
      const updatedHistory = [...state.history, snapshot];
      if (updatedHistory.length > 50) updatedHistory.shift();
      return { history: updatedHistory };
    });
  },

  undo: () => {
    const state = get();
    if (state.history.length === 0) {
      state.addLog('ERROR', 'Nothing to undo.');
      return;
    }
    const updatedHistory = [...state.history];
    const previous = updatedHistory.pop();
    set({
      stack: previous.stack,
      queue: previous.queue,
      linkedList: previous.linkedList,
      bstNodes: previous.bstNodes,
      graph: previous.graph,
      history: updatedHistory
    });
    state.addLog('READY', 'Undo executed. Reverted to previous state.');
  },

  addLog: (tag, message, duration = null, subEntries = []) => {
    const time = new Date();
    const ms = String(time.getMilliseconds()).padStart(3, '0');
    const timestamp = `${time.toTimeString().split(' ')[0]}.${ms}`;
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp,
      tag,
      message,
      duration,
      subEntries
    };
    set(state => {
      const updatedLog = [...state.log, newLog];
      if (updatedLog.length > 50) updatedLog.shift();
      return { log: updatedLog };
    });
  },

  clearLog: () => set({ log: [] })
}));
