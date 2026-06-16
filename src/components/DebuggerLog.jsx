import { useEffect } from 'react';
import { useStore } from '../store';

const TypewriterLine = ({ line, isLast }) => {
  return (
    <div className="log-line-inner" style={{ display: 'flex', gap: '1rem', width: '100%' }} data-current={isLast}>
      <span className="log-time">[{line.timestamp}]</span>
      <span className={`log-tag ${line.tag.toLowerCase()}`}>{line.tag}</span>
      <span className="log-msg">-&gt; {line.message}</span>
      {line.duration && <span className="log-duration">[{line.duration}ms]</span>}
    </div>
  );
};

export const DebuggerLog = () => {
  const log = useStore(state => state.log);
  const clearLog = useStore(state => state.clearLog);

  useEffect(() => {
    const stream = document.querySelector('.log-stream');
    if (stream) {
      stream.scrollTop = stream.scrollHeight;
    }
  }, [log]);

  return (
    <div className="log-panel">
      <div className="log-header">
        <span className="log-header-title">Debugger Operation Log</span>
        <div className="log-actions">
          <button onClick={clearLog} style={{ padding: '3px 6px', fontSize: '9px' }}>Clear Log</button>
        </div>
      </div>
      <div className="log-stream">
        {log.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No operations logged.</div>
        ) : (
          log.map((line, idx) => (
            <div key={line.id} style={{ opacity: idx < log.length - 20 ? 0.35 : (idx < log.length - 5 ? 0.75 : 1) }}>
              <TypewriterLine
                line={line}
                isLast={idx === log.length - 1}
              />
              {line.subEntries && line.subEntries.map((sub, sIdx) => (
                <div key={sIdx} className="log-line sub-entry">
                  <span>{sIdx === line.subEntries.length - 1 ? '`-' : '+-'} {sub}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default DebuggerLog;
