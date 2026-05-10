import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, onDisconnect } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

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

// ゲーム変数
let myRole = null; // player1 or player2
let roomId = "global_room"; 
let playerLife = 3;
let enemyLife = 3;
let myFormation = [];
const CARD_TYPES = [
    { name: 'fire', icon: '🔥' },
    { name: 'water', icon: '💧' },
    { name: 'grass', icon: '🌿' }
];

// --- 1. 初期化とマッチング ---
const roomRef = ref(db, `rooms/${roomId}`);

onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    
    if (!myRole) {
        if (!data || !data.player1) {
            myRole = 'player1';
            set(ref(db, `rooms/${roomId}/player1`), { life: 3, status: 'waiting' });
        } else if (!data.player2) {
            myRole = 'player2';
            update(ref(db, `rooms/${roomId}/player2`), { life: 3, status: 'waiting' });
        } else {
            alert("満員です。観戦モード（または別ID）が必要です。");
            return;
        }
        // 切断時にデータを削除
        onDisconnect(ref(db, `rooms/${roomId}/${myRole}`)).remove();
    }

    if (data) {
        updateGameStatus(data);
    }
});

// --- 2. カード生成と操作 ---
function createPool() {
    const pool = document.getElementById('card-pool');
    pool.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const typeObj = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
        const val = Math.floor(Math.random() * 9) + 1;
        const card = document.createElement('div');
        card.className = `card ${typeObj.name}`;
        card.innerHTML = `<span class="icon">${typeObj.icon}</span><span class="val">${val}</span>`;
        card.onclick = () => selectCard(card, typeObj.name, val);
        pool.appendChild(card);
    }
}

function selectCard(el, type, val) {
    if (myFormation.length >= 4) return;
    
    const slots = document.querySelectorAll('.slot');
    const targetSlot = slots[myFormation.length];
    
    myFormation.push({ type, val });
    targetSlot.appendChild(el);
    el.onclick = null; // 一度置いたら固定

    if (myFormation.length === 4) {
        document.getElementById('battle-btn').disabled = false;
    }
}

// --- 3. バトル送信 ---
document.getElementById('battle-btn').onclick = () => {
    update(ref(db, `rooms/${roomId}/${myRole}`), {
        formation: myFormation,
        status: 'ready'
    });
    document.getElementById('battle-btn').disabled = true;
    document.getElementById('status-msg').innerText = "相手の選択を待っています...";
};

// --- 4. 同期と判定 ---
function updateGameStatus(data) {
    const me = data[myRole];
    const opponentRole = myRole === 'player1' ? 'player2' : 'player1';
    const opp = data[opponentRole];

    // ライフ更新
    if (me) playerLife = me.life;
    if (opp) {
        enemyLife = opp.life;
        document.getElementById('status-msg').innerText = "相手が接続中...";
    }
    
    document.getElementById('player-life').querySelector('.heart').innerText = "❤".repeat(Math.max(0, playerLife));
    document.getElementById('enemy-life').querySelector('.heart').innerText = "❤".repeat(Math.max(0, enemyLife));

    // 両者Readyなら判定
    if (me?.status === 'ready' && opp?.status === 'ready') {
        processBattle(me.formation, opp.formation);
    }
}

function processBattle(myF, oppF) {
    const myScore = calculateScore(myF);
    const oppScore = calculateScore(oppF);
    
    let resultMsg = `Result: YOU(${myScore}) vs ENEMY(${oppScore}) - `;
    
    if (myScore > oppScore) {
        resultMsg += "WIN!";
        enemyLife--;
    } else if (myScore < oppScore) {
        resultMsg += "LOSE...";
        playerLife--;
    } else {
        resultMsg += "DRAW";
    }

    alert(resultMsg);

    // ライフが0ならリセット
    if (playerLife <= 0 || enemyLife <= 0) {
        alert(playerLife <= 0 ? "GAME OVER" : "VICTORY!");
        playerLife = 3;
        enemyLife = 3;
    }

    // 状態リセット
    myFormation = [];
    document.querySelectorAll('.slot').forEach(s => s.innerHTML = '');
    createPool();
    
    update(ref(db, `rooms/${roomId}/${myRole}`), {
        status: 'waiting',
        formation: null,
        life: playerLife
    });
}

function calculateScore(cards) {
    let score = cards.reduce((sum, c) => sum + c.val, 0);
    // 並び順ボーナス（隣り合う属性が同じなら+5）
    for (let i = 0; i < cards.length - 1; i++) {
        if (cards[i].type === cards[i+1].type) score += 5;
    }
    return score;
}

// 起動
createPool();