const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'renderer', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let modifiedFiles = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  const newContent = content.replace(/<svg\s+([^>]+)>/g, (match, attrs) => {
    if (!attrs.includes('width=') && !attrs.includes('width :')) {
      modified = true;
      return `<svg width="24" height="24" ${attrs}>`;
    }
    return match;
  });

  const finalContent = newContent.replace(/<svg>/g, (match) => {
    modified = true;
    return `<svg width="24" height="24">`;
  });

  if (modified) {
    fs.writeFileSync(filePath, finalContent, 'utf8');
    modifiedFiles++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Modified ${modifiedFiles} files.`);
