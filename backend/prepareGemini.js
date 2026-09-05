const xlsx = require('xlsx');
const fs = require('fs');

console.log("Lecture du fichier Excel pour Gemini en cours...");
const workbook = xlsx.readFile('dataset.xlsx'); 
const sheet = workbook.Sheets["All_Categories"];
const rawData = xlsx.utils.sheet_to_json(sheet);

const writeStream = fs.createWriteStream('gemini_training_data.csv');
// Les deux colonnes exactes demandées par Google AI Studio
writeStream.write('"Input","Output"\n');

let processedLines = 0;

rawData.forEach(row => {
    if (row.Student_Message && row.Chatbot_Response) {
        
        // On fusionne le contexte et le message pour que Gemini comprenne la situation
        const input = `Context: Student issue about '${row.Category}' (${row.Dimension}), Severity: '${row.Severity_Level}'.\nStudent Message: ${row.Student_Message}`;
        
        // Nettoyage des guillemets pour ne pas casser le format CSV
        const safeInput = input.replace(/"/g, '""');
        const safeOutput = row.Chatbot_Response.replace(/"/g, '""');

        writeStream.write(`"${safeInput}","${safeOutput}"\n`);
        processedLines++;
    }
});

writeStream.end();
console.log(`✅ Succès ! ${processedLines} lignes préparées et sauvegardées dans 'gemini_training_data.csv'.`);