const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../client/src/components');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace fetch(`${API_BASE}...`) with apiFetch('/...')
  content = content.replace(/fetch\(`\$\{API_BASE\}(.*?)(`[^)]*)\)/g, "apiFetch(`$1$2)");
  
  // Replace fetch(`...`) directly if API_BASE wasn't used but literal string
  // Wait, most files use fetch(`${API_BASE}/api/...`);
  
  // Also we need to import apiFetch
  if (!content.includes('apiFetch')) {
     content = content.replace(/import .*? solid-js['"];?/g, match => `${match}\nimport { apiFetch, API_BASE } from '../utils/api';`);
  }

  // Remove redundant API_BASE definitions
  content = content.replace(/const API_BASE = 'http:\/\/localhost:3000';\n*/g, '');

  fs.writeFileSync(filePath, content);
  console.log('Refactored', file);
});
