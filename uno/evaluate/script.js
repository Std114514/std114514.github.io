// UNO积分场游戏逻辑
const SUPABASE_URL = 'https://xwrgpngwmdjbmsziuodl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cmdwbmd3bWRqYm1zeml1b2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDUzNjksImV4cCI6MjA3NTcyMTM2OX0.kVpcSCmmwcLcs60C0BjPxyXFDxdl3V4ny-vutKsnbV8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let unoGame;

document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    const user = checkAuthStatus();
    if (!user) {
        alert('请先登录！');
        window.location.href = '/auth/';
        return;
    }
    
    // 初始化游戏
    initGame(user.username);
});

function checkAuthStatus() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

function initGame(playerName) {
    // UI回调函数
    const uiCallbacks = {
        showMessage: showMessage,
        showColorSelection: showColorSelection,
        showTurtleTargetSelection: showTurtleTargetSelection,
        showGameResult: showGameResult,
        showScoreUpdate: showScoreUpdate
    };
    
    // 创建游戏实例
    unoGame = new UNOGame('evaluate', playerName, uiCallbacks);
    
    // 更新UI
    updateGameUI();
    
    // 绑定事件
    document.getElementById('unoButton').addEventListener('click', () => {
        unoGame.callUno();
        updateGameUI();
    });
    
    document.getElementById('drawButton').addEventListener('click', () => {
        if (unoGame.players[unoGame.currentPlayerIndex].isHuman && !unoGame.gameOver) {
            unoGame.drawCardForCurrentPlayer();
            updateGameUI();
        }
    });
    
    // 初始消息
    showMessage('游戏开始！');
}

function updateGameUI() {
    // 更新玩家名称
    document.getElementById('playerName').textContent = unoGame.players[0].name;
    
    // 更新牌堆数量
    document.getElementById('deckCount').textContent = `牌堆: ${unoGame.deck.length}`;
    
    // 更新对手信息
    updateOpponentsUI();
    
    // 更新中央区域
    updateCenterArea();
    
    // 更新玩家手牌
    updatePlayerHand();
    
    // 更新游戏信息
    updateGameInfo();
    
    // 更新按钮状态
    updateButtons();
}

function updateOpponentsUI() {
    for (let i = 1; i < 4; i++) {
        const opponent = document.getElementById(`opponent${i}`);
        const player = unoGame.players[i];
        
        // 更新名称和牌数
        opponent.querySelector('.opponent-name').textContent = player.name;
        opponent.querySelector('.card-count').textContent = `${player.cards.length}张`;
        
        // 高亮当前玩家
        if (unoGame.currentPlayerIndex === i) {
            opponent.classList.add('current-player');
        } else {
            opponent.classList.remove('current-player');
        }
    }
}

function updateCenterArea() {
    // 更新当前牌
    const currentCard = document.getElementById('currentCard');
    if (unoGame.discardPile.length > 0) {
        const topCard = unoGame.discardPile[unoGame.discardPile.length - 1];
        currentCard.innerHTML = '';
        const cardElement = createCardElement(topCard, false);
        currentCard.appendChild(cardElement);
    }
    
    // 更新当前颜色
    document.getElementById('currentColor').textContent = `当前颜色: ${getColorName(unoGame.currentColor)}`;
    
    // 更新牌堆点击事件
    const drawPile = document.getElementById('drawPile');
    drawPile.onclick = () => {
        if (unoGame.players[unoGame.currentPlayerIndex].isHuman && !unoGame.gameOver) {
            unoGame.drawCardForCurrentPlayer();
            updateGameUI();
        }
    };
}

function updatePlayerHand() {
    const playerHand = document.getElementById('playerHand');
    playerHand.innerHTML = '';
    
    const humanPlayer = unoGame.players[0];
    humanPlayer.cards.forEach((card, index) => {
        const cardElement = createCardElement(card, true);
        cardElement.addEventListener('click', () => {
            if (unoGame.players[unoGame.currentPlayerIndex].isHuman && !unoGame.gameOver) {
                const playableCards = unoGame.getPlayableCards(humanPlayer.cards);
                if (playableCards.includes(card)) {
                    unoGame.playCard(card, index);
                    updateGameUI();
                } else {
                    showMessage('这张牌不能出！');
                }
            }
        });
        playerHand.appendChild(cardElement);
    });
}

