const fs = require('fs');
const css = `
#main-content[data-page="fees"] .pgn {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background: var(--white);
}

#main-content[data-page="fees"] .pgn-info {
  font-size: 13px;
  color: var(--t2);
  font-weight: 500;
}

#main-content[data-page="fees"] .pgn-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

#main-content[data-page="fees"] .pgn-btn {
  background: var(--white);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  min-width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--t2);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

#main-content[data-page="fees"] .pgn-btn:hover:not(.disabled):not(.active) {
  border-color: var(--purple);
  color: var(--purple);
  background: var(--purple-l);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.1);
}

#main-content[data-page="fees"] .pgn-btn.active {
  background: #7c3aed;
  border: 1px solid #7c3aed;
  color: #fff;
  box-shadow: 0 6px 14px -2px rgba(124, 58, 237, 0.4);
}

#main-content[data-page="fees"] .pgn-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

#main-content[data-page="fees"] .pgn-dots {
  color: var(--t3);
  font-size: 15px;
  padding: 0 2px;
  font-weight: 700;
}
`;
fs.appendFileSync('src/renderer/css/fees.css', css, 'utf8');
console.log('Done');
