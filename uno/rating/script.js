// UNO积分场游戏逻辑 - 修复版本
const SUPABASE_URL = 'https://xwrgpngwmdjbmsziuodl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cmdwbmd3bWRqYm1zeml1b2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDUzNjksImV4cCI6MjA3NTcyMTM2OX0.kVpcSCmmwcLcs60C0BjPxyXFDxdl3V4ny-vutKsnbV8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let unoGame;
let isPlayerTurn = false;
let canDrawCard = true; // 控制摸牌频率

// 等待页面完全加载
window.addEventListener('load', function() {
    console.log('页面加载完成，开始初始化游戏...');
    
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
    if (!userData) {
        console.log('未找到用户数据');
        return null;
    }
    try {
        return JSON.parse(userData);
    } catch (e) {
        console.error('解析用户数据失败:', e);
        return null;
    }
}

function initGame(playerName) {
    console.log('初始化游戏，玩家:', playerName);
    
    try {
        // UI回调函数
        const uiCallbacks = {
            showMessage: showMessage,
            showColorSelection: showColorSelection,
            showTurtleTargetSelection: showTurtleTargetSelection,
            showGameResult: showGameResult,
            showScoreUpdate: showScoreUpdate,
            onAITurnComplete: updateGameUI // AI回合完成后更新UI
        };
        
        // 创建游戏实例
        unoGame = new UNOGame('rating', playerName, uiCallbacks);
        console.log('游戏实例创建成功');
        
        // 更新UI
        updateGameUI();
        
        // 绑定事件
        const unoButton = document.getElementById('unoButton');
        const drawButton = document.getElementById('drawButton');
        
        if (unoButton) {
            unoButton.addEventListener('click', () => {
                if (unoGame && isPlayerTurn) {
                    unoGame.callUno();
                    updateGameUI();
                }
            });
        }
        
        if (drawButton) {
            drawButton.addEventListener('click', () => {
                if (unoGame && isPlayerTurn && !unoGame.gameOver && canDrawCard) {
                    canDrawCard = false; // 防止连续点击
                    unoGame.drawCardForCurrentPlayer();
                    updateGameUI();
                    
                    // 1秒后重新允许摸牌
                    setTimeout(() => {
                        canDrawCard = true;
                    }, 1000);
                }
            });
        }
        
        // 初始消息
        showMessage('游戏开始！');
        
    } catch (error) {
        console.error('游戏初始化失败:', error);
        showMessage('游戏初始化失败，请刷新页面重试');
    }
}

function updateGameUI() {
    if (!unoGame) {
        console.log('游戏实例不存在，无法更新UI');
        return;
    }
    
    try {
        // 更新牌堆数量（现在显示在中央牌堆上）
        const deckCountElement = document.getElementById('deckCount');
        if (deckCountElement) {
            deckCountElement.textContent = `${unoGame.deck.length}张`;
        }
        
        // 检查当前玩家
        isPlayerTurn = (unoGame.players[unoGame.currentPlayerIndex].isHuman && !unoGame.gameOver);
        
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
        
        // 如果是AI回合，显示AI行动
        if (!isPlayerTurn && !unoGame.gameOver) {
            showMessage(`${unoGame.players[unoGame.currentPlayerIndex].name}正在思考...`);
        }
        
    } catch (error) {
        console.error('更新UI失败:', error);
    }
}

function updateOpponentsUI() {
    for (let i = 1; i < 4; i++) {
        const opponent = document.getElementById(`opponent${i}`);
        if (!opponent) continue;
        
        const player = unoGame.players[i];
        if (!player) continue;
        
        // 更新名称和牌数
        const nameElement = opponent.querySelector('.opponent-name');
        const countElement = opponent.querySelector('.card-count');
        
        if (nameElement) nameElement.textContent = player.name;
        if (countElement) countElement.textContent = `${player.cards.length}张`;
        
        // 高亮当前玩家
        if (unoGame.currentPlayerIndex === i) {
            opponent.classList.add('current-player');
            showMessage(`${player.name}的回合`);
        } else {
            opponent.classList.remove('current-player');
        }
    }
}

function updateCenterArea() {
    // 更新当前牌
    const currentCard = document.getElementById('currentCard');
    if (currentCard && unoGame.discardPile.length > 0) {
        const topCard = unoGame.discardPile[unoGame.discardPile.length - 1];
        currentCard.innerHTML = '';
        const cardElement = createCardElement(topCard, false);
        currentCard.appendChild(cardElement);
        
        // 显示AI出的牌
        if (!unoGame.players[unoGame.currentPlayerIndex].isHuman && unoGame.discardPile.length > 1) {
            const previousPlayerIndex = (unoGame.currentPlayerIndex - 1 + 4) % 4;
            if (!unoGame.players[previousPlayerIndex].isHuman) {
                showMessage(`${unoGame.players[previousPlayerIndex].name}出了${getCardDisplayName(topCard)}`);
            }
        }
    }
    
    // 更新当前颜色
    const currentColorElement = document.getElementById('currentColor');
    if (currentColorElement) {
        currentColorElement.textContent = `当前颜色: ${getColorName(unoGame.currentColor)}`;
    }
    
    // 更新牌堆点击事件 - 只在玩家回合可以摸牌
    const drawPile = document.getElementById('drawPile');
    if (drawPile) {
        drawPile.onclick = () => {
            if (isPlayerTurn && !unoGame.gameOver && canDrawCard) {
                canDrawCard = false;
                unoGame.drawCardForCurrentPlayer();
                updateGameUI();
                
                // 1秒后重新允许摸牌
                setTimeout(() => {
                    canDrawCard = true;
                }, 1000);
            }
        };
    }
}

function updatePlayerHand() {
    const playerHand = document.getElementById('playerHand');
    if (!playerHand) return;
    
    playerHand.innerHTML = '';
    
    const humanPlayer = unoGame.players[0];
    if (!humanPlayer || !humanPlayer.cards) return;
    
    humanPlayer.cards.forEach((card, index) => {
        const cardElement = createCardElement(card, true);
        cardElement.addEventListener('click', () => {
            if (isPlayerTurn && !unoGame.gameOver) {
                // 直接检查是否可以出牌，不依赖getPlayableCards方法
                if (canPlayCard(card)) {
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

// 直接检查卡牌是否可以出
function canPlayCard(card) {
    // 黑色牌总是可以出
    if (card.color === 'black') return true;
    
    // 同颜色或同数值的牌可以出
    if (card.color === unoGame.currentColor || card.value === unoGame.currentValue) return true;
    
    return false;
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
    if (card.value === 'turtle') displayValue = '乌龟';
    if (card.value === 'wild') displayValue = '万能';
    if (card.value === 'skip') displayValue = '禁止';
    if (card.value === 'reverse') displayValue = '翻转';
    
    cardElement.textContent = displayValue;
    
    return cardElement;
}

function updateGameInfo() {
    const currentPlayerElement = document.getElementById('currentPlayer');
    const gameDirectionElement = document.getElementById('gameDirection');
    
    if (currentPlayerElement) {
        const currentPlayer = unoGame.players[unoGame.currentPlayerIndex];
        currentPlayerElement.textContent = `当前回合: ${currentPlayer.name}`;
        
        // 高亮显示当前回合
        if (currentPlayer.isHuman) {
            currentPlayerElement.style.color = '#ffcc00';
            currentPlayerElement.style.fontWeight = 'bold';
        } else {
            currentPlayerElement.style.color = '#ffffff';
            currentPlayerElement.style.fontWeight = 'normal';
        }
    }
    
    if (gameDirectionElement) {
        gameDirectionElement.textContent = `方向: ${unoGame.direction === 1 ? '顺时针' : '逆时针'}`;
    }
}

function updateButtons() {
    const unoButton = document.getElementById('unoButton');
    const drawButton = document.getElementById('drawButton');
    
    if (!unoButton || !drawButton) return;
    
    // 更新UNO按钮状态
    if (unoGame.unoButtonEnabled && isPlayerTurn) {
        unoButton.disabled = false;
        unoButton.style.opacity = '1';
    } else {
        unoButton.disabled = true;
        unoButton.style.opacity = '0.5';
    }
    
    // 更新摸牌按钮状态
    if (isPlayerTurn && !unoGame.gameOver) {
        drawButton.disabled = false;
        drawButton.style.opacity = '1';
    } else {
        drawButton.disabled = true;
        drawButton.style.opacity = '0.5';
    }
}

function showMessage(message) {
    const messageElement = document.getElementById('gameMessage');
    if (!messageElement) return;
    
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

function getCardDisplayName(card) {
    let displayValue = card.value;
    if (card.value === 'draw2') displayValue = '+2';
    if (card.value === 'draw4') displayValue = '+4';
    if (card.value === 'draw5') displayValue = '+5';
    if (card.value === 'draw6') displayValue = '+6';
    if (card.value === 'draw7') displayValue = '+7';
    if (card.value === 'turtle') displayValue = '乌龟';
    if (card.value === 'wild') displayValue = '万能';
    if (card.value === 'skip') displayValue = '禁止';
    if (card.value === 'reverse') displayValue = '翻转';
    
    return `${getColorName(card.color)} ${displayValue}`;
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
                <button id="playAgain">再玩一局</button>
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
