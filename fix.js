const fs = require('fs'); 
const content = fs.readFileSync('src/renderer/css/fees.css'); 
let idx = content.indexOf(Buffer.from('#main-content', 'utf16le')); 
if (idx === -1) idx = content.indexOf(Buffer.from('\n#main-content', 'utf16le'));
if (idx === -1) idx = content.indexOf(Buffer.from('\r\n#main-content', 'utf16le'));
if (idx !== -1) { 
  fs.writeFileSync('src/renderer/css/fees.css', content.slice(0, idx)); 
  console.log('Fixed'); 
} else {
  console.log('Not found');
}
