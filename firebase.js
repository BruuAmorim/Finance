// Firebase Web SDK - inicialização do app
// Preencha firebaseConfig com os dados do seu projeto (Console Firebase > Configurações do app)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// TODO: substitua pelos valores do seu projeto Firebase
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "financeevacloudd.firebaseapp.com",
  projectId: "financeevacloudd",
  storageBucket: "financeevacloudd.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

// Inicializa o Firebase
export const firebaseApp = initializeApp(firebaseConfig);

