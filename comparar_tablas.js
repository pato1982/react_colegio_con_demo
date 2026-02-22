import fs from 'fs';

const sqlContent = fs.readFileSync('estructuras_tb.sql', 'utf8');
const tbContent = fs.readFileSync('54tb', 'utf8');

const sqlTables = [...sqlContent.matchAll(/-- \d+\.\s+(tb_\w+)/g)].map(m => m[1]);
const tbTables = [...tbContent.matchAll(/TABLA #\d+:\s*(tb_\w+)/g)].map(m => m[1]);

console.log('Tablas en SQL:', sqlTables.length);
console.log('Tablas en 54tb:', tbTables.length);

const missingInSql = tbTables.filter(t => !sqlTables.includes(t));
const missingInTb = sqlTables.filter(t => !tbTables.includes(t));

console.log('Faltan en SQL:', missingInSql);
console.log('Faltan en 54tb:', missingInTb);
