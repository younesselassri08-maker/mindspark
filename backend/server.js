const Groq = require('groq-sdk');
const xlsx = require('xlsx');
require('dotenv').config();

// Initialisation de Groq avec ta nouvelle clé API
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Chargement de VOTRE DATASET en mémoire
console.log("Chargement de la base de données MindSpark...");
const workbook = xlsx.readFile('dataset.xlsx'); // On lit le fichier de base !
const sheet = workbook.Sheets["All_Categories"];
const mindsparkDataset = xlsx.utils.sheet_to_json(sheet);
console.log(`✅ ${mindsparkDataset.length} situations d'étudiants mémorisées !`);


const express = require('express');
// --- CALCULATEUR DASS-21 ---
function calculateDASS21(answers) {
    // Les réponses arrivent sous forme de tableau de 21 chiffres (0 à 3).
    // En programmation, la question 1 est à la position 0, la question 2 à la position 1, etc.
    
    let rawScores = { depression: 0, anxiety: 0, stress: 0 };

    // Index exacts selon le manuel DASS-21 (numéro de la question - 1)
    const depIndexes = [2, 4, 9, 12, 15, 16, 20]; // Dépression
    const anxIndexes = [1, 3, 6, 8, 14, 18, 19];  // Anxiété
    const strIndexes = [0, 5, 7, 10, 11, 13, 17]; // Stress

    // Addition des réponses
    depIndexes.forEach(i => rawScores.depression += answers[i]);
    anxIndexes.forEach(i => rawScores.anxiety += answers[i]);
    strIndexes.forEach(i => rawScores.stress += answers[i]);

    // Règle DASS-21 : Multiplier le score par 2
    const finalScores = {
        depression: rawScores.depression * 2,
        anxiety: rawScores.anxiety * 2,
        stress: rawScores.stress * 2
    };

    // Évaluation de la sévérité selon le tableau officiel
    const getSeverity = (score, type) => {
        if (type === 'depression') {
            if (score <= 9) return 'Normal';
            if (score <= 13) return 'Léger';
            if (score <= 20) return 'Modéré';
            if (score <= 27) return 'Sévère';
            return 'Extrêmement Sévère';
        }
        if (type === 'anxiety') {
            if (score <= 7) return 'Normal';
            if (score <= 9) return 'Léger';
            if (score <= 14) return 'Modéré';
            if (score <= 19) return 'Sévère';
            return 'Extrêmement Sévère';
        }
        if (type === 'stress') {
            if (score <= 14) return 'Normal';
            if (score <= 18) return 'Léger';
            if (score <= 25) return 'Modéré';
            if (score <= 33) return 'Sévère';
            return 'Extrêmement Sévère';
        }
    };

    return {
        scores: finalScores,
        severity: {
            depression: getSeverity(finalScores.depression, 'depression'),
            anxiety: getSeverity(finalScores.anxiety, 'anxiety'),
            stress: getSeverity(finalScores.stress, 'stress')
        }
    };
}
const cors = require('cors');
require('dotenv').config();

// Nouvelle syntaxe Firebase (plus moderne et robuste)
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// 1. On importe ta clé secrète
const serviceAccount = require('./serviceAccountKey.json');

// 2. On connecte le serveur à ton projet Firebase avec la nouvelle méthode
initializeApp({
  credential: cert(serviceAccount)
});

// 3. On prépare l'accès à la base de données
const db = getFirestore(); 

const app = express();

app.use(cors()); 
app.use(express.json()); 

// --- ROUTE DE TEST ---
app.get('/api/status', (req, res) => {
    res.json({ message: "Le serveur MindSpark est en ligne et connecté à Firebase ! 🔥" });
});

