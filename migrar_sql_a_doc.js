import fs from 'fs';
import path from 'path';

const sqlPath = 'c:/Users/Telqway/Desktop/colegio-react/estructuras_tb.sql';
const docPath = 'c:/Users/Telqway/Desktop/colegio-react/docs/TABLAS_BASE_DATOS.md';

function parseSqlToMd() {
    if (!fs.existsSync(sqlPath)) {
        console.error('No se encuentra el archivo SQL');
        return;
    }

    const content = fs.readFileSync(sqlPath, 'utf8');
    const sections = content.split(/CREATE TABLE/g);

    // La primera sección es el header
    const header = sections.shift();

    let tables = [];

    // Regex para encontrar el nombre de la tabla en el bloque SQL o el comentario de arriba
    sections.forEach(section => {
        const tableMatch = section.match(/`?(tb_\w+)`?\s+\(/);
        if (tableMatch) {
            const tableName = tableMatch[1];
            // Reconstruimos el SQL agregando el CREATE TABLE que quitó el split
            const sql = 'CREATE TABLE' + section.split(';')[0] + ';';
            tables.push({ name: tableName, sql: sql.trim() });
        }
    });

    let markdown = `# Estructuras de Base de Datos - Portal Estudiantil\n\n`;
    markdown += `Este documento registra la estructura técnica de todas las tablas registradas en el proyecto.\n\n`;
    markdown += `*Actualizado automáticamente desde estructuras_tb.sql*\n\n---\n\n`;

    // Índice
    markdown += `## Índice de Tablas (${tables.length} tablas)\n\n`;
    tables.forEach((t, i) => {
        markdown += `${i + 1}. [${t.name}](#${t.name.toLowerCase().replace(/_/g, '-')})\n`;
    });
    markdown += `\n---\n\n`;

    // Detalles
    tables.forEach((t, i) => {
        markdown += `## ${i + 1}. ${t.name}\n\n`;
        markdown += `\`\`\`sql\n${t.sql}\n\`\`\`\n\n`;
        markdown += `**Uso:** Estructura técnica de la tabla \`${t.name}\`.\n\n`;
        markdown += `---\n\n`;
    });

    const dir = path.dirname(docPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(docPath, markdown);
    console.log(`✅ Documentación generada con ${tables.length} tablas en ${docPath}`);
}

parseSqlToMd();
