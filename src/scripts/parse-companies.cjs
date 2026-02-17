
const fs = require('fs');
const path = require('path');

// Hardcoded path to the input file
const inputFile = 'C:/Users/SR APOIO/OneDrive/Documents/Certificados Digitais/empresa.txt';
// Calculate absolute path for output relative to this script
const outputFile = path.join(__dirname, '../../supabase/migrations/20260210_import_companies.sql');

try {
    // Read file synchronously
    const content = fs.readFileSync(inputFile, 'utf-8');
    // Split by line and filter out empty lines
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    const values = [];

    lines.forEach((line) => {
        // Basic cleaning and pipe splitting
        const parts = line.split('|').map(p => p.trim());
        // Check if line has enough parts for CNPJ and Name
        if (parts.length < 2) return;

        // Parse CNPJ: remove label
        let cnpjRaw = parts[0].replace('CNPJ:', '').trim();
        // Remove dots, slashes, dashes to get pure numbers
        const cnpj = cnpjRaw.replace(/\D/g, '');

        // Parse Name: remove label
        let nome = parts[1].replace('Nome:', '').trim();
        // Escape single quotes for SQL
        nome = nome.replace(/'/g, "''");

        if (cnpj && nome) {
            values.push(`('${cnpj}', '${nome}')`);
        }
    });

    if (values.length > 0) {
        let sql = '-- Import Companies Data (CNPJ and Name only)\n';
        sql += 'INSERT INTO companies (cnpj, razao_social) VALUES\n';
        sql += values.join(',\n');
        // On conflict (duplicate CNPJ), update name
        sql += '\nON CONFLICT (cnpj) DO UPDATE SET \n';
        sql += '  razao_social = EXCLUDED.razao_social,\n';
        sql += '  updated_at = NOW();\n';

        fs.writeFileSync(outputFile, sql);
        console.log(`Successfully generated SQL file at ${outputFile}`);
    } else {
        console.log('No valid lines found to process.');
    }

} catch (err) {
    console.error('Error processing file:', err);
    process.exit(1);
}