// --- ROUTE POUR L'INSCRIPTION (SIGNUP) ---
app.post('/api/signup', async (req, res) => {
    try {
        const userData = req.body; 

        // 1. Vérification si le nom d'utilisateur existe déjà
        const userRef = db.collection('users').doc(userData.username);
        const doc = await userRef.get();

        if (doc.exists) {
            return res.status(400).json({ error: "This username is already taken." });
        }

        const now = new Date(); // On capture l'instant précis de l'inscription

        // 2. Si le colis contient des réponses au DASS-21, on fait les calculs !
        if (userData.dassAnswers && userData.dassAnswers.length === 21) {
            const dassResults = calculateDASS21(userData.dassAnswers);
            
            // On ajoute les résultats officiels à la fiche de l'étudiant
            userData.dassScores = dassResults.scores;
            userData.dassSeverity = dassResults.severity;

            // 🌟 NOUVEAU : On crée le TOUT PREMIER point pour le graphique !
            const initialHistoryPoint = {
                date: now.toLocaleDateString(),
                depression: dassResults.scores.depression || 0,
                anxiety: dassResults.scores.anxiety || 0,
                stress: dassResults.scores.stress || 0
            };
            
            // On injecte ce point comme point de départ de l'historique
            userData.dassHistory = [initialHistoryPoint];
        } else {
            // Sécurité : s'il n'y a pas de test, on initialise un historique vide
            userData.dassHistory = []; 
        }

        // On déclenche le chronomètre des 7 jours immédiatement
        userData.lastDassUpdate = now.toISOString(); 

        // 3. Sauvegarde finale dans Firestore
        await userRef.set(userData);

        res.status(201).json({ message: "Account created and assessment successfully initialized!" });
    } catch (error) {
        console.error("Erreur lors de l'inscription :", error);
        res.status(500).json({ error: "Erreur serveur lors de la création du compte." });
    }
});

// Route pour vérifier si le nom d'utilisateur est disponible AVANT le DASS-21
// --- LE NOUVEAU PÉAGE ---
app.post('/api/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    const userRef = db.collection('users').doc(username);
    const doc = await userRef.get();
    
    if (doc.exists) {
      return res.status(400).json({ error: "This username is already taken." });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur check username:", error);
    res.status(500).json({ error: "Server error" });
  }
});




// --- ROUTE POUR LA CONNEXION (LOGIN) ---
app.post('/api/login', async (req, res) => {
    try {
        // On récupère ce que l'utilisateur a tapé sur la page de connexion
        const { username, password } = req.body; 

        // 1. On cherche ce nom d'utilisateur précis dans la base de données
        const userRef = db.collection('users').doc(username);
        const doc = await userRef.get();

        // 2. Si le document n'existe pas, c'est que le compte n'existe pas
        if (!doc.exists) {
            return res.status(404).json({ error: "This account does not exist. Please sign up." });
        }

        // 3. Si le compte existe, on vérifie le mot de passe
        const userData = doc.data(); // On lit les données enregistrées
        if (userData.password !== password) {
            return res.status(401).json({ error: "Incorrect password. Please try again." });
        }

        res.status(200).json({ 
            message: "Connexion réussie !", 
            user: {
                ...userData, // 👈 Récupère TOUT ce qui est dans Firestore (username, email, etc.)
                lastDassUpdate: userData.lastDassUpdate || null, // 👈 Ajoute null si ça n'existe pas
                dassHistory: userData.dassHistory || [] // 👈 Crée un tableau vide si l'historique n'existe pas
            } 
        });

    } catch (error) {
        console.error("Erreur lors de la connexion :", error);
        res.status(500).json({ error: "Erreur serveur lors de la connexion." });
    }
});

