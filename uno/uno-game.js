// UNO游戏核心逻辑
class UNOGame {
    constructor(mode, playerName, uiCallbacks) {
        this.mode = mode; // 'rating' 或 'evaluate'
        this.playerName = playerName;
        this.uiCallbacks = uiCallbacks; // UI回调函数
        
        this.players = [
            { name: playerName, cards: [], isHuman: true, unoCalled: false },
            { name: "player1", cards: [], isHuman: false, unoCalled: false },
            { name: "player2", cards: [], isHuman: false, unoCalled: false },
            { name: "player3", cards: [], isHuman: false, unoCalled: false }
        ];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1: 顺时针, -1: 逆时针
        this.deck = [];
        this.discardPile = [];
        this.currentColor = null;
        this.currentValue = null;
        this.pendingDraw = 0;
        this.pendingDrawTarget = null;
        this.gameOver = false;
        this.winner = null;
        this.unoButtonEnabled = false;
        this.turtleTarget = null; // 乌龟牌目标玩家
        
        this.initializeDeck();
        this.shuffleDeck();
        this.dealCards();
        this.startGame();
    }
    
    // 初始化牌堆
    initializeDeck() {
        this.deck = [];
        const colors = ['red', 'blue', 'green', 'yellow'];
        const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
        
        // 标准108张牌
        for (let color of colors) {
            // 0号牌每种颜色1张
            this.deck.push({ color, value: '0', type: 'number' });
            
            // 1-9号牌每种颜色2张
            for (let value of values.slice(1, 10)) {
                this.deck.push({ color, value, type: 'number' });
                this.deck.push({ color, value, type: 'number' });
            }
            
            // 功能牌每种颜色2张
            for (let value of values.slice(10)) {
                this.deck.push({ color, value, type: 'action' });
                this.deck.push({ color, value, type: 'action' });
            }
        }
        
        // 黑色牌
        for (let i = 0; i < 4; i++) {
            this.deck.push({ color: 'black', value: 'wild', type: 'wild' });
            this.deck.push({ color: 'black', value: 'draw4', type: 'wild' });
        }
        
        // 特殊牌
        this.deck.push({ color: 'black', value: 'draw5', type: 'special' });
        this.deck.push({ color: 'black', value: 'draw5', type: 'special' });
        this.deck.push({ color: 'black', value: 'draw6', type: 'special' });
        this.deck.push({ color: 'black', value: 'draw7', type: 'special' });
        
        // 乌龟牌
        for (let color of colors) {
            this.deck.push({ color, value: 'turtle', type: 'special' });
            this.deck.push({ color, value: 'turtle', type: 'special' });
        }
    }
    
    // 洗牌
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    // 发牌
    dealCards() {
        for (let player of this.players) {
            for (let i = 0; i < 7; i++) {
                player.cards.push(this.drawCard());
            }
        }
    }
    
    // 从牌堆抽牌
    drawCard() {
        if (this.deck.length <= 15) {
            // 补两副牌
            const newDeck = [];
            const colors = ['red', 'blue', 'green', 'yellow'];
            const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
            
            // 添加标准牌
            for (let color of colors) {
                newDeck.push({ color, value: '0', type: 'number' });
                for (let value of values.slice(1, 10)) {
                    newDeck.push({ color, value, type: 'number' });
                    newDeck.push({ color, value, type: 'number' });
                }
                for (let value of values.slice(10)) {
                    newDeck.push({ color, value, type: 'action' });
                    newDeck.push({ color, value, type: 'action' });
                }
            }
            
            // 添加黑色牌和特殊牌
            for (let i = 0; i < 4; i++) {
                newDeck.push({ color: 'black', value: 'wild', type: 'wild' });
                newDeck.push({ color: 'black', value: 'draw4', type: 'wild' });
            }
            
            newDeck.push({ color: 'black', value: 'draw5', type: 'special' });
            newDeck.push({ color: 'black', value: 'draw5', type: 'special' });
            newDeck.push({ color: 'black', value: 'draw6', type: 'special' });
            newDeck.push({ color: 'black', value: 'draw7', type: 'special' });
            
            for (let color of colors) {
                newDeck.push({ color, value: 'turtle', type: 'special' });
                newDeck.push({ color, value: 'turtle', type: 'special' });
            }
            
            // 洗混新牌并添加到牌堆
            for (let i = newDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
            }
            
            this.deck = this.deck.concat(newDeck);
            this.uiCallbacks.showMessage("牌堆已补充！");
        }
        
        if (this.deck.length === 0) {
            // 如果牌堆空了，从弃牌堆重新洗牌（除了最上面一张）
            const topCard = this.discardPile.pop();
            this.deck = this.discardPile;
            this.discardPile = [topCard];
            this.shuffleDeck();
            this.uiCallbacks.showMessage("弃牌堆已重新洗牌！");
        }
        
        return this.deck.pop();
    }
    
