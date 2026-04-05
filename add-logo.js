const fs = require('fs');
const path = require('path');

const LOGO_SVG = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#C89D42" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.5rem;flex-shrink:0;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <path d="M8 14v-2"></path>
          <path d="M12 14v-5"></path>
          <path d="M16 14v-8"></path>
          <polyline points="5 13 9 9 12 11 17 5"></polyline>
          <polyline points="13 5 17 5 17 9"></polyline>
        </svg>
`;

const NEW_BRAND_HTML = `<a href="index.html" class="nav-brand" style="display:flex;align-items:center;">${LOGO_SVG}SkillBridge</a>`;

const dir = process.cwd();
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // We look for the exact string or something very close to it
  const match = content.match(/<a href="index\.html" class="nav-brand">SkillBridge<\/a>/);
  if (match) {
    content = content.replace(match[0], NEW_BRAND_HTML);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`Skipped ${file} (no match)`);
  }
});