// --- ROUTE POUR METTRE À JOUR LE DASS-21 ---
app.put('/api/update-dass', async (req, res) => {
    try {
        const { username, dassAnswers } = req.body;
        const userRef = db.collection('users').doc(username);
        
        // 1. ON LIT L'UTILISATEUR POUR VÉRIFIER LA DATE
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.status(404).json({ error: "Utilisateur non trouvé." });
        }

        const userData = userDoc.data();
        const now = new Date();

        // 2. LA SÉCURITÉ : VÉRIFICATION DES 7 JOURS
        
        if (userData.lastDassUpdate) {
            const lastUpdate = new Date(userData.lastDassUpdate);
            const diffInTime = now.getTime() - lastUpdate.getTime();
            const diffInDays = diffInTime / (1000 * 3600 * 24);

            if (diffInDays < 7) {
                const daysLeft = Math.ceil(7 - diffInDays);
                return res.status(403).json({ 
                    error: `Please wait ${daysLeft} more days before updating your assessment.` 
                });
            }
        }
            
        
        // 3. On recalcule les nouveaux scores
        const dassResults = calculateDASS21(dassAnswers);
        const updateDate = now.toISOString(); 

        // 📡 RADAR : On affiche les scores dans le terminal pour voir leur vrai nom
        console.log("DEBUG SCORES :", dassResults.scores);

        // 🛡️ CODE ULTRA-SÉCURISÉ :
        const newHistoryPoint = {
            date: now.toLocaleDateString(),
            depression: dassResults?.scores?.depression ?? dassResults?.scores?.Depression ?? 0,
            anxiety: dassResults?.scores?.anxiety ?? dassResults?.scores?.Anxiety ?? 0,
            stress: dassResults?.scores?.stress ?? dassResults?.scores?.Stress ?? 0
        };

        // On récupère l'ancien historique 
        const currentHistory = userData.dassHistory || [];
        currentHistory.push(newHistoryPoint); 
        
        // ... (la suite reste identique avec await userRef.update(...) )
        // 4. On met à jour la base de données 
        await userRef.update({
            dassAnswers: dassAnswers,
            dassScores: dassResults.scores,
            dassSeverity: dassResults.severity,
            lastDassUpdate: updateDate,
            dassHistory: currentHistory, // 👈 On sauvegarde toute la courbe !

            // 🌟 LES NOUVEAUX VERROUS :
            therapySessionUsed: false,     // 🟢 Déverrouille la chambre pour cette semaine
            weeklySummaryGenerated: false
        });

        // 5. On renvoie la réponse
        res.status(200).json({
            message: "Report updated successfully!",
            dassScores: dassResults.scores,
            dassSeverity: dassResults.severity,
            lastDassUpdate: updateDate,
            dassHistory: currentHistory // 👈 On l'envoie au React
        });
    } catch (error) {
        console.error("Erreur de mise à jour :", error);
        res.status(500).json({ error: "Erreur serveur lors de la mise à jour." });
    }
});




// ROUTE POUR METTRE À JOUR LE PROFIL
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id; // Va récupérer 'youness.el.assri.594@gmail.com'
    const updatedData = req.body; // Va récupérer { name: "Ahmed AITALI" }

    // Mise à jour dans Firestore
    // Assure-toi que "users" est bien le nom de ta collection dans Firebase
    await db.collection('users').doc(userId).update(updatedData);

    res.status(200).json({ message: "Profil mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur backend lors de la mise à jour :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ==========================================
// 🧠 GESTION DES DISCUSSIONS (CHATS)
// ==========================================

// 💾 ROUTE POUR SAUVEGARDER L'HISTORIQUE DE LA THÉRAPIE
app.post('/api/saveTherapy', async (req, res) => {
    try {
        const { username, messages } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: "Username manquant" });
        }

        // On sauvegarde la discussion dans la fiche de l'utilisateur
        await db.collection('users').doc(username).set({
            therapyHistory: messages
        }, { merge: true }); // merge: true est très important, ça évite les crashs !
        
        res.json({ success: true });
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de la thérapie:", error);
        res.status(500).json({ error: "Impossible de sauvegarder la session." });
    }
});


