import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}; // 👈 就是這個大括號跟分號剛才不小心漏掉了！

let app, auth, db;

try {
  // 🛡️ 檢查金鑰是否有被 Replit 讀到
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
    throw new Error("找不到 Firebase API Key！請確認 Replit 的 Secrets 工具是否有正確設定。");
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("✅ Firebase 初始化成功！");
} catch (error) {
  console.error("❌ Firebase 初始化失敗：", error);
  alert("系統發生錯誤：" + error.message);
}

export { auth, db };
