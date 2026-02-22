const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/AsistenciaTab.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div/g) || []).length;

console.log(`Open divs: ${openDivs}`);
console.log(`Close divs: ${closeDivs}`);

const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;

console.log(`Open parens: ${openParens}`);
console.log(`Close parens: ${closeParens}`);

const openBraces = (content.match(/\{/g) || []).length;
const closeBraces = (content.match(/\}/g) || []).length;

console.log(`Open braces: ${openBraces}`);
console.log(`Close braces: ${closeBraces}`);