function createCardElement(card, isPlayable) {
    const cardElement = document.createElement('div');
    cardElement.className = `card ${card.color} ${isPlayable ? 'playable' : ''}`;
    
    let displayValue = card.value;
    if (card.value === 'draw2') displayValue = '+2';
    if (card.value === 'draw4') displayValue = '+4';
    if (card.value === 'draw5') displayValue = '+5';
    if (card.value === 'draw6') displayValue = '+6';
    if (card.value === 'draw7') displayValue = '+7';
    if (card.value === 'turtle') displayValue = '龟';
    if (card.value === 'wild') displayValue = '变';
    if (card.value === 'skip') displayValue = '跳';
    if (card.value === 'reverse') displayValue = '反';
    
    cardElement.textContent = displayValue;
    
    return cardElement;
}

function updateGameInfo() {
    document.getElementById('currentPlayer').textContent = 
        `当前回合: ${unoGame.players[unoGame.currentPlayerIndex].name}`;
    
    document.getElementById('gameDirection').textContent = 
        `方向: ${unoGame.direction === 1 ? '顺时针' : '逆时针'}`;
}

function updateButtons() {
    const unoButton = document.getElementById('unoButton');
    const drawButton = document.getElementById('drawButton');
    
    // 更新UNO按钮状态
    if (unoGame.unoButtonEnabled && unoGame.players[unoGame.currentPlayerIndex].isHuman) {
        unoButton.disabled = false;
    } else {
        unoButton.disabled = true;
    }
    
    // 更新摸牌按钮状态
    if (unoGame.players[unoGame.currentPlayerIndex].isHuman && !unoGame.gameOver) {
        drawButton.disabled = false;
    } else {
        drawButton.disabled = true;
    }
}

function showMessage(message) {
    const messageElement = document.getElementById('gameMessage');
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    
    // 3秒后清除消息
    setTimeout(() => {
        if (messageElement.textContent === message) {
            messageElement.style.display = 'none';
        }
    }, 3000);
}

function getColorName(color) {
    const colorNames = {
        'red': '红色',
        'blue': '蓝色',
        'green': '绿色',
        'yellow': '黄色',
        'black': '黑色'
    };
    
    return colorNames[color] || color;
}

// 显示颜色选择对话框
function showColorSelection(callback) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>选择颜色</h3>
            <div class="color-options">
                <button class="color-option red" data-color="red">红色</button>
                <button class="color-option blue" data-color="blue">蓝色</button>
                <button class="color-option green" data-color="green">绿色</button>
                <button class="color-option yellow" data-color="yellow">黄色</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定颜色选择事件
    modal.querySelectorAll('.color-option').forEach(button => {
        button.addEventListener('click', () => {
            const color = button.getAttribute('data-color');
            document.body.removeChild(modal);
            callback(color);
        });
    });
}

// 显示乌龟牌目标选择对话框
function showTurtleTargetSelection(players, callback) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>选择乌龟牌目标</h3>
            <div class="target-options">
                ${players.map((player, index) => 
                    player.isHuman ? '' : 
                    `<button class="target-option" data-index="${index}">${player.name}</button>`
                ).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定目标选择事件
    modal.querySelectorAll('.target-option').forEach(button => {
        button.addEventListener('click', () => {
            const targetIndex = parseInt(button.getAttribute('data-index'));
            document.body.removeChild(modal);
            callback(targetIndex);
        });
    });
}

// 显示游戏结果
function showGameResult(rankings, userRanking) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    let resultsHTML = '<h3>游戏结束！</h3><div class="rankings">';
    rankings.forEach(ranking => {
        resultsHTML += `<div class="ranking-item">第${ranking.rank}名: ${ranking.name}</div>`;
    });
    resultsHTML += '</div>';
    
    modal.innerHTML = `
        <div class="modal-content">
            ${resultsHTML}
            <div class="modal-actions">
                <button id="playAgain">再玩一次</button>
                <button id="backToLobby">返回大厅</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定按钮事件
    document.getElementById('playAgain').addEventListener('click', () => {
        document.body.removeChild(modal);
        location.reload();
    });
    
    document.getElementById('backToLobby').addEventListener('click', () => {
        document.body.removeChild(modal);
        window.location.href = '/uno/';
    });
}

// 显示积分更新
function showScoreUpdate(oldScore, newScore, change) {
    const changeText = change > 0 ? `+${change}` : change;
    showMessage(`积分更新: ${oldScore} → ${newScore} (${changeText})`);
}
