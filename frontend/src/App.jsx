import { useState, useEffect, useRef } from 'react';
import './App.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';



function App() {

  const [messages, setMessages] = useState([
    { text: "Hello, I am MindSpark, your AI counseling assistant. How can I help you today?", sender: "bot" }
  ]);
  const [page, setPage] = useState(localStorage.getItem('mindspark_page') || 'login');

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); // Va stocker l'étudiant connecté

  // --- ÉTATS POUR LE CONSEILLER ---
  const [showCounsellorModal, setShowCounsellorModal] = useState(false);
  const [counsellorUsername, setCounsellorUsername] = useState('');
  const [counsellorPassword, setCounsellorPassword] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);



  

  // --- ÉTAT POUR LES ALERTES GÉNÉRIQUES (INSCRIPTION, DASS-21, ETC.) ---
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', isSuccess: false });

  // Petite fonction magique pour remplacer les "alert()" partout dans ton code :
  const showAlert = (title, message, isSuccess = false) => {
    setAlertModal({ isOpen: true, title, message, isSuccess });
  };


  // --- ÉTATS POUR LES BOÎTES DE DIALOGUE (MODALS) ---
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, chatId: null });
  const [renameModal, setRenameModal] = useState({ isOpen: false, chatId: null, currentTitle: '', newTitle: '' });

  // --- MÉMOIRE POUR LE DASS-21 ---
  const [signupStep, setSignupStep] = useState(1); // Étape 1 (Infos) ou 2 (DASS-21)
  const [dassAnswers, setDassAnswers] = useState(Array(21).fill(""));

  // --- MÉMOIRE POUR LE MENU PARAMÈTRES ---
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editModal, setEditModal] = useState({ isOpen: false, id: '', label: '', value: '', type: '', options: [] });






  // --- ÉTATS POUR LA FENÊTRE OTP (VÉRIFICATION EMAIL) ---
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [otpError, setOtpError] = useState(""); // 🌟 NOUVEAU : Pour afficher l'erreur en direct
  // 1. Fonction pour ENVOYER l'email et OUVRIR la fenêtre
  // (À attacher au bouton "Next / Passer au questionnaire" de ta 1ère page d'inscription)
  const handleProceedToDass21 = async () => {
      console.log("1. Tentative d'envoi de l'OTP à :", formData.username);
      setIsSendingOtp(true);

      try {
          const response = await fetch('http://localhost:5001/api/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.username }) // 👈 CORRECTION ICI
          });
          
          if (response.ok) {
              console.log("2. OTP envoyé avec succès ! Ouverture du Popup.");
              setShowOtpModal(true); // 🟢 ON OUVRE LA FENÊTRE POPUP !
          } else {
              const data = await response.json();
              console.log("2. Erreur d'envoi OTP :", data.error);
              showAlert("Error", data.error, false);
          }
      } catch (error) {
          console.error("Erreur serveur lors de l'OTP :", error);
          showAlert("Error", "Could not reach the server.", false);
      }
      setIsSendingOtp(false);
  };

  // 2. Fonction pour VÉRIFIER le code dans la fenêtre
  const handleVerifyOtp = async () => {
      setOtpError(""); // On efface les anciennes erreurs au moment de cliquer
      
      try {
          const response = await fetch('http://localhost:5001/api/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.username, code: otpCode })
          });
          
          if (response.ok) {
              setShowOtpModal(false); 
              setOtpCode(""); // On nettoie le code
              setSignupStep(2); // ➡️ ON PASSE AU DASS-21
          } else {
              // 🟢 CORRECTION : On affiche l'erreur DANS le popup, sans utiliser showAlert
              setOtpError("Invalid code. Please try again.");
          }
      } catch (error) {
          setOtpError("Could not reach the server.");
      }
  };





  // --- ÉTATS POUR LA SALLE DE THÉRAPIE DE L'ÉTUDIANT ---
  const [showStudentTherapyRoom, setShowStudentTherapyRoom] = useState(false);
  const [therapyMessages, setTherapyMessages] = useState([]);
  const [therapyInput, setTherapyInput] = useState("");
  const therapyEndRef = useRef(null);

  // Auto-scroll pour la thérapie
  useEffect(() => {
      therapyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [therapyMessages]);
  // 🚪 Fonction pour OUVRIR la salle et forcer l'IA à analyser la semaine
  // 🚪 1. OUVRIR LA CHAMBRE ET RÉCUPÉRER (OU LANCER) LA SÉANCE
  // 🚪 OUVRIR LA CHAMBRE (AVEC CONTEXTE HISTORIQUE ET VERROUS)
  // 🚪 OUVRIR LA CHAMBRE (SÉCURISÉ)
  const handleOpenTherapyRoom = async () => {
      setShowStudentTherapyRoom(true);

      // 🛡️ SÉCURITÉ ANTI-CRASH : Si l'utilisateur n'est pas encore chargé, on arrête tout
      if (!currentUser) return;


      // 🛑 LE GARDE-FRONTIÈRE : Si les 7 jours sont passés, on bloque le résumé de l'IA !
      if (canUpdateDass()) {
          setTherapyMessages(currentUser.therapyHistory || []);
          return; // On arrête la fonction ici !
      }

      // Le "!" accepte les nouveaux étudiants dont les variables sont encore vides
      const isUnlocked = !currentUser.therapySessionUsed;
      const needsSummary = !currentUser.weeklySummaryGenerated;

      // 1. SI LA SÉANCE EST DÉVERROUILLÉE ET A BESOIN DU NOUVEAU RÉSUMÉ DE L'IA
      if (isUnlocked && needsSummary) {
          
          const historyData = JSON.stringify(currentUser.dassHistory || []);
          const loadingMsg = { text: "MindSpark is analyzing your DASS-21 scores to prepare your session...", sender: "bot" };
          
          setTherapyMessages([...(currentUser.therapyHistory || []), loadingMsg]);

          // 🌟 NOUVEAU : On vérifie si c'est la toute première séance
          const isFirstSession = !currentUser.dassHistory || currentUser.dassHistory.length <= 1;
          
          let aiSystemPrompt = "";
          if (isFirstSession) {
              aiSystemPrompt = `SYSTEM COMMAND: This is the student's VERY FIRST therapy session. DO NOT talk about previous weeks. Welcome them warmly to their first session. Based on the DASS-21 context provided, EXPLICITLY detail the specific dimensions (Depression, Anxiety, or Stress) and symptoms they are struggling with the most right now. Validate their feelings, and ask a gentle open-ended question to start.`;
          } else {
              aiSystemPrompt = `SYSTEM COMMAND: The student just completed a new weekly DASS-21 assessment. Here is their progress history over time: ${historyData}. Compare their newest scores with previous weeks. Give a warm summary of their evolution. You MUST explicitly detail the specific DASS dimensions or symptoms they are STILL struggling with the most this week. Acknowledge their progress or struggles, and ask an open-ended question to start.`;
          }

          try {
              const iaResponse = await fetch('http://localhost:5001/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      studentMessage: aiSystemPrompt, // 👈 On utilise le prompt intelligent !
                      chatHistory: currentUser.therapyHistory || [],
                      category: currentUser?.dassSeverity?.stress || "Normal",
                      severity: currentUser?.dassSeverity?.depression || "Normal",
                      dimension: "Weekly Check-in",
                      dassAnswers: currentUser?.dassAnswers || []
                  })
              });
              
              // ... le reste de la fonction reste identique (const data = await iaResponse.json(); etc...)
              
              const data = await iaResponse.json();
              const newSummaryMessage = { text: data.reply, sender: "bot" };
              
              const updatedMessages = [...(currentUser.therapyHistory || []), newSummaryMessage];
              setTherapyMessages(updatedMessages);

              fetch('http://localhost:5001/api/saveTherapy', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: currentUser.username, messages: updatedMessages })
              });

              fetch(`http://localhost:5001/api/users/${currentUser.username}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ weeklySummaryGenerated: true })
              });

              setCurrentUser(prev => ({ ...prev, therapyHistory: updatedMessages, weeklySummaryGenerated: true }));

          } catch (error) {
              console.error("Erreur IA initiale:", error);
          }
      } 
      // 2. SINON -> LECTURE SEULE
      else {
          setTherapyMessages(currentUser.therapyHistory || []);
      }
  };

  // ✉️ 2. ENVOYER UN MESSAGE ET SAUVEGARDER
  const sendTherapyMessage = async () => {
      if (therapyInput.trim() === '') return;
      
      const userText = therapyInput;
      const tempMessages = [...therapyMessages, { text: userText, sender: "user" }];
      
      setTherapyMessages(tempMessages);
      setTherapyInput("");

      try {
          const iaResponse = await fetch('http://localhost:5001/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  studentMessage: userText,
                  chatHistory: tempMessages, // L'IA se souvient de toute la discussion
                  category: currentUser?.dassSeverity?.stress || "Normal",
                  severity: currentUser?.dassSeverity?.depression || "Normal",
                  dimension: "Weekly Therapy Session",
                  dassAnswers: currentUser?.dassAnswers || []
              })
          });
          const data = await iaResponse.json();
          const finalMessages = [...tempMessages, { text: data.reply, sender: "bot" }];
          
          setTherapyMessages(finalMessages);

          // 💾 SAUVEGARDE COMPLÈTE DE LA DISCUSSION DANS FIREBASE
          fetch('http://localhost:5001/api/saveTherapy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: currentUser.username, messages: finalMessages })
          });
          
          setCurrentUser(prev => ({ ...prev, therapyHistory: finalMessages }));

      } catch (error) {
          console.error("Error AI:", error);
      }
  };


  
  const messagesEndRef = useRef(null);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    
    // Ce useEffect a le droit d'exister ici, car "messages" a bien été déclaré au-dessus !
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

  
  useEffect(() => {
    const savedUserData = localStorage.getItem('mindspark_user');
    const savedPage = localStorage.getItem('mindspark_page');

    // 🌟 LA NOUVELLE RÈGLE COUPE-CIRCUIT EST ICI :
    // Si on rafraîchit alors qu'on est sur la page login (ou si c'est la première visite)
    if (!savedPage || savedPage === 'login') {
      localStorage.removeItem('mindspark_user'); // On détruit l'ancien utilisateur fantôme
      setIsCheckingSession(false);
      setPage('login'); // On force l'application à rester ici
      return; // On arrête tout, pas de connexion automatique !
    }
      
  


    if (savedUserData) {
      try {
        const parsedUser = JSON.parse(savedUserData);
        setCurrentUser(parsedUser);

        const fetchHistoryOnLoad = async () => {
          try {
            const chatRes = await fetch(`http://localhost:5001/api/chats/${parsedUser.username}`);
            const chats = await chatRes.json();
            
            setChatHistory(chats); 
            setMessages([{ text: "Hello, I am MindSpark. How can I help you today?", sender: "bot" }]);
            setCurrentChatId(null); 
            
            // On le remet exactement sur la page où il était (dashboard, chat, etc.)
            setPage(savedPage); 
            
          } catch (error) {
            console.error("Erreur historique:", error);
            setChatHistory([]);
            setMessages([{ text: "Hello, I am MindSpark. How can I help you today?", sender: "bot" }]);
            setCurrentChatId(null);
            
            setPage(savedPage); 
          } finally {
            setIsCheckingSession(false); 
          }
        };

        fetchHistoryOnLoad();
      } catch (parseError) {
        console.error("Format invalide, nettoyage...", parseError);
        localStorage.removeItem('mindspark_user');
        setIsCheckingSession(false);
        setPage('login');
      }
    } else {
      setIsCheckingSession(false);
    }
  }, []);






  // 🌟 NOUVEAU : Sauvegarde la page actuelle dans le navigateur
  useEffect(() => {
    localStorage.setItem('mindspark_page', page);
  }, [page]);
  

  // --- MÉMOIRE POUR LE DASHBOARD ET LA MODIFICATION ---
  const [isEditingDass, setIsEditingDass] = useState(false);
  const [editDassAnswers, setEditDassAnswers] = useState(Array(21).fill(0));


  const [chatHistory, setChatHistory] = useState([]); // Stocke la liste des anciennes discussions pour la sidebar
  const [currentChatId, setCurrentChatId] = useState(null); // Garde en mémoire l'ID de la discussion actuelle


  // Les 21 questions officielles en anglais
  const dass21Questions = [
    "I found it hard to wind down",
    "I was aware of dryness of my mouth",
    "I couldn't seem to experience any positive feeling at all",
    "I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)",
    "I found it difficult to work up the initiative to do things",
    "I tended to over-react to situations",
    "I experienced trembling (e.g. in the hands)",
    "I felt that I was using a lot of nervous energy",
    "I was worried about situations in which I might panic and make a fool of myself",
    "I felt that I had nothing to look forward to",
    "I found myself getting agitated",
    "I found it difficult to relax",
    "I felt down-hearted and blue",
    "I was intolerant of anything that kept me from getting on with what I was doing",
    "I felt I was close to panic",
    "I was unable to become enthusiastic about anything",
    "I felt I wasn't worth much as a person",
    "I felt that I was rather touchy",
    "I was aware of the action of my heart in the absence of physical exertion (e.g. sense of heart rate increase, heart missing a beat)",
    "I felt scared without any good reason",
    "I felt that life was meaningless"
  ];
  
  const [formData, setFormData] = useState({
    name: '', dob: '', age: '', idNumber: '', religion: '', 
    race: '', gender: '', college: '', address: '', 
    username: '', password: ''
  });

  const [chatInput, setChatInput] = useState('');
  
  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  

  const handleUpdateDass = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/update-dass', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          dassAnswers: editDassAnswers
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // On met à jour l'affichage en direct avec les nouveaux scores
        setCurrentUser({
          ...currentUser,
          dassAnswers: editDassAnswers,
          dassScores: data.dassScores,
          dassSeverity: data.dassSeverity,
          lastDassUpdate: data.lastDassUpdate,
          dassHistory: data.dassHistory,
          therapySessionUsed: false,        // 🟢 On déverrouille le "Speak"
          weeklySummaryGenerated: false     // 🤖 On autorise l'IA à parler
        });
        setIsEditingDass(false); // On ferme le mode édition
        
        // 🌟 LA MAGIE OPÈRE ICI :
        showAlert("Succès", "📊 " + data.message, true);
        
      } else {
        // Au cas où le serveur renvoie une erreur (ex: mauvais format)
        showAlert("Erreur", data.error || "Impossible de mettre à jour le bilan.", false);
      }
    } catch (error) {
      console.error("Erreur :", error);
      // Au cas où le serveur est planté ou inaccessible
      showAlert("Erreur de connexion", "Impossible de joindre le serveur.", false);
    }
  };
   


  // Fonction pour envoyer les données d'inscription au backend
  const handleSignup = async () => {
    try {
      // On envoie un colis (POST) à l'adresse de ton serveur
      const response = await fetch('http://localhost:5001/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,           // Ça, c'est ta fiche d'infos
          dassAnswers: dassAnswers // 🚨 VÉRIFIE QUE CETTE LIGNE EST BIEN LÀ !
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showAlert("Account Created", data.message, true);
        setPage('login'); // Redirige automatiquement vers la page de connexion
      } else {
        showAlert("Signup Error", data.error || "An error occurred", false)
      }
    } catch (error) {
      console.error("Erreur de connexion au serveur:", error);
      showAlert("Connection Error", "Cannot connect to server. Please check if it is running.", false);
    }
  };

  // Fonction pour envoyer les données de connexion au backend
  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           username: formData.username,
           password: formData.password,
           dassAnswers: dassAnswers
        }), 
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentUser(data.user); 


        localStorage.setItem('mindspark_user', JSON.stringify(data.user));

        // ====================================================
        // RÉCUPÉRATION DE L'HISTORIQUE
        // ====================================================
        try {
          const chatRes = await fetch(`http://localhost:5001/api/chats/${data.user.username}`);
          const chats = await chatRes.json();
          
          // 1. On donne tout l'historique à la Sidebar pour qu'elle l'affiche
          setChatHistory(chats); 
          
          // 2. 🚨 LE CHANGEMENT EST ICI : On force TOUJOURS une nouvelle discussion à l'écran
          setMessages([{ text: "Hello, I am MindSpark. How can I help you today?", sender: "bot" }]);
          setCurrentChatId(null); 
          
        } catch (error) {
          console.error("Erreur récupération historique:", error);
          // Sécurité anti-crash
          setChatHistory([]);
          setMessages([{ text: "Hello, I am MindSpark. How can I help you today?", sender: "bot" }]);
          setCurrentChatId(null);
        }
        // ====================================================

        setChatInput(""); 
        setPage('chat');  
      } else {
        showAlert("Login Failed", data.error || "Invalid credentials", false);
      }
    } catch (error) {
      console.error("Erreur de connexion au serveur:", error);
      alert("❌ Impossible de se connecter au serveur.");
    }
  };




  // Fonction de connexion pour le Conseiller (Counsellor)
  const handleCounsellorLogin = async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page
    
    if (counsellorUsername === "Counsellor_UNITEN" && counsellorPassword === "MindSpark_UNITEN") {
      try {
        // On télécharge la liste de tous les étudiants depuis ton backend
        const res = await fetch('http://localhost:5001/api/users');
        const data = await res.json();
        
        setAllStudents(data); // On sauvegarde les étudiants
        setShowCounsellorModal(false); // On ferme la pop-up
        setPage('counsellor'); // On ouvre la page du conseiller
        setCounsellorPassword(''); // On vide le mot de passe par sécurité
      } catch (err) {
        console.error("Erreur récupération étudiants:", err);
        showAlert("Erreur", "Impossible de charger la liste des étudiants.", false);
      }
    } else {
      showAlert("Access Denied", "Invalid Counsellor Credentials!", false);
    }
  };




  // Fonction pour vérifier le pseudo et passer à l'étape 2
  const handleNextStep = async (e) => {
    // On empêche le rechargement accidentel de la page
    if (e) e.preventDefault(); 

    try {
      const response = await fetch('http://localhost:5001/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username })
      });
      
      const data = await response.json();

      if (response.ok) {
        // 🟢 L'email est libre, on lance TON OTP !
          handleProceedToDass21();
      } else {
        // ❌ LE PSEUDO EST PRIS : On affiche l'alerte
        showAlert("Signup Error", data.error, false);
      }
    } catch (error) {
      // 🚨 Ce "catch" attrapera les vraies erreurs de serveur (si node server.js est éteint)
      console.error("Erreur serveur:", error);
      showAlert("Connection Error", "Cannot connect to server. Please check your backend.", false);
    }
  };
     


  

  // 1. On ouvre juste les Modals quand on clique sur les boutons
  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, chatId });
  };

  const renameChat = (chatId, currentTitle, e) => {
    e.stopPropagation();
    setRenameModal({ isOpen: true, chatId, currentTitle, newTitle: currentTitle });
  };

  // 2. La vraie fonction qui s'active quand on clique sur "Delete" dans le Modal
  const confirmDeleteChat = async () => {
    const { chatId } = deleteModal;
    try {
      const res = await fetch(`http://localhost:5001/api/chats/${chatId}`, { method: 'DELETE' });
      if (res.ok) {
        setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
        if (currentChatId === chatId) {
          setCurrentChatId(null);
          setMessages([{ text: "Hello, I am MindSpark. How can I help you today?", sender: "bot" }]);
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
    setDeleteModal({ isOpen: false, chatId: null }); // On ferme le Modal
  };

  // 3. La vraie fonction qui s'active quand on clique sur "Save" dans le Modal
  const confirmRenameChat = async () => {
    const { chatId, currentTitle, newTitle } = renameModal;
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle || trimmedTitle === currentTitle) {
      setRenameModal({ isOpen: false, chatId: null, currentTitle: '', newTitle: '' });
      return;
    }

    try {
      const res = await fetch(`http://localhost:5001/api/chats/${chatId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle })
      });
      
      if (res.ok) {
        setChatHistory(prev => prev.map(chat => 
          chat.id === chatId ? { ...chat, title: trimmedTitle } : chat
        ));
      }
    } catch (error) {
      console.error("Error renaming chat:", error);
    }
    setRenameModal({ isOpen: false, chatId: null, currentTitle: '', newTitle: '' }); // On ferme le Modal
  };



  const togglePinChat = async (chatId, currentPinStatus, e) => {
    e.stopPropagation();
    try {
      const newPinStatus = !currentPinStatus;
      await fetch(`http://localhost:5001/api/chats/${chatId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinStatus })
      });
      
      // On met à jour l'état local pour que l'icône change tout de suite
      setChatHistory(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, isPinned: newPinStatus } : chat
      ));
    } catch (error) {
      console.error("Erreur lors de l'épinglage :", error);
    }
  };

  // =========================================================
  // PAGE : CHATBOT (DESIGN GEMINI SIDEBAR - PLEIN ÉCRAN)
  // =========================================================
  if (page === 'chat') {
    const sendMessage = async () => {
    if (chatInput.trim() === '') return;

    // 1. On capture le message de l'utilisateur
    const userText = chatInput;
    const newUserMessage = { text: userText, sender: "user" };
    
    // 2. (Optionnel mais recommandé) On affiche tout de suite le message de l'utilisateur 
    // à l'écran pour qu'il n'ait pas l'impression que l'application "freeze" pendant que l'IA réfléchit
    setMessages(prev => [...prev, newUserMessage]);
    setChatInput(""); // On vide la barre de saisie instantanément

    try {
      // ==========================================
      // 🧠 LE CERVEAU MINDSPARK (L'appel à l'IA)
      // ==========================================
      const iaResponse = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentMessage: userText,
          // (À terme, tu pourras rendre ces 3 variables dynamiques selon le test de l'étudiant)
          chatHistory: messages,
          category: "Stress", 
          severity: "Mild",
          dimension: "Difficulty winding down / relaxing",
          // 🌟 NOUVEAU : On transmet le diagnostic complet à l'IA !
          dassAnswers: currentUser?.dassAnswers || []
        })
      });

      const iaData = await iaResponse.json();
      
      // Si l'IA a répondu, on prend son texte, sinon on met un message de secours
      const botText = iaData.reply ? iaData.reply : "I'm sorry, I'm having trouble connecting to my servers right now.";
      
      // On crée le VRAI message du bot
      const newBotMessage = { text: botText, sender: "bot" };
      
      // On crée la liste finale contenant le message de l'étudiant ET la réponse de l'IA
      const newDiscussionList = [...messages, newUserMessage, newBotMessage];
      
      // On met à jour l'écran avec la réponse de l'IA
      setMessages(newDiscussionList);

      // ==========================================
      // 🛡️ TA LOGIQUE DE SAUVEGARDE (Intacte)
      // ==========================================
      let chatTitle = "Nouvelle discussion";
      
      if (currentChatId) {
        // Cas A : La discussion existe déjà
        const existingChat = chatHistory.find(c => c.id === currentChatId);
        if (existingChat) chatTitle = existingChat.title;
      } else if (newDiscussionList.length > 1) {
        // Cas B : C'est une toute nouvelle discussion
        chatTitle = newDiscussionList[1].text.substring(0, 25) + "...";
      }

      const res = await fetch('http://localhost:5001/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: currentChatId, 
          username: currentUser.username, 
          title: chatTitle,
          messages: newDiscussionList
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (!currentChatId) {
          setCurrentChatId(data.chatId);
          
          setChatHistory(prev => {
            const alreadyExists = prev.some(chat => chat.id === data.chatId);
            if (alreadyExists) {
              return prev.map(chat => chat.id === data.chatId ? { ...chat, messages: newDiscussionList, title: chatTitle } : chat);
            }
            return [{
              id: data.chatId,
              title: chatTitle,
              messages: newDiscussionList,
              isPinned: false
            }, ...prev];
          });
        } else {
          setChatHistory(prev => prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: newDiscussionList, title: chatTitle }
              : chat
          ));
        }
      }
      
    } catch (error) {
      console.error("🚨 Erreur lors de la sauvegarde ou de l'appel IA :", error);
    }
  };


      
         





    // On formate le nom d'affichage. 
    // Ex: "Youness.ELASSRI@..." devient "Youness ELASSRI"
  const displayName = currentUser && currentUser.username 
       ? currentUser.username.split('@')[0].replace('.', ' ') 
       : 'Étudiant';

    // On récupère la première lettre pour l'avatar
  const initial = displayName.charAt(0).toUpperCase();

    // On récupère le nom du College saisi dans le formulaire (ou 'College' par défaut)
    // (Assure-toi que "college" correspond au nom de la variable dans ton formData)
  const collegeName = currentUser && currentUser.college ? currentUser.college : 'College';

    return (

      <div style={styles.geminiLayout}>

      


        {/* ========================================= */}
      {/* 🛡️ MODALS (BOÎTES DE DIALOGUE MODERNES)  */}
      {/* ========================================= */}

      {/* MODAL DE SUPPRESSION */}
      {deleteModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', width: '340px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: '#202124', fontSize: '18px', fontWeight: '600' }}>Delete Chat</h3>
            <p style={{ margin: 0, color: '#5f6368', fontSize: '14px', lineHeight: '1.5' }}>Are you sure you want to delete this chat? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setDeleteModal({ isOpen: false, chatId: null })} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f3f4', color: '#3c4043', fontWeight: '500', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteChat} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#d93025', color: '#fff', fontWeight: '500', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RENOMMAGE */}
      {renameModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', width: '340px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: 0, color: '#202124', fontSize: '18px', fontWeight: '600' }}>Rename Chat</h3>
            <input 
              autoFocus
              type="text" 
              value={renameModal.newTitle} 
              onChange={(e) => setRenameModal({ ...renameModal, newTitle: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && confirmRenameChat()} // Permet de valider avec la touche Entrée
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #dadce0', fontSize: '15px', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setRenameModal({ isOpen: false, chatId: null, currentTitle: '', newTitle: '' })} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f3f4', color: '#3c4043', fontWeight: '500', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmRenameChat} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#1a73e8', color: '#fff', fontWeight: '500', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
        
        {/* --- SIDEBAR GAUCHE (Historique & Profil) --- */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTop}>

            <button 
  style={styles.newChatBtn} 
  onClick={() => {
    // 1. On remet le message de bienvenue du bot
    setMessages([{ text: "Hello, I am MindSpark. How can I help you today?", sender: "bot" }]);
    
    // 2. On vide la barre d'écriture
    setChatInput(""); 
    
    // 3. 🚨 LA LIGNE QUI TE MANQUAIT : On efface la mémoire de l'ancienne discussion !
    setCurrentChatId(null); 
  }}
>
  {/* The SVG "Compose" Icon */}
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>

  New Chat
</button>


{/* 🌟 LE BOUTON THERAPY ROOM RENDU ÉLÉGANT 🌟 */}
            <button
                onClick={handleOpenTherapyRoom}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: '#e8f0fe', // Un bleu pastel très doux (style Google)
                    color: '#004b87', // Le même bleu foncé que ton logo
                    border: '1px solid #c2d7fa', // Bordure subtile
                    padding: '12px 20px',
                    borderRadius: '30px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%',
                    marginTop: '0px',
                    marginBottom: '20px', // Donne l'espace parfait avant le mot "Recent"
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 75, 135, 0.05)'
                }}
                onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#d2e3fc';
                    e.target.style.boxShadow = '0 2px 6px rgba(0, 75, 135, 0.15)';
                }}
                onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#e8f0fe';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 75, 135, 0.05)';
                }}
            >
                {/* Icône SVG professionnelle et minimaliste (Cœur clinique) */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                </svg>
                Weekly Therapy
            </button>

          </div>
          
          {/* --- SECTION HISTORIQUE DES DISCUSSIONS (TRADUITE) --- */}
<div style={{ marginTop: '20px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
  
  {/* Catégorie : Pinned */}
  {chatHistory.filter(chat => chat.isPinned).length > 0 && (
    <>
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#5f6368', marginBottom: '10px', paddingLeft: '10px' }}>
        Pinned
      </div>
      {chatHistory.filter(chat => chat.isPinned).map(chat => (
        <ChatItem 
          key={chat.id} 
          chat={chat} 
          currentChatId={currentChatId} 
          setMessages={setMessages} 
          setCurrentChatId={setCurrentChatId}
          togglePinChat={togglePinChat}
          deleteChat={deleteChat}
          renameChat={renameChat} // 👈 On passe la fonction ici
        />
      ))}
      <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '15px 0' }} />
    </>
  )}

  {/* Catégorie : Recent */}
  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#5f6368', marginBottom: '10px', paddingLeft: '10px' }}>
    Recent
  </div>
  {chatHistory.filter(chat => !chat.isPinned).length === 0 ? (
    <div style={{ paddingLeft: '10px', fontSize: '12px', color: '#9aa0a6', fontStyle: 'italic' }}>
      No recent chats
    </div>
  ) : (
    chatHistory.filter(chat => !chat.isPinned).map(chat => (
      <ChatItem 
        key={chat.id} 
        chat={chat} 
        currentChatId={currentChatId} 
        setMessages={setMessages} 
        setCurrentChatId={setCurrentChatId}
        togglePinChat={togglePinChat}
        deleteChat={deleteChat}
        renameChat={renameChat} // 👈 Et ici aussi
      />
    ))
  )}
</div>
  
  
     

           {/* ========================================== */}
        {/* ZONE PROFIL (Proportions exactes Gemini)     */}
        {/* ========================================== */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          padding: '12px 16px', // Marges globales réduites
          borderTop: '1px solid #e0e0e0', 
          width: '100%', 
          boxSizing: 'border-box',
          marginTop: 'auto' 
        }}>
          
          {/* 1. L'Avatar (Taille ajustée) */}
          <div style={{ 
            ...styles.userAvatar, 
            width: '32px',  // On force une taille plus compacte (Gemini-style)
            height: '32px', 
            fontSize: '15px', 
            flexShrink: 0 
          }}>
            {currentUser && currentUser.name ? currentUser.name.trim().charAt(0).toUpperCase() : "?"}
          </div>

          {/* 2. Le Nom et l'École */}
          <div style={{ 
            flexGrow: 1, 
            marginLeft: '10px', // On rapproche le texte de l'avatar
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            overflow: 'hidden',
            textAlign: 'left' 
          }}>
            <span style={{ 
              fontWeight: '500', // Un peu plus net
              fontSize: '14.5px', // Taille parfaite pour éviter la coupure
              color: '#202124',     
              whiteSpace: 'nowrap', 
              textOverflow: 'ellipsis', // Gardé au cas où le nom fait 40 caractères
              overflow: 'hidden', 
              width: '100%',
              lineHeight: '1.2'  
            }}>
              {currentUser ? currentUser.name : "Student"}
            </span>
            <span style={{ 
              fontSize: '13px',  // Sous-titre plus discret
              color: '#5f6368',  
              lineHeight: '1.2',
              marginTop: '2px' // Petit espace naturel
            }}>
              {currentUser ? currentUser.college : "University"} Student
            </span>
          </div>

          {/* 3. L'icône SVG Paramètres avec son Menu Pop-up */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            
            {/* L'icône engrenage */}
            <div 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#444746', padding: '6px', borderRadius: '50%', backgroundColor: showSettingsMenu ? '#f1f3f4' : 'transparent', flexShrink: 0, marginLeft: '4px' }} 
              onClick={() => setShowSettingsMenu(!showSettingsMenu)} 
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>

            {showSettingsMenu && (
  <>
    {/* 1. L'Overlay invisible pour fermer au clic extérieur */}
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999, // Juste en dessous du menu
        background: 'transparent'
      }}
      onClick={() => setShowSettingsMenu(false)}
    />

    {/* 2. Ton Menu (avec zIndex 1000 pour passer au-dessus) */}
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: '10px',
      marginBottom: '10px',
      backgroundColor: '#fff',
      borderRadius: '16px',
      boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.1)',
      padding: '8px 0',
      width: '260px',
      zIndex: 1000,
      border: '1px solid #f0f0f0'
    }}>
      
      {/* 1. Account Settings */}
      <div 
        style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#202124' }} 
        onClick={() => {
          setPage('account');
          setShowSettingsMenu(false);
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '15px'}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        Account Settings
      </div>

      {/* 2. Dashboard */}
      <div 
        style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#202124' }} 
        onClick={() => { 
          setPage('dashboard'); 
          setShowSettingsMenu(false); 
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '15px'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
        Dashboard
      </div>

    

      <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />

      {/* 4. Contact Counsellor */}
      <div 
        style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#202124' }} 
        onClick={() => {
          window.location.href = "mailto:counsellor@university.edu?subject=Appointment Request - MindSpark";
          setShowSettingsMenu(false);
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '15px'}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        Contact Counsellor
      </div>
    </div>
  </>
)}
          </div>
        </div>
        </div>
           
        


        {/* --- ZONE DE CHAT PRINCIPALE (Droite) --- */}
        <div style={styles.chatMainArea}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #e0e0e0', backgroundColor: 'white' }}>
          <h2 style={{...styles.pageTitle, margin: 0, color: '#004b87', userSelect: 'none', WebkitUserSelect: 'none'}}>MindSpark</h2>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              style={{ backgroundColor: '#f1f3f4', color: '#202124', padding: '8px 16px', border: '1px solid #dadce0', borderRadius: '4px', fontWeight: '500', cursor: 'pointer' }} 
              onClick={() => setPage('dashboard')}
            >
              Dashboard
            </button>
            <button 
  onClick={() => {
    // 1. LE GRAND NETTOYAGE
    setFormData({});                    
    setSignupStep(1);                   
    setDassAnswers(Array(21).fill("")); 
    
    // 2. NETTOYAGE DU CHAT (Les deux lignes magiques)
    setChatInput(""); 
    setMessages([{ text: "Hello, I am MindSpark. How can I help you today?", sender: "bot" }]);
    
    // (Optionnel) setCurrentUser(null); 

    // 3. REDIRECTION
    setPage('login');                   
  }}
  style={{ ...styles.btnSecondary, /* garde ton style habituel ici */ }} 
>
  Logout
</button>
          </div>
        </div>
          
          <div style={styles.chatWindowFixed}>
            {messages.map((msg, index) => (
              <div key={index} style={{ textAlign: msg.sender === "user" ? "right" : "left", marginBottom: '15px' }}>
                <div style={msg.sender === "user" ? styles.bubbleUser : styles.bubbleBot}>
                  
                  {/* 🌟 LE TRADUCTEUR MARKDOWN EST ICI 🌟 */}
                  {msg.sender === "bot" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}

                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div style={styles.chatInputContainer}>
            <input 
              style={{ ...styles.input, flex: 1, margin: 0, borderRadius: '25px', padding: '15px 20px' }}
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' ? sendMessage() : null}
              placeholder="Enter a prompt here..." 
            />
            <button style={{ ...styles.btnPrimary, width: 'auto', margin: 0, borderRadius: '25px' }} onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>



        {/* ========================================== */}
      {/* 🛋️ LA SALLE DE THÉRAPIE DE L'ÉTUDIANT     */}
      {/* ========================================== */}
      {showStudentTherapyRoom && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f4f7f6', zIndex: 99999, display: 'flex', flexDirection: 'column' }}>
              
              {/* Le plafond de la salle (Header) */}
              <div style={{ backgroundColor: '#004b87', color: 'white', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', flexShrink: 0 }}>
                  <div>
                      <h2 style={{ margin: 0, fontSize: '24px' }}>🛋️ Safe Space</h2>
                      <p style={{ margin: 0, color: '#c2d7fa', fontSize: '14px', marginTop: '4px' }}>Private Weekly Session with MindSpark</p>
                  </div>
                  {/* BOUTON LEAVE SESSION */}
                  <button 
                      onClick={() => {
                          setShowStudentTherapyRoom(false);
                          
                          // 🌟 CORRECTION ICI : Accepte les nouveaux étudiants
                          if (!currentUser?.therapySessionUsed) {
                              fetch(`http://localhost:5001/api/users/${currentUser.username}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ therapySessionUsed: true })
                              });
                              setCurrentUser(prev => ({ ...prev, therapySessionUsed: true }));
                          }
                      }} 
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', padding: '10px 20px', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                      Leave Session
                  </button>
              </div>

              {/* L'espace de discussion central */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '40px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                  {therapyMessages.map((msg, index) => (
                      <div key={index} style={{ textAlign: msg.sender === "user" ? "right" : "left", marginBottom: '25px' }}>
                          <div style={{
                              display: 'inline-block',
                              backgroundColor: msg.sender === "user" ? '#dcecfc' : '#ffffff',
                              color: '#1a1a1a',
                              padding: '20px 25px',
                              borderRadius: msg.sender === "user" ? '20px 20px 0 20px' : '20px 20px 20px 0',
                              maxWidth: '85%',
                              fontSize: '16px',
                              lineHeight: '1.6',
                              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                              whiteSpace: 'pre-wrap',
                              border: msg.sender === "bot" ? '1px solid #e9ecef' : 'none',
                              textAlign: 'left'
                          }}>
                              {/* On utilise ReactMarkdown pour que l'IA puisse écrire en gras et faire des listes propres */}
                              {msg.sender === "bot" ? (
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                              ) : (
                                  msg.text
                              )}
                          </div>
                      </div>
                  ))}
                  <div ref={therapyEndRef} />
              </div>

              {/* ============================================== */}
              {/* 🔒 LA ZONE DE SAISIE INTELLIGENTE (CORRIGÉE)   */}
              {/* ============================================== */}
              <div style={{ backgroundColor: 'white', padding: '20px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '15px', maxWidth: '900px', width: '100%' }}>
                      
                      {canUpdateDass() ? (
                          // 🛑 PRIORITÉ 1 : 7 JOURS PASSÉS (Bloque tout et demande le test)
                          <div style={{ width: '100%', textAlign: 'center', padding: '10px' }}>
                              <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                                  ⚠️ Take your weekly DASS-21 assessment to unlock a new session.
                              </p>
                              <button 
                                  onClick={() => { setShowStudentTherapyRoom(false); setPage('dashboard'); }} 
                                  style={{ backgroundColor: '#0f9d58', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                  Go to Dashboard
                              </button>
                          </div>
                      ) : !currentUser?.therapySessionUsed ? (
                          // 🟢 PRIORITÉ 2 : TEST FAIT ET SÉANCE NON UTILISÉE (Autorise à parler)
                          <>
                              <input 
                                  type="text" 
                                  value={therapyInput} 
                                  onChange={(e) => setTherapyInput(e.target.value)} 
                                  onKeyPress={(e) => e.key === 'Enter' ? sendTherapyMessage() : null}
                                  placeholder="Share what's on your mind today..." 
                                  style={{ flex: 1, padding: '15px 25px', borderRadius: '30px', border: '1px solid #ccc', fontSize: '16px', outline: 'none' }} 
                              />
                              <button onClick={sendTherapyMessage} style={{ backgroundColor: '#004b87', color: 'white', padding: '0 30px', borderRadius: '30px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                                  Speak
                              </button>
                          </>
                      ) : (
                          // 🔒 PRIORITÉ 3 : SÉANCE DÉJÀ TERMINÉE (Lecture seule)
                          <div style={{ width: '100%', textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px dashed #ccc' }}>
                              <p style={{ margin: 0, color: '#5f6368', fontWeight: '500' }}>
                                  🔒 Session is in Read-Only mode. You've completed your therapy session for this week.
                              </p>
                          </div>
                      )}

                  </div>
              </div>
          </div>
      )}
      
      </div>
    );
  }

   if (isCheckingSession) {
    // Affiche un écran blanc ou un petit texte le temps de la vérification
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7f6', color: '#004b87' }}>
        <h2>Loading MindSpark...</h2>
      </div>
    );
  }
  
  // =========================================================
  // ARCHITECTURE STANDARD (NAVBAR + CONTENU) POUR LES AUTRES PAGES


  function canUpdateDass() {
    // S'il n'y a pas d'utilisateur ou pas de date, on autorise
    if (!currentUser?.lastDassUpdate) return true; 
    
    const lastUpdate = new Date(currentUser.lastDassUpdate);
    const now = new Date();
    const diffInDays = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
    
    return diffInDays >= 7;
  }


  // =========================================================
  return (
    <div style={styles.pageContainer}>

      {/* ========================================= */}
      {/* 🛡️ MODAL D'ALERTE GÉNÉRIQUE (REMPLACE ALERT) */}
      {/* ========================================= */}
      {alertModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px 24px', borderRadius: '16px', width: '340px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'center' }}>
            
            {/* Icône qui change selon si c'est un succès ou une erreur */}
            <div style={{ margin: '0 auto', color: alertModal.isSuccess ? '#0f9d58' : '#d93025' }}>
              {alertModal.isSuccess ? (
                // Icône Check (Succès)
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              ) : (
                // Icône Alert (Erreur/Attention)
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              )}
            </div>

            <h3 style={{ margin: 0, color: '#202124', fontSize: '20px', fontWeight: '600' }}>{alertModal.title}</h3>
            <p style={{ margin: 0, color: '#5f6368', fontSize: '15px', lineHeight: '1.5' }}>{alertModal.message}</p>
            
            <button 
              onClick={() => setAlertModal({ isOpen: false, title: '', message: '', isSuccess: false })} 
              style={{ marginTop: '15px', padding: '12px 16px', borderRadius: '8px', border: 'none', backgroundColor: alertModal.isSuccess ? '#0f9d58' : '#d93025', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer', width: '100%', transition: 'background-color 0.2s' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      


      
      {/* --- BARRE DE NAVIGATION --- */}
      <nav style={styles.navbar}>
        <div style={styles.navBrand}>
          <img src="/Universiti_Tenaga_Nasional_Logo.png" alt="UNITEN Logo" style={styles.navLogo} />
          <div style={styles.navBrandText}>
            <h1 style={styles.navTitle}>MindSpark</h1>
            <p style={styles.navSubtitle}>AI Counseling Assistant</p>
          </div>
        </div>
        
        <div style={styles.navLinks}>
          {page !== 'login' && page !== 'signup' && (
             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
               {/* Le bouton Account a été supprimé ici */}
               <button 
  onClick={() => {
    // 0. ON VIDE LE COFFRE-FORT (CRUCIAL !) 🚨
    localStorage.removeItem('mindspark_user');
    localStorage.removeItem('mindspark_page');

    // 1. LE GRAND NETTOYAGE
    setFormData({});                    
    setSignupStep(1);                   
    setDassAnswers(Array(21).fill("")); 
    
    // 2. NETTOYAGE DU CHAT
    setChatInput(""); 
    setMessages([{ text: "Hello, I am MindSpark. How can I help you today?", sender: "bot" }]);
    setCurrentUser(null); // (C'est mieux de le décommenter pour vraiment vider la mémoire)

    // 3. REDIRECTION
    setPage('login');                   
  }}
  style={{ ...styles.btnSecondary /* ajoute tes styles de bouton ici */ }} 
>
  Logout
</button>
             </div>
          )}
        </div>
      </nav>

      {/* --- CONTENU PRINCIPAL --- */}
      <main style={page === 'counsellor' ? { display: 'flex', width: '100%', height: 'calc(100vh - 83px)', padding: 0, margin: 0, overflow: 'hidden', backgroundColor: '#fff' } : styles.mainContent}>

        {/* PAGE: SIGNUP */}
      {page === 'signup' && (
        <div style={{ ...styles.centerContainer, padding: '20px' }}>
          {/* On élargit la boîte pour que la grille respire bien comme sur ta capture */}
          <div style={{ ...styles.loginBox, maxWidth: signupStep === 2 ? '700px' : '800px', width: '100%' }}>
            
            {signupStep === 1 ? (
              // ==========================================
              // --- ÉTAPE 1 : TON DESIGN EXACT D'ORIGINE ---
              // ==========================================
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Create your Account</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0' }}>Please fill in your information to set up your confidential space.</p>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '20px' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Ligne 1 */}
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>Full Name</label>
                    <input style={{...styles.input, width: '100%', boxSizing: 'border-box'}} type="text" value={formData.name || ''}  placeholder="Enter your full name" onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>Student ID Number</label>
                    <input style={{...styles.input, width: '100%', boxSizing: 'border-box'}} type="text" value={formData.idNumber || ''} placeholder="e.g., SW01234" onChange={(e) => setFormData({...formData, idNumber: e.target.value})} />
                  </div>

                  {/* Ligne 2 */}
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>
                      Date of Birth
                    </label>
                    <input 
                      /* L'astuce : C'est du texte quand c'est vide, et ça devient une date au clic */
                      type={formData.dob ? "date" : "text"} 
                      placeholder="mm/dd/yyyy"
                      onFocus={(e) => e.target.type = 'date'}
                      onBlur={(e) => { if (!formData.dob) e.target.type = 'text' }}
                      value={formData.dob || ""} 
                      onChange={(e) => setFormData({...formData, dob: e.target.value})} 
                      style={{
                        ...styles.input, 
                        width: '100%', 
                        boxSizing: 'border-box', 
                        color: '#333' /* Le placeholder natif gère son propre gris parfaitement */
                      }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>Age</label>
                    <input style={{...styles.input, width: '100%', boxSizing: 'border-box'}} type="text" value={formData.age || ''} placeholder="Your age" onChange={(e) => setFormData({...formData, age: e.target.value})} />
                  </div>

                  {/* Ligne 3 */}
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>
                      Gender
                    </label>
                    <select 
                      value={formData.gender || ""} 
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      style={{ 
                        ...styles.input, 
                        width: '100%', 
                        boxSizing: 'border-box', 
                        cursor: 'pointer',
                        fontWeight: 'normal',
                        /* On utilise le gris natif exact des navigateurs (#757575) */
                        color: formData.gender ? '#333' : '#757575' 
                      }}
                    >
                      <option value="" disabled>Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>Religion</label>
                    <input style={{...styles.input, width: '100%', boxSizing: 'border-box'}} type="text" value={formData.religion || ''} placeholder="Your religion" onChange={(e) => setFormData({...formData, religion: e.target.value})} />
                  </div>

                  {/* Ligne 4 */}
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>Race</label>
                    <input style={{...styles.input, width: '100%', boxSizing: 'border-box'}} type="text" value={formData.race || ''} placeholder="Your race" onChange={(e) => setFormData({...formData, race: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>
                      College / Unit
                    </label>
                    <select 
                      value={formData.college || ""} 
                      onChange={(e) => setFormData({...formData, college: e.target.value})}
                      style={{ 
                        ...styles.input, 
                        width: '100%', 
                        boxSizing: 'border-box', 
                        cursor: 'pointer',
                        fontWeight: 'normal',
                        /* On utilise le gris natif exact des navigateurs (#757575) */
                        color: formData.college ? '#333' : '#757575' 
                      }}
                    >
                      <option value="" disabled>Select your College / Unit</option>
                      <option value="COE">COE (College of Engineering)</option>
                      <option value="CCI">CCI (College of Computing and Informatics)</option>
                      <option value="COBA">COBA (College of Business Administration)</option>
                      <option value="CES">CES (College of Energy Economics & Social Sciences)</option>
                      <option value="SHBM">SHBM</option>
                      <option value="EMINES">EMINES</option>
                      <option value="SAPD">SAPD</option>
                      <option value="FGSES">FGSES</option>
                    </select>
                  </div>
                </div>

                {/* Adresse (Pleine largeur) */}
                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>Home Address</label>
                  <textarea 
                    style={{...styles.input, width: '100%', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical'}} 
                    placeholder="Your full home address..." 
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '20px' }} />

                {/* Identifiants de connexion */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  {/* Username (For Login) */}
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>
                      Username (For Login)
                    </label>
                    <input 
                      type="text" 
                      autoComplete="new-password" /* 🛑 Bloque l'autofill sauvage de Chrome */
                      placeholder="Choose a username" 
                      value={formData.username || ""} 
                      onChange={(e) => setFormData({...formData, username: e.target.value})} 
                      style={{...styles.input, width: '100%', boxSizing: 'border-box'}} 
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#333' }}>
                      Password
                    </label>
                    <input 
                      type="password" 
                      autoComplete="new-password" /* 🛑 Dit à Chrome : "C'est un NOUVEAU mot de passe, laisse vide !" */
                      placeholder="Create a password" 
                      value={formData.password || ""} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      style={{...styles.input, width: '100%', boxSizing: 'border-box'}} 
                    />
                  </div>
                </div>

                {/* Bouton pour passer à l'étape 2 */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button 
                  type="button"
                  onClick={(e) => {
                    // 1. Liste des champs obligatoires
                    const requiredFields = ['name', 'idNumber', 'dob', 'age', 'gender', 'religion', 'race', 'college', 'address', 'username', 'password'];
                    
                    // 2. Vérification que tout est rempli
                    const isComplete = requiredFields.every(field => formData[field] && String(formData[field]).trim() !== '');

                    if (!isComplete) {
                      showAlert("Missing Information", "Please fill in all mandatory fields before proceeding.", false);
                      return; 
                    }
                    
                    // 3. On lance l'envoi de l'email au lieu de passer directement à la suite !
                    handleNextStep(e);
                  }}
                  style={{ ...styles.btnPrimary, width: '100%', marginTop: '30px', padding: '15px', backgroundColor: '#004b87', border: 'none' }}
                >
                  {isSendingOtp ? "Sending Verification Code..." : "Next Step: Psychological Assessment"}
                </button>
            </div>

            <div style={{ marginTop: '15px', color: '#666', fontSize: '14px', textAlign: 'center' }}>
              Already registered? <span 
                style={{ color: '#d32f2f', fontWeight: 'bold', cursor: 'pointer' }} 
                onClick={() => {
                  setFormData({}); // 1. Vide les infos persos
                  setSignupStep(1); // 2. Réinitialise l'étape en arrière-plan
                  setDassAnswers(Array(21).fill("")); // 3. Vide le DASS-21 en arrière-plan
                  setPage('login'); // 4. Retourne au Login
                }}
              >
                Log in here
              </span>
            </div>
              </>
            ) : (
              // ==========================================
              // --- ÉTAPE 2 : LE DASS-21 ---
              // ==========================================
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Psychological Assessment</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0' }}>
                    Please select a number which indicates how much the statement applied to you <strong>over the past week</strong>.
                  </p>
                </div>

                <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '25px', fontSize: '13px', color: '#333' }}>
                  <strong>0</strong> - Did not apply to me at all<br/>
                  <strong>1</strong> - Applied to me to some degree<br/>
                  <strong>2</strong> - Applied to me to a considerable degree<br/>
                  <strong>3</strong> - Applied to me very much
                </div>

                <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '20px', padding: '15px', backgroundColor: '#fdfdfd', border: '1px solid #eee', borderRadius: '8px' }}>
                  {dass21Questions.map((question, index) => (
                    <div key={index} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                      <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', color: '#111', marginBottom: '10px' }}>
                        {index + 1}. {question}
                      </label>
                      <select 
                        value={dassAnswers[index]}
                        onChange={(e) => {
                          const newAnswers = [...dassAnswers];
                          // On s'assure d'enregistrer un nombre, sauf si la case est vide
                          newAnswers[index] = e.target.value === "" ? "" : parseInt(e.target.value);
                          setDassAnswers(newAnswers);
                        }}
                        style={{ ...styles.input, width: '100%', cursor: 'pointer', margin: 0, color: dassAnswers[index] === "" ? '#999' : '#333' }}
                      >
                        {/* C'est cette option par défaut qui rend la question obligatoire */}
                        <option value="" disabled>Select an answer</option>
                        <option value={0}>0 - Did not apply to me at all</option>
                        <option value={1}>1 - Applied to me to some degree</option>
                        <option value={2}>2 - Applied to me to a considerable degree</option>
                        <option value={3}>3 - Applied to me very much</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                  <button 
                    onClick={() => setSignupStep(1)}
                    style={{ ...styles.btnSecondary, flex: 1, padding: '15px', margin: 0 }}
                  >
                    Back to Info
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault(); // Évite que la page ne se rafraîchisse

                      // 1. VÉRIFICATION DASS-21
                      const isDassComplete = dassAnswers.every(answer => answer !== "");
                      
                      if (!isDassComplete) {
                        showAlert("Missing Information", "Please fill in all mandatory fields before submitting.", false);
                        return; // 🛑 Bloque l'envoi si incomplet
                      }

                      // 2. FUSION DES DONNÉES
                      // On injecte directement le tableau des réponses dans ton objet global formData
                      // pour que ton code Firebase existant puisse tout récupérer d'un coup.
                      formData.dassAnswers = dassAnswers;

                      // 3. EXÉCUTION DE TON CODE EXISTANT
                      // Si la fonction que tu utilisais avant s'appelait handleSignup, on l'appelle ici :
                      handleSignup(e); 
                      
                      /* ⚠️ NOTE : Si ton ancienne fonction s'appelait différemment 
                         (ex: registerUser, submitForm, etc.), remplace simplement 
                         'handleSignup(e)' par le nom de ta fonction. */
                    }}
                    style={{ ...styles.btnPrimary, flex: 1, padding: '15px', margin: 0, backgroundColor: '#004b87', border: 'none' }}
                  >
                    Submit & Create Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
       
        

          

        {/* PAGE: LOGIN */}
        {page === 'login' && (
          <div style={styles.centerContainer}>
            <div style={styles.loginBox}>
              <h2 style={styles.pageTitle}>Log in to MindSpark</h2>
              <p style={styles.pageDescription}>Access your confidential counseling space.</p>
              
              <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <input 
                style={styles.input} 
                type="text" 
                value={formData.username || ""} /* <-- Verrouillage ajouté */
                onChange={(e) => setFormData({...formData, username: e.target.value})} 
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input 
                style={styles.input} 
                type="password" 
                value={formData.password || ""} /* <-- Verrouillage ajouté */
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
            </div>

            <button style={{...styles.btnPrimary, width: '100%', marginTop: '20px'}} onClick={handleLogin}>
              Secure Login
            </button>

            <p style={{...styles.switchText, textAlign: 'center'}}>
              No account yet? <span 
                style={{ cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={() => {
                  setFormData({}); // 1. Vide les infos persos
                  setSignupStep(1); // 2. FORCE le retour à l'étape 1
                  setDassAnswers(Array(21).fill("")); // 3. VIDE toutes les réponses DASS-21
                  setPage('signup'); // 4. Change la page
                }}
              >
                Register here
              </span>
            </p>

            {/* LIEN VERS LE CONSEILLER */}
            <p style={{...styles.switchText, textAlign: 'center', marginTop: '8px'}}>
              Are you a counsellor? <span 
                style={{ cursor: 'pointer', fontWeight: 'bold' }} 
                onClick={() => setShowCounsellorModal(true)}
              >
                Login here
              </span>
            </p>

            {/* FENÊTRE POP-UP (MODAL) DU CONSEILLER */}
            {showCounsellorModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(3px)' }}>
                <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '340px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ margin: 0, color: '#004b87', textAlign: 'center', fontSize: '20px' }}>Counsellor Access</h3>
                  <form onSubmit={handleCounsellorLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                    <input
                      type="text"
                      placeholder="Username"
                      value={counsellorUsername}
                      onChange={(e) => setCounsellorUsername(e.target.value)}
                      style={styles.input}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={counsellorPassword}
                      onChange={(e) => setCounsellorPassword(e.target.value)}
                      style={styles.input}
                      required
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="button" onClick={() => setShowCounsellorModal(false)} style={{ ...styles.btnSecondary, flex: 1, padding: '10px' }}>Cancel</button>
                      <button type="submit" style={{ ...styles.btnPrimary, flex: 1, padding: '10px', margin: 0 }}>Login</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            </div>
          </div>
        )}

        {/* PAGE: DASHBOARD */}
      {page === 'dashboard' && (
        <div style={{ ...styles.centerContainer, padding: '20px' }}>
          <div style={{ ...styles.loginBox, maxWidth: '800px', width: '100%' }}>
            
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>
              My Assessment Dashboard
            </h2>

            {!isEditingDass ? (
              // --- AFFICHAGE DES SCORES ---
              <>
                {currentUser?.dassScores ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                      
                      {/* Carte Dépression */}
                      <div style={{ backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e1e8ed' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#004c8c', fontSize: '16px' }}>Depression</h3>
                        <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#333' }}>
                          {currentUser.dassScores.depression}
                        </p>
                        <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '12px' }}>
                          {currentUser.dassSeverity.depression}
                        </p>
                      </div>

                      {/* Carte Anxiété */}
                      <div style={{ backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e1e8ed' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#004c8c', fontSize: '16px' }}>Anxiety</h3>
                        <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#333' }}>
                          {currentUser.dassScores.anxiety}
                        </p>
                        <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '12px' }}>
                          {currentUser.dassSeverity.anxiety}
                        </p>
                      </div>

                      {/* Carte Stress */}
                      <div style={{ backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e1e8ed' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#004c8c', fontSize: '16px' }}>Stress</h3>
                        <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#333' }}>
                          {currentUser.dassScores.stress}
                        </p>
                        <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '12px' }}>
                          {currentUser.dassSeverity.stress}
                        </p>
                      </div>

                    </div>

                     
                    {/* 👇 LE VRAI GRAPHIQUE CORRIGÉ 👇 */}
          {currentUser.dassHistory && currentUser.dassHistory.length > 0 && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', marginTop: '20px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>
                My Progress Over Time
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
                <LineChart width={600} height={300} data={currentUser.dassHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" domain={[0, 42]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="depression" name="Depression" stroke="#004b87" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="anxiety" name="Anxiety" stroke="#e07a5f" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="stress" name="Stress" stroke="#81b29a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </div>
            </div>
          )}
          {/* 👆 FIN DU GRAPHIQUE 👆 */}


          



                    {canUpdateDass() ? (
  <button 
    style={{ ...styles.btnPrimary, width: '100%', marginBottom: '10px' }}
    onClick={() => {
      // On pré-remplit le formulaire avec les anciennes réponses
      setEditDassAnswers(currentUser.dassAnswers || Array(21).fill(0));
      setIsEditingDass(true);
    }}
  >
    View and Modify My Answers
  </button>
) : (
  <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', marginBottom: '10px', textAlign: 'center', border: '1px solid #bbdefb' }}>
    <p style={{ color: '#0277bd', margin: 0, fontSize: '14px', fontWeight: '500' }}>
      ⏳ You can update your assessment once a week to track meaningful progress.
    </p>
  </div>
)}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#666' }}>No assessment data found.</p>
                )}
                
                <button 
                  style={{ backgroundColor: '#ccc', color: '#333', padding: '12px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }} 
                  onClick={() => setPage('chat')}
                >
                  Return to Chat
                </button>
              </>
            ) : (
              // --- FORMULAIRE DE MODIFICATION ---
              <>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>Update your responses below to recalculate your scores.</p>
                
                <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px', padding: '15px', backgroundColor: '#fdfdfd', borderRadius: '8px', border: '1px solid #eee' }}>
                  {dass21Questions.map((question, index) => (
                    <div key={index} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#333' }}>
                        {index + 1}. {question}
                      </p>
                      <select 
                        style={{...styles.input, width: '100%', boxSizing: 'border-box', cursor: 'pointer', backgroundColor: '#fafafa'}} 
                        value={editDassAnswers[index]}
                        onChange={(e) => {
                          const newAnswers = [...editDassAnswers];
                          newAnswers[index] = parseInt(e.target.value);
                          setEditDassAnswers(newAnswers);
                        }}
                      >
                        <option value="0">0 - Did not apply to me at all</option>
                        <option value="1">1 - Applied to me to some degree</option>
                        <option value="2">2 - Applied to me to a considerable degree</option>
                        <option value="3">3 - Applied to me very much</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button 
                    style={{ backgroundColor: '#ccc', color: '#333', padding: '12px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }} 
                    onClick={() => setIsEditingDass(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    style={{ backgroundColor: '#004c8c', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', flex: 2 }} 
                    onClick={handleUpdateDass}
                  >
                    Save & Recalculate
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

        {/* ========================================== */}
      {/* PAGE: ACCOUNT SETTINGS (100% English)        */}
      {/* ========================================== */}
      {page === 'account' && (
        <div style={styles.centerContainer}>
          <div style={{ ...styles.loginBox, maxWidth: '800px', width: '100%', position: 'relative', boxShadow: 'none', border: 'none', backgroundColor: 'transparent' }}>
            
            <h2 style={{ ...styles.pageTitle, textAlign: 'center', margin: '0 0 10px 0' }}>
              Account Settings
            </h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '25px', fontSize: '15px' }}>
              Manage your profile information and view your details.
            </p>

            {/* LIGNE SÉPARATRICE HAUTE */}
            <hr style={{ border: 'none', borderTop: '1px solid #eaeaea', marginBottom: '35px', width: '100%' }} />

            {/* GRILLE À 2 COLONNES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              
              {[
                { id: 'name', label: 'Full Name', value: currentUser?.name, type: 'text', colSpan: 1, placeholder: 'Enter your full name' },
                { id: 'idNumber', label: 'Student ID Number', value: currentUser?.idNumber, type: 'text', colSpan: 1, placeholder: 'e.g., SW01234' },
                { id: 'dob', label: 'Date of Birth', value: currentUser?.dob, type: 'date', colSpan: 1, placeholder: 'mm/dd/yyyy' },
                { id: 'age', label: 'Age', value: currentUser?.age, type: 'number', colSpan: 1, placeholder: 'Your age' },
                { id: 'gender', label: 'Gender', value: currentUser?.gender, type: 'select', options: ['Male', 'Female'], colSpan: 1, placeholder: 'Select gender' },
                { id: 'religion', label: 'Religion', value: currentUser?.religion, type: 'text', colSpan: 1, placeholder: 'Your religion' },
                { id: 'race', label: 'Race', value: currentUser?.race, type: 'text', colSpan: 1, placeholder: 'Your race' },
                { id: 'college', label: 'College / Unit', value: currentUser?.college, type: 'select', options: ['SHBM', 'EMINES', 'SAPD', 'FGSES', 'UM7P'], colSpan: 1, placeholder: 'e.g., COE, CCI...' },
                { id: 'address', label: 'Home Address', value: currentUser?.address, type: 'textarea', colSpan: 2, placeholder: 'Your full home address...' }
              ].map((field, index) => (
                <div key={index} style={{ gridColumn: field.colSpan === 2 ? '1 / -1' : 'auto' }}>
                  
                  <label style={{ display: 'block', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: '#111', marginBottom: '10px' }}>
                    {field.label}
                  </label>
                  
                  <div style={{ 
                    ...styles.input, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: field.type === 'textarea' ? '15px' : '0 15px', 
                    minHeight: field.type === 'textarea' ? '100px' : '45px',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                    margin: 0
                  }}>
                    
                    <span style={{ fontSize: '15px', color: field.value ? '#222' : '#999', whiteSpace: field.type === 'textarea' ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
                      {field.value || field.placeholder}
                    </span>
                    
                    <button 
                      onClick={() => setEditModal({ isOpen: true, id: field.id, label: field.label, value: field.value || '', type: field.type, options: field.options || [] })} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#224b82', display: 'flex', padding: 0, marginLeft: '10px', flexShrink: 0, alignItems: field.type === 'textarea' ? 'flex-end' : 'center', height: '100%' }}
                      title="Edit"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* LIGNE SÉPARATRICE BASSE */}
            <hr style={{ border: 'none', borderTop: '1px solid #eaeaea', marginTop: '40px', marginBottom: '35px', width: '100%' }} />

            {/* BOUTON RETURN TO CHAT */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                style={{ 
                  ...styles.btnPrimary, 
                  backgroundColor: '#224b82', 
                  border: 'none', 
                  width: '100%', 
                  maxWidth: '350px' 
                }} 
                onClick={() => setPage('chat')}
              >
                Return to Chat
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* FENÊTRE MODAL DE MODIFICATION              */}
          {/* ========================================== */}
          {editModal.isOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
              
              <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '400px', borderRadius: '8px', padding: '30px', boxSizing: 'border-box' }}>
                
                <h3 style={{ margin: '0 0 20px 0', textAlign: 'center', fontSize: '20px', color: '#000', fontWeight: 'bold' }}>
                  Edit {editModal.label}
                </h3>

                <div style={{ marginBottom: '25px' }}>
                  
                  {editModal.type === 'select' ? (
                    <select 
                      value={editModal.value}
                      onChange={(e) => setEditModal({...editModal, value: e.target.value})}
                      style={{ ...styles.input, width: '100%', boxSizing: 'border-box', cursor: 'pointer', margin: 0, color: '#333' }}
                    >
                      <option value="" disabled>Select an option</option>
                      {editModal.options.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  
                  ) : editModal.type === 'textarea' ? (
                    <textarea
                      value={editModal.value}
                      onChange={(e) => setEditModal({...editModal, value: e.target.value})}
                      style={{ ...styles.input, width: '100%', boxSizing: 'border-box', minHeight: '100px', resize: 'vertical', margin: 0, color: '#333' }} 
                      autoFocus
                    />
                  
                  ) : (
                    <input 
                      type={editModal.type}
                      value={editModal.value}
                      onChange={(e) => setEditModal({...editModal, value: e.target.value})}
                      style={{ ...styles.input, width: '100%', boxSizing: 'border-box', margin: 0, color: '#333' }} 
                      autoFocus
                    />
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
                  <button 
                    onClick={() => setEditModal({ isOpen: false, id: '', label: '', value: '', type: '', options: [] })}
                    style={{ ...styles.btnSecondary, flex: 1, padding: '12px', margin: 0 }}
                  >
                    Cancel
                  </button>
                  
                  <button 
                    onClick={async () => {
                      try {
                        // 1. Prépare la donnée à envoyer
                        const updatedField = { [editModal.id]: editModal.value };

                        // 2. Appel à NOTRE backend Node.js sur le port 5001
                        // On utilise currentUser.uid (ou currentUser.id selon ce qu'on a défini dans la connexion)
                        console.log(currentUser)
                        const userId = currentUser.username;
                        
                        const response = await fetch(`http://localhost:5001/api/users/${userId}`, {
                          method: 'PUT', // ou PATCH, selon la route qu'on a créée dans server.js
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(updatedField)
                        });

                        if (!response.ok) {
                          throw new Error("Erreur lors de la communication avec le serveur");
                        }

                        // 3. Mise à jour de l'affichage local si le serveur a dit OK
                        setCurrentUser({...currentUser, ...updatedField});
                        
                        // 4. Fermeture de la fenêtre
                        setEditModal({ isOpen: false, id: '', label: '', value: '', type: '', options: [] }); 
                        
                      } catch (error) {
                        console.error("Backend update error:", error);
                        alert("An error occurred while saving. Please check your backend connection.");
                      }
                    }}
                    style={{ ...styles.btnPrimary, flex: 1, padding: '12px', margin: 0, backgroundColor: '#224b82', border: 'none' }}
                  >
                    Save
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      )}




      {/* ========================================== */}
        {/* PAGE: COUNSELLOR DASHBOARD                 */}
        {/* ========================================== */}
        {page === 'counsellor' && (
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            
            {/* ⬅️ PANNEAU GAUCHE : LISTE DES ÉTUDIANTS (AVEC SCROLL) */}
            <div style={{ width: '320px', backgroundColor: '#f8f9fa', borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              <div style={{ padding: '20px', backgroundColor: '#004b87', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Counsellor Portal</h3>
              </div>
              
              <div style={{ padding: '15px', borderBottom: '1px solid #e9ecef', flexShrink: 0 }}>
                <input
                  type="text"
                  placeholder="Search student by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...styles.input, width: '100%', borderRadius: '20px', padding: '10px 15px', margin: 0 }}
                />
              </div>

              {/* 🌟 LA ZONE QUI SCROLL EST UNIQUEMENT ICI 🌟 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {allStudents.filter(s =>
                  (s.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (s.idNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
                ).map(student => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    style={{
                      padding: '12px 15px', marginBottom: '8px', borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: selectedStudent?.id === student.id ? '#e8f0fe' : '#fff',
                      border: selectedStudent?.id === student.id ? '1px solid #c2d7fa' : '1px solid #eaeaea',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#202124', fontSize: '14px', marginBottom: '4px' }}>
                      {student.name || student.username.split('@')[0]}
                    </div>
                    <div style={{ fontSize: '12px', color: '#5f6368', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{student.idNumber || "No ID"}</span>
                      <span style={{ color: student.dassSeverity?.stress === 'Normal' ? '#0f9d58' : (student.dassSeverity ? '#d93025' : '#999') }}>
                        {student.lastDassUpdate ? new Date(student.lastDassUpdate).toLocaleDateString() : 'No tests'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ➡️ PANNEAU DROIT : DASHBOARD (AVEC SCROLL SÉPARÉ) */}
            <div style={{ flex: 1, padding: '30px', overflowY: 'auto', backgroundColor: '#fff', height: '100%' }}>
              
              {/* === LAISSE TOUT LE CONTENU DE TON PANNEAU DROIT INTACT ICI === */}
              {!selectedStudent ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9aa0a6' }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '15px' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <h3 style={{ margin: 0 }}>Select a student to view their profile and progress</h3>
                </div>
              ) : (
                <div>
                  <div style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
                    <h2 style={{ color: '#004b87', margin: '0 0 5px 0' }}>{selectedStudent.name || selectedStudent.username}</h2>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                      {selectedStudent.college || "University"} • {selectedStudent.age ? selectedStudent.age + ' years old' : ''} • {selectedStudent.email || selectedStudent.username}
                    </p>
                  </div>

                  {selectedStudent.dassScores ? (
                    <>
                      {/* CARTES DE SCORES */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                        <div style={{ backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e1e8ed' }}>
                          <h3 style={{ margin: '0 0 10px 0', color: '#004c8c', fontSize: '16px' }}>Depression</h3>
                          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#333' }}>{selectedStudent.dassScores.depression}</p>
                          <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '12px' }}>{selectedStudent.dassSeverity.depression}</p>
                        </div>
                        <div style={{ backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e1e8ed' }}>
                          <h3 style={{ margin: '0 0 10px 0', color: '#004c8c', fontSize: '16px' }}>Anxiety</h3>
                          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#333' }}>{selectedStudent.dassScores.anxiety}</p>
                          <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '12px' }}>{selectedStudent.dassSeverity.anxiety}</p>
                        </div>
                        <div style={{ backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e1e8ed' }}>
                          <h3 style={{ margin: '0 0 10px 0', color: '#004c8c', fontSize: '16px' }}>Stress</h3>
                          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#333' }}>{selectedStudent.dassScores.stress}</p>
                          <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '5px 0 0 0', textTransform: 'uppercase', fontSize: '12px' }}>{selectedStudent.dassSeverity.stress}</p>
                        </div>
                      </div>

                      {/* GRAPHIQUE D'ÉVOLUTION */}
                      {selectedStudent.dassHistory && selectedStudent.dassHistory.length > 0 && (
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
                          <h3 style={{ textAlign: 'center', color: '#333', marginBottom: '20px', fontSize: '16px' }}>Progress Over Time</h3>
                          <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
                            <LineChart width={550} height={250} data={selectedStudent.dassHistory} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="date" stroke="#888" fontSize={12} />
                              <YAxis stroke="#888" domain={[0, 42]} fontSize={12} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              <Line type="monotone" dataKey="depression" name="Depression" stroke="#004b87" strokeWidth={3} dot={{ r: 4 }} />
                              <Line type="monotone" dataKey="anxiety" name="Anxiety" stroke="#e07a5f" strokeWidth={3} dot={{ r: 4 }} />
                              <Line type="monotone" dataKey="stress" name="Stress" stroke="#81b29a" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ccc' }}>
                      <p style={{ color: '#666', margin: 0 }}>This student has not completed the psychological assessment yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}




      {/* 🔐 FENÊTRE POPUP POUR LA VÉRIFICATION EMAIL 🔐 */}
      {showOtpModal && (
          <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
              <div style={{
                  backgroundColor: 'white', padding: '40px', borderRadius: '16px',
                  width: '90%', maxWidth: '400px', textAlign: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}>
                  <h2 style={{ margin: '0 0 10px 0', color: '#004b87' }}>Verify your Email</h2>
                  <p style={{ color: '#555', marginBottom: '15px', lineHeight: '1.5' }}>
                      We just sent a 6-digit code to <b>{formData.username}</b>. Enter it below to continue.
                  </p>
                  
                  {/* 🚨 L'ERREUR S'AFFICHERA ICI S'IL Y EN A UNE 🚨 */}
                  {otpError && (
                      <p style={{ color: '#d93025', fontWeight: 'bold', margin: '0 0 15px 0', fontSize: '14px' }}>
                          {otpError}
                      </p>
                  )}
                  
                  <input 
                      type="text" 
                      placeholder="• • • • • •" 
                      value={otpCode} 
                      onChange={(e) => {
                          setOtpCode(e.target.value);
                          setOtpError(""); // Cache l'erreur dès que l'étudiant recommence à taper !
                      }} 
                      maxLength="6"
                      style={{
                          width: '100%', padding: '15px', borderRadius: '8px',
                          border: `2px solid ${otpError ? '#d93025' : '#e0e0e0'}`, // Bordure rouge si erreur !
                          fontSize: '24px', letterSpacing: '10px',
                          textAlign: 'center', marginBottom: '20px', outline: 'none',
                          boxSizing: 'border-box'
                      }} 
                  />
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                          onClick={() => {
                              setShowOtpModal(false);
                              setOtpError(""); // On nettoie si on annule
                              setOtpCode("");
                          }} 
                          style={{
                              flex: 1, padding: '12px', borderRadius: '8px',
                              backgroundColor: '#f1f3f4', border: 'none',
                              color: '#5f6368', fontWeight: 'bold', cursor: 'pointer'
                          }}
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleVerifyOtp} 
                          style={{
                              flex: 2, padding: '12px', borderRadius: '8px',
                              backgroundColor: '#004b87', border: 'none',
                              color: 'white', fontWeight: 'bold', cursor: 'pointer'
                          }}
                      >
                          Verify & Continue
                      </button>
                  </div>
              </div>
          </div>
      )}
            

      </main>





      
      

    </div>
  );
}

// Un petit composant pour chaque ligne de l'historique
const ChatItem = ({ chat, currentChatId, setMessages, setCurrentChatId, togglePinChat, deleteChat, renameChat }) => (
  <div 
    onClick={() => { setMessages(chat.messages); setCurrentChatId(chat.id); }}
    style={{
      padding: '10px',
      borderRadius: '20px',
      cursor: 'pointer',
      backgroundColor: currentChatId === chat.id ? '#e8f0fe' : 'transparent',
      marginBottom: '5px',
      color: '#202124',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between', 
      gap: '10px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink: 0}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.title}</span>
    </div>

    {/* Section des Actions (Pin, Rename, Delete) */}
    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
      
      {/* Nouvelle Icône Punaise (Vraie Punaise de bureau) */}
      <div onClick={(e) => togglePinChat(chat.id, chat.isPinned, e)} style={{ color: chat.isPinned ? '#1a73e8' : '#5f6368' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={chat.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
      </div>

      {/* Nouvelle Icône Éditer (Crayon) */}
      <div onClick={(e) => renameChat(chat.id, chat.title, e)} style={{ color: '#5f6368' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon></svg>
      </div>

      {/* Icône Corbeille */}
      <div onClick={(e) => deleteChat(chat.id, e)} style={{ color: '#d93025' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </div>

    </div>
  </div>
);

// =========================================================
// STYLES GLOBAUX ET GEMINI
// =========================================================
const styles = {
  // Styles Architecture Standard
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
  },
  navbar: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottom: '4px solid #d32027', 
    padding: '12px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    position: 'sticky', 
    top: 0,
    zIndex: 1000
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: '18px' },
  navLogo: { height: '55px', objectFit: 'contain' },
  navBrandText: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  navTitle: { margin: '0 0 2px 0', fontSize: '22px', color: '#004b87', fontWeight: '800', letterSpacing: '-0.5px' },
  navSubtitle: { margin: 0, fontSize: '11px', color: '#d32027', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' },
  mainContent: { flex: 1, width: '100%', maxWidth: '900px', margin: '0 auto', padding: '50px 20px', boxSizing: 'border-box' },
  pageHeader: { marginBottom: '40px', borderBottom: '1px solid #e9ecef', paddingBottom: '20px' },
  pageTitle: { color: '#1a1a1a', fontSize: '28px', margin: '0 0 10px 0', fontWeight: '700' },
  pageDescription: { color: '#6c757d', margin: 0, fontSize: '16px' },
  
  // Styles Formulaires
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' },
  sectionDivider: { gridColumn: 'span 2', height: '1px', backgroundColor: '#e9ecef', margin: '20px 0' },
  inputGroup: { display: 'flex', flexDirection: 'column', marginBottom: '15px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#495057', marginBottom: '8px' },
  input: { width: '100%', padding: '12px 15px', border: '1px solid #ced4da', borderRadius: '6px', fontSize: '15px', backgroundColor: '#f8f9fa', boxSizing: 'border-box', outline: 'none' },
  
  // Boutons
  actionRow: { marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  btnPrimary: { padding: '12px 28px', backgroundColor: '#004b87', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', backgroundColor: 'transparent', color: '#6c757d', border: '1px solid #ced4da', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  switchText: { marginTop: '15px', fontSize: '14px', color: '#6c757d' },
  linkText: { color: '#d32027', fontWeight: '600', cursor: 'pointer', textDecoration: 'none' },
  
  // Login & Dashboard
  centerContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' },
  loginBox: { width: '100%', maxWidth: '400px', backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', border: '1px solid #e9ecef', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' },
  dashboardCard: { backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' },

  // --- NOUVEAUX STYLES : CHAT TYPE GEMINI ---
  geminiLayout: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    backgroundColor: '#ffffff',
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif'
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#f0f4f9', 
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 15px',
    boxSizing: 'border-box',
    borderRight: '1px solid #e9ecef'
  },
  newChatBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#ffffff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a1a',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    width: '100%',
    marginBottom: '10px'
  },
  sidebarMiddle: { flex: 1, overflowY: 'auto' },
  sidebarSubtitle: { fontSize: '13px', color: '#444746', fontWeight: '600', marginBottom: '10px', paddingLeft: '10px' },
  historyItem: { padding: '12px 10px', borderRadius: '8px', fontSize: '14px', color: '#1a1a1a', cursor: 'pointer', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  sidebarBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '15px' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  userAvatar: { width: '35px', height: '35px', backgroundColor: '#d32027', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' },
  userName: { fontSize: '14px', fontWeight: '600', color: '#1a1a1a' },
  userPro: { fontSize: '12px', color: '#6c757d' },
  settingsBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#444746' },
  chatMainArea: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' },
  chatHeader: { padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e9ecef' },
  chatWindowFixed: { flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexDirection: 'column', gap: '15px' },
  bubbleUser: { display: 'inline-block', backgroundColor: '#f0f4f9', color: '#1a1a1a', padding: '14px 20px', borderRadius: '20px 20px 0 20px', maxWidth: '75%', fontSize: '15px', lineHeight: '1.5', whiteSpace: 'pre-wrap'},
  bubbleBot: { display: 'inline-block', backgroundColor: '#ffffff', color: '#1a1a1a', padding: '14px 20px', borderRadius: '20px 20px 20px 0', maxWidth: '75%', fontSize: '15px', lineHeight: '1.5', border: '1px solid #e9ecef', whiteSpace: 'pre-wrap' },
  chatInputContainer: { padding: '20px 40px 40px 40px', display: 'flex', gap: '10px', backgroundColor: '#ffffff' }
};

export default App;