    // 开始游戏
    startGame() {
        // 从牌堆抽一张牌作为起始牌
        let startCard = this.drawCard();
        while (startCard.color === 'black') {
            // 如果第一张是黑色牌，重新抽
            this.deck.unshift(startCard);
            startCard = this.drawCard();
        }
        
        this.discardPile.push(startCard);
        this.currentColor = startCard.color;
        this.currentValue = startCard.value;
        
        // 随机决定起始玩家
        this.currentPlayerIndex = Math.floor(Math.random() * 4);
        this.uiCallbacks.showMessage(`游戏开始！${this.players[this.currentPlayerIndex].name}先手`);
        
        // 处理起始牌的特殊效果
        this.handleCardEffect(startCard);
        
        // 如果起始玩家不是人类玩家，开始AI回合
        if (!this.players[this.currentPlayerIndex].isHuman) {
            setTimeout(() => this.aiTurn(), 1000);
        }
    }
    
    // 处理卡牌效果
    handleCardEffect(card) {
        switch (card.value) {
            case 'skip':
                this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了跳过牌！`);
                this.nextPlayer();
                break;
            case 'reverse':
                this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了反转牌！`);
                this.direction *= -1;
                break;
            case 'draw2':
                this.pendingDraw += 2;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了+2牌！${this.players[this.pendingDrawTarget].name}需要摸2张牌`);
                break;
            case 'draw4':
                this.pendingDraw += 4;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了+4牌！${this.players[this.pendingDrawTarget].name}需要摸4张牌`);
                break;
            case 'draw5':
                this.pendingDraw += 5;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了+5牌！${this.players[this.pendingDrawTarget].name}需要摸5张牌`);
                break;
            case 'draw6':
                this.pendingDraw += 6;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了+6牌！${this.players[this.pendingDrawTarget].name}需要摸6张牌`);
                break;
            case 'draw7':
                this.pendingDraw += 7;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了+7牌！${this.players[this.pendingDrawTarget].name}需要摸7张牌`);
                break;
            case 'turtle':
                // 乌龟牌效果：指定任意一人+3张
                if (this.players[this.currentPlayerIndex].isHuman) {
                    this.uiCallbacks.showTurtleTargetSelection(this.players, (targetIndex) => {
                        this.turtleTarget = targetIndex;
                        this.pendingDraw += 3;
                        this.pendingDrawTarget = targetIndex;
                        this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了乌龟牌！${this.players[targetIndex].name}需要摸3张牌`);
                        this.nextPlayer();
                    });
                } else {
                    // AI随机选择一个目标（除了自己）
                    let targetIndex;
                    do {
                        targetIndex = Math.floor(Math.random() * 4);
                    } while (targetIndex === this.currentPlayerIndex);
                    
                    this.turtleTarget = targetIndex;
                    this.pendingDraw += 3;
                    this.pendingDrawTarget = targetIndex;
                    this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了乌龟牌！${this.players[targetIndex].name}需要摸3张牌`);
                }
                break;
            case 'wild':
                if (this.players[this.currentPlayerIndex].isHuman) {
                    this.uiCallbacks.showColorSelection((color) => {
                        this.currentColor = color;
                        this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了变色牌！颜色变为${this.getColorName(color)}`);
                        this.nextPlayer();
                    });
                } else {
                    // AI随机选择一个颜色
                    const colors = ['red', 'blue', 'green', 'yellow'];
                    this.currentColor = colors[Math.floor(Math.random() * 4)];
                    this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}使用了变色牌！颜色变为${this.getColorName(this.currentColor)}`);
                    this.nextPlayer();
                }
                break;
        }
    }
    
    // 获取颜色名称
    getColorName(color) {
        const colorNames = {
            'red': '红色',
            'blue': '蓝色',
            'green': '绿色',
            'yellow': '黄色',
            'black': '黑色'
        };
        return colorNames[color] || color;
    }
    
    // 获取下一个玩家索引
    getNextPlayerIndex() {
        let nextIndex = this.currentPlayerIndex + this.direction;
        if (nextIndex >= this.players.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = this.players.length - 1;
        return nextIndex;
    }
    
    // 切换到下一个玩家
    nextPlayer() {
        this.currentPlayerIndex = this.getNextPlayerIndex();
        
        // 重置UNO按钮状态
        if (this.players[this.currentPlayerIndex].isHuman) {
            this.unoButtonEnabled = true;
        } else {
            this.unoButtonEnabled = false;
        }
        
        // 检查游戏是否结束
        if (this.checkGameOver()) {
            this.endGame();
            return;
        }
        
        // 如果下一个玩家需要摸牌
        if (this.pendingDraw > 0 && this.pendingDrawTarget === this.currentPlayerIndex) {
            const player = this.players[this.currentPlayerIndex];
            this.uiCallbacks.showMessage(`${player.name}需要摸${this.pendingDraw}张牌！`);
            
            for (let i = 0; i < this.pendingDraw; i++) {
                player.cards.push(this.drawCard());
            }
            this.pendingDraw = 0;
            this.pendingDrawTarget = null;
            
            // 摸完牌后跳过回合
            this.nextPlayer();
            return;
        }
        
        // 显示当前玩家回合
        this.uiCallbacks.showMessage(`${this.players[this.currentPlayerIndex].name}的回合`);
        
        // 如果是AI玩家，开始AI回合
        if (!this.players[this.currentPlayerIndex].isHuman) {
            setTimeout(() => this.aiTurn(), 1000);
        }
    }
    
    // AI回合
    aiTurn() {
        const ai = this.players[this.currentPlayerIndex];
        
        // AI有87%概率喊UNO（当只剩一张牌时）
        if (ai.cards.length === 1 && Math.random() < 0.87) {
            ai.unoCalled = true;
            this.uiCallbacks.showMessage(`${ai.name}喊了UNO！`);
        }
        
        // 检查可以出的牌
        const playableCards = this.getPlayableCards(ai.cards);
        
        if (playableCards.length > 0) {
            // 按照策略选择出牌
            const cardToPlay = this.aiChooseCard(playableCards, ai.cards);
            this.playCard(cardToPlay, ai.cards.indexOf(cardToPlay));
        } else {
            // 不能出牌，摸一张
            this.uiCallbacks.showMessage(`${ai.name}无法出牌，摸一张牌`);
            this.drawCardForCurrentPlayer();
        }
    }
    
    // AI选择出牌策略
    aiChooseCard(playableCards, allCards) {
        // 策略1: 若只有相同颜色的牌能出，按优先级出牌
        const sameColorCards = playableCards.filter(card => card.color === this.currentColor);
        if (sameColorCards.length === playableCards.length) {
            return this.prioritizeCards(sameColorCards)[0];
        }
        
        // 策略2: 87%概率按策略1，13%概率随机出不同颜色相同符号的牌
        if (Math.random() < 0.87) {
            return this.prioritizeCards(playableCards)[0];
        } else {
            // 找出不同颜色但相同符号的牌
            const sameValueCards = playableCards.filter(card => 
                card.value === this.currentValue && card.color !== this.currentColor
            );
            if (sameValueCards.length > 0) {
                return sameValueCards[Math.floor(Math.random() * sameValueCards.length)];
            } else {
                return this.prioritizeCards(playableCards)[0];
            }
        }
    }
    
    // 卡牌优先级排序
    prioritizeCards(cards) {
        const priority = {
            '9': 1, '8': 2, '7': 3, '6': 4, '5': 5, 
            '4': 6, '3': 7, '2': 8, '1': 9, '0': 10,
            'reverse': 11, 'skip': 12, 'draw2': 13,
            'draw4': 14, 'draw5': 15, 'draw6': 16, 'draw7': 17,
            'turtle': 18, 'wild': 19
        };
        
        return cards.sort((a, b) => priority[a.value] - priority[b.value]);
    }
    
    // 获取可出的牌
    getPlayableCards(cards) {
        return cards.filter(card => {
            // 黑色牌总是可以出
            if (card.color === 'black') return true;
            
            // 同颜色或同数值的牌可以出
            if (card.color === this.currentColor || card.value === this.currentValue) return true;
            
            return false;
        });
    }
    
    // 出牌
    playCard(card, cardIndex) {
        const player = this.players[this.currentPlayerIndex];
        
        // 检查是否漏喊UNO
        if (player.cards.length === 2 && !player.unoCalled && player.isHuman) {
            this.uiCallbacks.showMessage("您漏喊UNO！罚摸2张牌");
            for (let i = 0; i < 2; i++) {
                player.cards.push(this.drawCard());
            }
        }
        
        // 从玩家手牌中移除
        player.cards.splice(cardIndex, 1);
        
        // 添加到弃牌堆
        this.discardPile.push(card);
        
        // 更新当前颜色和数值
        if (card.color !== 'black') {
            this.currentColor = card.color;
        }
        this.currentValue = card.value;
        
        this.uiCallbacks.showMessage(`${player.name}出了${this.getCardDisplayName(card)}`);
        
        // 处理卡牌效果
        this.handleCardEffect(card);
        
        // 如果是乌龟牌或变色牌，它们已经在handleCardEffect中处理了nextPlayer
        if (card.value !== 'turtle' && card.value !== 'wild') {
            // 检查是否赢了
            if (player.cards.length === 0) {
                this.winner = this.currentPlayerIndex;
                this.endGame();
                return;
            }
            
            // 切换到下一个玩家
            this.nextPlayer();
        }
    }
    
    // 获取卡牌显示名称
    getCardDisplayName(card) {
        let displayValue = card.value;
        if (card.value === 'draw2') displayValue = '+2';
        if (card.value === 'draw4') displayValue = '+4';
        if (card.value === 'draw5') displayValue = '+5';
        if (card.value === 'draw6') displayValue = '+6';
        if (card.value === 'draw7') displayValue = '+7';
        if (card.value === 'turtle') displayValue = '乌龟牌';
        if (card.value === 'wild') displayValue = '变色牌';
        if (card.value === 'skip') displayValue = '跳过牌';
        if (card.value === 'reverse') displayValue = '反转牌';
        
        return `${this.getColorName(card.color)} ${displayValue}`;
    }
    
    // 当前玩家摸一张牌
    drawCardForCurrentPlayer() {
        const player = this.players[this.currentPlayerIndex];
        const newCard = this.drawCard();
        player.cards.push(newCard);
        this.uiCallbacks.showMessage(`${player.name}摸了一张牌`);
        
        // 摸牌后跳过回合
        this.nextPlayer();
    }
    
    // 喊UNO
    callUno() {
        const player = this.players[this.currentPlayerIndex];
        if (player.isHuman && this.unoButtonEnabled) {
            if (player.cards.length === 2) {
                player.unoCalled = true;
                this.unoButtonEnabled = false;
                this.uiCallbacks.showMessage("您喊了UNO！");
            } else {
                this.uiCallbacks.showMessage("错误喊UNO！罚摸2张牌");
                for (let i = 0; i < 2; i++) {
                    player.cards.push(this.drawCard());
                }
            }
        }
    }
    
    // 检查游戏是否结束
    checkGameOver() {
        return this.players.some(player => player.cards.length === 0);
    }
    
    // 结束游戏
    endGame() {
        this.gameOver = true;
        
        // 计算排名
        const rankings = this.players
            .map((player, index) => ({ 
                index, 
                cards: player.cards.length,
                name: player.name
            }))
            .sort((a, b) => a.cards - b.cards)
            .map((player, rank) => ({ 
                playerIndex: player.index, 
                name: player.name,
                rank: rank + 1 
            }));
        
        // 显示结果
        this.displayGameResult(rankings);
        
        // 更新积分
        this.updateScores(rankings);
    }
    
    // 更新积分
    updateScores(rankings) {
        const scoreChanges = {
            1: this.mode === 'rating' ? 10 : 10,  // 第一名
            2: this.mode === 'rating' ? 4 : 4,    // 第二名
            3: this.mode === 'rating' ? -3 : -4,  // 第三名
            4: this.mode === 'rating' ? -9 : -10  // 第四名
        };
        
        // 更新积分到Supabase
        this.updateSupabaseScores(rankings, scoreChanges);
    }
    
    // 更新Supabase积分
    async updateSupabaseScores(rankings, scoreChanges) {
        try {
            const user = JSON.parse(localStorage.getItem('userData'));
            if (!user) return;
            
            const tableName = this.mode === 'rating' ? 'rating_leaderboard' : 'evaluate_leaderboard';
            const userId = user.id;
            
            // 获取当前积分
            const { data: currentData, error: fetchError } = await supabase
                .from(tableName)
                .select('score')
                .eq('user_id', userId)
                .single();
                
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('获取当前积分失败:', fetchError);
                return;
            }
            
            const currentScore = currentData ? currentData.score : 0;
            const userRanking = rankings.find(r => this.players[r.playerIndex].isHuman);
            const scoreChange = userRanking ? scoreChanges[userRanking.rank] : 0;
            const newScore = Math.max(0, currentScore + scoreChange);
            
            // 更新或插入积分
            const { error: upsertError } = await supabase
                .from(tableName)
                .upsert({
                    user_id: userId,
                    username: user.username,
                    score: newScore,
                    updated_at: new Date().toISOString()
                });
                
            if (upsertError) {
                console.error('更新积分失败:', upsertError);
                this.uiCallbacks.showMessage("积分更新失败，请检查网络连接");
            } else {
                this.uiCallbacks.showScoreUpdate(currentScore, newScore, scoreChange);
            }
        } catch (error) {
            console.error('更新积分过程出错:', error);
            this.uiCallbacks.showMessage("积分更新过程中出现错误");
        }
    }
    
    // 显示游戏结果
    displayGameResult(rankings) {
        const userRanking = rankings.find(r => this.players[r.playerIndex].isHuman);
        this.uiCallbacks.showGameResult(rankings, userRanking);
    }
}
