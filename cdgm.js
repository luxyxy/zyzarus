import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, onDisconnect, remove, push, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBAOiPSwk157dCGxe9eM3iRmLTX0PXZWL4",
    authDomain: "cardgame1-cb2bb.firebaseapp.com",
    databaseURL: "https://cardgame1-cb2bb-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cardgame1-cb2bb",
    storageBucket: "cardgame1-cb2bb.firebasestorage.app",
    messagingSenderId: "549281959353",
    appId: "1:549281959353:web:449c4c510f7595db7cfa68"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let myRole = null;
let roomId = "";
let myFormation = [];

// ボタンクリックのイベントを確実に拾うための修正
const joinBtn = document.getElementById('join-btn');
joinBtn.addEventListener('click', function() {
    const inputEl = document.getElementById('room-input');
    roomId = inputEl.value;
    
    if (roomId.length !== 4) {
        alert("4桁の数字を入力してください。");
        return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    
    // get()を使用して確実に一度だけデータを取得
    get(roomRef).then((snapshot) => {
        const data = snapshot.val();

        if (!data || !data.player1) {
            myRole = 'player1';
            return set(ref(db, `rooms/${roomId}/player1`), { life: 3, status: 'waiting' });
        } else if (!data.player2) {
            myRole = 'player2';
            return update(ref(db, `rooms/${roomId}/player2`), { life: 3, status: 'waiting' });
        } else {
            throw new Error("FULL");
        }
    }).then(() => {
        // 入室成功時の処理
        onDisconnect(ref(db, `rooms/${roomId}/${myRole}`)).remove();
        startListener();
        setupGameUI();
    }).catch((err) => {
        if(err.message === "FULL") alert("満員です。");
        else alert("通信エラー: " + err.message);
    });
});

// ゲーム開始後の監視
function startListener() {
    onValue(ref(db, `rooms/${roomId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) syncGame(data);
    });

    onValue(ref(db, `rooms/${roomId}/chats`), (snapshot) => {
        const logs = document.getElementById('chat-logs');
        let html = "";
        snapshot.forEach(child => {
            const m = child.val();
            html += `<div><b>${m.user}:</b> ${m.text}</div>`;
        });
        logs.innerHTML = html;
        logs.scrollTop = logs.scrollHeight;
    });
}
