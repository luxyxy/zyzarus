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

document.getElementById('join-btn').onclick = async () => {
    roomId = document.getElementById('room-input').value;
    if (roomId.length !== 4) return alert("Enter 4 digits.");

    const roomRef = ref(db, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    const data = snapshot.val();

    // マッチング判定
    if (!data || !data.player1) {
        myRole = 'player1';
        await set(ref(db, `rooms/${roomId}/player1`), { life: 3, status: 'waiting' });
    } else if (!data.player2) {
        myRole = 'player2';
        await update(ref(db, `rooms/${roomId}/player2`), { life: 3, status: 'waiting' });
    } else {
        alert("Room Full");
        return;
    }

    // 入室成功後に監視を開始
    onDisconnect(ref(db, `rooms/${roomId}/${myRole}`)).remove();
    startListener();
    setupGameUI();
};

function startListener() {
    onValue(ref(db, `rooms/${roomId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) syncGame(data);
    });

    onValue(ref(db, `rooms/${roomId}/chats`), (snapshot) => {
        const logs = document.getElementById('chat-logs');
        logs.innerHTML = '';
        snapshot.forEach(child => {
            const m = child.val();
            logs.innerHTML += `<div><b>${m.user}:</b> ${m.text}</div>`;
        });
        logs.scrollTop = logs.scrollHeight;
    });
}

// 以降の calculateTotal, createPool, selectCard 等は以前のロジックと同じ
// ただし、syncGame 内で判定が終わった際に remove(ref(db, `rooms/${roomId}`)) を
// 呼び出すことで、ルーム情報をきれいにリセットします。import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, onDisconnect, remove, push } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// --- Firebase Configuration ---
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

// --- Game Variables ---
let myRole = null;
let roomId = "";
let playerLife = 3;
let enemyLife = 3;
let myFormation = [];
const CARD_TYPES = ['FIRE', 'WATER', 'GRASS'];

// --- 1. Room Connection ---
document.getElementById('join-btn').onclick = () => {
    const input = document.getElementById('room-input').value;
    if (input.length !== 4) {
        alert("Please enter exactly 4 digits.");
        return;
    }
    roomId = input;
    initRoom();
};

function initRoom() {
    const roomRef = ref(db, `rooms/${roomId}`);
    
    // データ監視開始
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        
        // ロール（Player1/2）の割り当て
        if (!myRole) {
            if (!data || !data.player1) {
                myRole = 'player1';
                set(ref(db, `rooms/${roomId}/player1`), { life: 3, status: 'waiting' });
            } else if (!data.player2) {
                myRole = 'player2';
                update(ref(db, `rooms/${roomId}/player2`), { life: 3, status: 'waiting' });
            } else {
                alert("Room is full.");
                return;
            }
            // 接続が切れたら自分のデータを消去
            onDisconnect(ref(db, `rooms/${roomId}/${myRole}`)).remove();
            setupGameUI();
        }

        if (data) syncGameState(data);
    });

    // チャットの同期
    onValue(ref(db, `rooms/${roomId}/chats`), (snapshot) => {
        const logs = document.getElementById('chat-logs');
        logs.innerHTML = '';
        snapshot.forEach((child) => {
            const msg = child.val();
            const div = document.createElement('div');
            div.className = 'chat-entry';
            div.innerText = `[${msg.user}] ${msg.text}`;
            logs.appendChild(div);
        });
        logs.scrollTop = logs.scrollHeight;
    });
}

function setupGameUI() {
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('current-room-id').innerText = roomId;
    createPool();
}

// --- 2. Card Mechanics ---
function createPool() {
    const pool = document.getElementById('card-pool');
    pool.innerHTML = '';
    myFormation = [];
    document.querySelectorAll('.slot').forEach(s => s.innerHTML = '');
    
    for (let i = 0; i < 6; i++) {
        const type = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
        const val = Math.floor(Math.random() * 9) + 1;
        
        const card = document.createElement('div');
        card.className = `card ${type.toLowerCase()}`;
        card.innerHTML = `<div class="type-label">${type}</div><div class="val">${val}</div>`;
        
        card.onclick = () => selectCard(card, type, val);
        pool.appendChild(card);
    }
    document.getElementById('battle-btn').disabled = true;
}

function selectCard(el, type, val) {
    if (myFormation.length >= 4) return;
    
    const slots = document.querySelectorAll('.slot');
    myFormation.push({ type, val });
    
    slots[myFormation.length - 1].appendChild(el);
    el.onclick = null; // 配置後はクリック不可
    
    if (myFormation.length === 4) {
        document.getElementById('battle-btn').disabled = false;
    }
}

// --- 3. Communication & Battle ---
document.getElementById('battle-btn').onclick = () => {
    update(ref(db, `rooms/${roomId}/${myRole}`), {
        formation: myFormation,
        status: 'ready'
    });
    document.getElementById('battle-btn').disabled = true;
    document.getElementById('status-msg').innerText = "Waiting for Opponent...";
};

document.getElementById('chat-send').onclick = sendChatMessage;
document.getElementById('chat-input').onkeypress = (e) => {
    if (e.key === 'Enter') sendChatMessage();
};

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input.value.trim()) return;
    push(ref(db, `rooms/${roomId}/chats`), {
        user: myRole,
        text: input.value
    });
    input.value = '';
}

// --- 4. Logic & Cleanup ---
function syncGameState(data) {
    const me = data[myRole];
    const oppRole = (myRole === 'player1') ? 'player2' : 'player1';
    const opp = data[oppRole];

    if (me) {
        playerLife = me.life;
        document.querySelector('#player-life .life-count').innerText = playerLife;
    }
    if (opp) {
        enemyLife = opp.life;
        document.querySelector('#enemy-life .life-count').innerText = enemyLife;
    }

    // 両者が準備完了したら計算
    if (me?.status === 'ready' && opp?.status === 'ready') {
        const myScore = calculateTotal(me.formation);
        const oppScore = calculateTotal(opp.formation);

        let resultText = `YOU: ${myScore.toFixed(1)} vs ENEMY: ${oppScore.toFixed(1)}\n`;
        let newLife = playerLife;

        if (myScore > oppScore) {
            resultText += "YOU WIN THIS ROUND!";
        } else if (myScore < oppScore) {
            resultText += "YOU LOSE THIS ROUND...";
            newLife--;
        } else {
            resultText += "DRAW!";
        }

        alert(resultText);

        // 決着判定
        if (newLife <= 0 || (opp.life <= 0 && myScore > oppScore)) {
            const finalMsg = newLife <= 0 ? "GAME OVER..." : "VICTORY!";
            alert(finalMsg + "\nRoom data will be deleted.");
            
            // データを完全に削除してリロード
            remove(ref(db, `rooms/${roomId}`)).then(() => {
                location.reload();
            });
        } else {
            // 次のターンへ
            createPool();
            update(ref(db, `rooms/${roomId}/${myRole}`), {
                status: 'waiting',
                formation: null,
                life: newLife
            });
            document.getElementById('status-msg').innerText = "Pick 4 Cards";
        }
    }
}

function calculateTotal(cards) {
    let base = cards.reduce((sum, c) => sum + c.val, 0);
    let multiplier = 1.0;
    
    // 同属性が並ぶとコンボ（左から順に判定）
    for (let i = 0; i < cards.length - 1; i++) {
        if (cards[i].type === cards[i + 1].type) {
            multiplier += 0.2; // 1つ並ぶごとに+20%
        }
    }
    return base * multiplier;
}
