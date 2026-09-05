const xlsx = require('xlsx');
const fs = require('fs');

console.log("Lecture du fichier Excel en cours...");

// 1. Lire le fichier Excel
// (Assure-toi que le nom correspond bien à ton fichier)
const workbook = xlsx.readFile('dataset.xlsx'); 

// 2. Récupérer l'onglet "All_Categories" (comme sur ta capture d'écran)
const sheetName = "All_Categories"; 
const sheet = workbook.Sheets[sheetName];

// 3. Convertir le tableau Excel en données lisibles par JavaScript
const rawData = xlsx.utils.sheet_to_json(sheet);

// 4. Préparer le fichier de sortie au format JSONL
const writeStream = fs.createWriteStream('mindspark_training_data.jsonl');
let processedLines = 0;

// 5. Transformer chaque ligne pour OpenAI
rawData.forEach(row => {
    // On vérifie que la ligne contient bien un message et une réponse
    if (row.Student_Message && row.Chatbot_Response) {
        
        // 🧠 LA MAGIE EST ICI : On crée un "System Prompt" dynamique pour chaque ligne
        // On injecte tes colonnes Category, Dimension et Severity_Level pour guider l'IA
        const systemPrompt = `You are MindSpark, an empathetic AI counseling assistant for students. The user is facing an issue related to '${row.Category}' (Specifically: ${row.Dimension}). The severity level is '${row.Severity_Level}'. Provide a supportive, therapeutic, and helpful response.`;

        // Le format exact exigé par OpenAI
        const jsonlRow = {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: row.Student_Message },
                { role: "assistant", content: row.Chatbot_Response }
            ]
        };

        // On écrit la ligne transformée dans le nouveau fichier
        writeStream.write(JSON.stringify(jsonlRow) + '\n');
        processedLines++;
    }
});

writeStream.end();
console.log(`✅ Succès ! ${processedLines} conversations ont été formatées et sauvegardées dans 'mindspark_training_data.jsonl'.`);