// 1. Sauvegarder ou mettre à jour une discussion
app.post('/api/chats', async (req, res) => {
  try {
    // On récupère les infos envoyées par React
    const { chatId, username, title, messages } = req.body;

    const chatData = {
      username: username,
      title: title || "Nouvelle discussion",
      messages: messages,
      updatedAt: new Date().toISOString()
    };

    if (chatId) {
      // S'il y a déjà un ID, on met à jour la discussion existante
      await db.collection('chats').doc(chatId).set(chatData, { merge: true });
      res.json({ success: true, chatId: chatId });
    } else {
      // Sinon, on crée une toute nouvelle discussion dans Firebase
      chatData.createdAt = new Date().toISOString();
      const newChatRef = await db.collection('chats').add(chatData);
      res.json({ success: true, chatId: newChatRef.id });
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du chat:", error);
    res.status(500).json({ error: "Erreur serveur lors de la sauvegarde" });
  }
});


// 5. Renommer une discussion
app.put('/api/chats/:id/rename', async (req, res) => {
  try {
    const { title } = req.body;
    await db.collection('chats').doc(req.params.id).update({ title: title });
    res.json({ success: true });
  } catch (error) {
    console.error("Error renaming chat:", error);
    res.status(500).json({ error: "Error renaming chat" });
  }
});


// 3. Supprimer une discussion
app.delete('/api/chats/:id', async (req, res) => {
  try {
    await db.collection('chats').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// 4. Épingler / Désépingler une discussion
app.put('/api/chats/:id/pin', async (req, res) => {
  try {
    const { isPinned } = req.body;
    await db.collection('chats').doc(req.params.id).update({ 
      isPinned: isPinned 
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur d'épinglage:", error);
    res.status(500).json({ error: "Erreur lors de l'épinglage" });
  }
});

// 2. Récupérer tout l'historique d'un étudiant précis
app.get('/api/chats/:username', async (req, res) => {
  try {
    const username = req.params.username;
    
    // On cherche dans Firebase tous les chats qui appartiennent à cet étudiant
    const chatsSnapshot = await db.collection('chats')
      .where('username', '==', username)
      .get();

    const userChats = [];
    chatsSnapshot.forEach(doc => {
      userChats.push({ id: doc.id, ...doc.data() });
    });

    // On trie par updatedAt (la date de la dernière modification)
    userChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json(userChats);
  } catch (error) {
    console.error("Erreur lors de la récupération des chats:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération" });
  }
});
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🔥 NOUVELLE VERSION DU SERVEUR LANCÉE SUR LE PORT ${PORT} !`);
});





// --- ROUTE POUR LE CONSEILLER : RÉCUPÉRER TOUS LES ÉTUDIANTS ---
app.get('/api/users', async (req, res) => {
    try {
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        
        usersSnapshot.forEach(doc => {
            // On exclut le mot de passe pour des raisons de sécurité
            const { password, ...userData } = doc.data(); 
            users.push({ id: doc.id, ...userData });
        });

        res.status(200).json(users);
    } catch (error) {
        console.error("Erreur lors de la récupération des étudiants :", error);
        res.status(500).json({ error: "Erreur serveur lors de la récupération." });
    }
});



// Les 21 questions pour que le serveur puisse traduire les chiffres en texte pour l'IA
const dass21Questions = [
    "I found it hard to wind down", "I was aware of dryness of my mouth",
    "I couldn't seem to experience any positive feeling at all", "I experienced breathing difficulty",
    "I found it difficult to work up the initiative to do things", "I tended to over-react to situations",
    "I experienced trembling", "I felt that I was using a lot of nervous energy",
    "I was worried about situations in which I might panic", "I felt that I had nothing to look forward to",
    "I found myself getting agitated", "I found it difficult to relax",
    "I felt down-hearted and blue", "I was intolerant of anything that kept me from getting on",
    "I felt I was close to panic", "I was unable to become enthusiastic about anything",
    "I felt I wasn't worth much as a person", "I felt that I was rather touchy",
    "I was aware of the action of my heart in the absence of physical exertion", "I felt scared without any good reason",
    "I felt that life was meaningless"
];

app.post('/api/chat', async (req, res) => {
    try {
        // 🌟 On récupère le nouveau tableau dassAnswers envoyé par React
        const { studentMessage, category, severity, dimension, chatHistory, dassAnswers } = req.body;

        // 1. RECHERCHE DANS LE DATASET (Ton code RAG intact)
        const exemplesSimilaires = mindsparkDataset.filter(
            row => row.Category === category && row.Severity_Level === severity
        ).slice(0, 2);

        let datasetContext = "";
        if (exemplesSimilaires.length > 0) {
            datasetContext = "--- APPROVED PSYCHOLOGICAL ADVICE EXAMPLES ---\n";
            exemplesSimilaires.forEach((exemple, i) => {
                datasetContext += `Example ${i + 1} : For this exact issue, a recommended approach is: "${exemple.Chatbot_Response}"\n`;
            });
            datasetContext += "Use the essence of these examples to inspire your answer if the student asks for help, but adapt it naturally to the conversation.\n\n";
        }

        // 2. FORMATAGE DE L'HISTORIQUE DE CONVERSATION
        let formattedHistory = "";
        if (chatHistory && chatHistory.length > 0) {
            formattedHistory = "--- CONVERSATION HISTORY ---\n";
            const recentHistory = chatHistory.slice(-6); 
            recentHistory.forEach(msg => {
                const role = msg.sender === "user" ? "Student" : "MindSpark";
                formattedHistory += `${role}: ${msg.text}\n`;
            });
            formattedHistory += "-------------------------------------\n\n";
        }

        // 🌟 3. LE NOUVEAU CONTEXTE CLINIQUE ULTRA-PRÉCIS 🌟
        // On traduit le tableau de chiffres en phrases, et on filtre pour ne garder que les problèmes réels
        let symptomsContext = "";
        if (dassAnswers && dassAnswers.length === 21) {
            symptomsContext = "--- PATIENT SPECIFIC SYMPTOMS (Based on recent DASS-21 Assessment) ---\n";
            symptomsContext += "The patient recently rated the following specific symptoms (Scale 1 to 3, where 3 is severe):\n";
            
            let hasSymptoms = false;
            dass21Questions.forEach((question, index) => {
                const score = dassAnswers[index];
                if (score > 0) { // On ne montre à l'IA que les choses où l'étudiant a mis 1, 2 ou 3
                    symptomsContext += `- "${question}": Score ${score}/3\n`;
                    hasSymptoms = true;
                }
            });

            if (!hasSymptoms) {
                symptomsContext += "No specific symptoms reported.\n";
            }
            symptomsContext += "\nUse this highly specific knowledge to personalize your empathy and advice. (e.g., if they scored high on breathing difficulty, suggest breathing exercises). DO NOT list these symptoms to them like a robot, use them subtly to guide the conversation.\n\n";
        }

        // 4. CONSTRUCTION DU PROMPT FINAL
        let systemPrompt = `You are MindSpark, an empathetic psychological assistant for students.

PATIENT CONTEXT:
- Main issue detected: ${category} (${dimension})
- Global Severity: ${severity}

${symptomsContext}
${datasetContext}

CRUCIAL CONVERSATION RULES:
1. Be conversational and natural. Avoid long monologues.
2. If the student simply says "Hello", "Hi", or a short greeting: just reply with a warm greeting and ask how they are feeling. DO NOT GIVE ANY ADVICE at this stage.
3. Listen to them and use a gentle approach.
4. ALWAYS READ the conversation history below to remember what has already been discussed. Never repeat yourself.
5. NEVER COPY-PASTE THE APPROVED EXAMPLES. You must extract the core psychological technique from the examples and rephrase it completely in your own words.

${formattedHistory}`;

        // 5. APPEL GROQ API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: studentMessage }
            ],
            model: "openai/gpt-oss-120b",
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "";
        res.json({ reply: responseText });

    } catch (error) {
        console.error("Error with Groq AI:", error);
        res.status(500).json({ error: "I'm having trouble connecting to my servers right now." });
    }
});









const nodemailer = require('nodemailer');

// 🧠 MÉMOIRE TEMPORAIRE POUR LES CODES (Dans un vrai projet de production, on stockerait ça dans Firebase avec une date d'expiration)
const otpCache = new Map(); 

// 📧 CONFIGURATION DU SERVICE EMAIL (Exemple avec Gmail)
// Attention : Tu dois générer un "Mot de passe d'application" dans les paramètres de sécurité de ton compte Google.

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // 👈 On force l'adresse exacte au lieu de service: 'gmail'
    port: 587,              // 👈 Port de sécurité standard
    secure: false,           // 👈 Obligatoire pour le port 465
    auth: {
        user: process.env.SMTP_EMAIL, // 👈 Remplace par ton email
        pass: process.env.SMTP_PASSWORD // 👈 Remplace par ton mot de passe d'app
    },
    // 🌟 L'astuce magique qui empêche le blocage de ta box/antivirus :
    tls: {
        rejectUnauthorized: false 
    }
});

// 🚀 ROUTE 1 : GÉNÉRER ET ENVOYER LE CODE
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        // 1. Vérifier si l'email existe déjà dans Firestore (Optionnel mais recommandé)
        // const userSnapshot = await db.collection('users').where('email', '==', email).get();
        // if (!userSnapshot.empty) return res.status(400).json({ error: "Email already registered." });

        // 2. Générer un code à 6 chiffres
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 3. Sauvegarder le code temporairement (lié à l'email)
        otpCache.set(email, otpCode);

        // 4. Envoyer l'email
        await transporter.sendMail({
            from: '"MindSpark" <ton.email@gmail.com>',
            to: email,
            subject: "Your MindSpark Verification Code",
            text: `Your verification code is: ${otpCode}. Enter this code to continue your registration.`
        });

        res.json({ success: true, message: "Code sent successfully!" });
    } catch (error) {
        console.error("Erreur d'envoi OTP:", error);
        res.status(500).json({ error: "Failed to send verification code." });
    }
});

// 🔐 ROUTE 2 : VÉRIFIER LE CODE
app.post('/api/verify-otp', (req, res) => {
    const { email, code } = req.body;
    const storedCode = otpCache.get(email);

    if (storedCode && storedCode === code) {
        otpCache.delete(email); // On efface le code une fois utilisé
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Invalid or expired code." });
    }
});
