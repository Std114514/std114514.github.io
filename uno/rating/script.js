// UNO游戏核心逻辑
class UNOGame {
    constructor(mode, playerName) {
        this.mode = mode; // 'rating' 或 'evaluate'
        this.playerName = playerName;
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
            this.initializeDeck();
            this.shuffleDeck();
        }
        
        if (this.deck.length === 0) {
            // 如果牌堆空了，从弃牌堆重新洗牌（除了最上面一张）
            const topCard = this.discardPile.pop();
            this.deck = this.discardPile;
            this.discardPile = [topCard];
            this.shuffleDeck();
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
                this.nextPlayer();
                break;
            case 'reverse':
                this.direction *= -1;
                break;
            case 'draw2':
                this.pendingDraw += 2;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                break;
            case 'draw4':
                this.pendingDraw += 4;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                break;
            case 'draw5':
                this.pendingDraw += 5;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                break;
            case 'draw6':
                this.pendingDraw += 6;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                break;
            case 'draw7':
                this.pendingDraw += 7;
                this.pendingDrawTarget = this.getNextPlayerIndex();
                break;
            case 'turtle':
                // 乌龟牌效果：指定任意一人+3张
                // 在人类玩家回合会弹出选择，AI会随机选择
                break;
        }
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
            for (let i = 0; i < this.pendingDraw; i++) {
                player.cards.push(this.drawCard());
            }
            this.pendingDraw = 0;
            this.pendingDrawTarget = null;
            
            // 摸完牌后跳过回合
            this.nextPlayer();
            return;
        }
        
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
        }
        
        // 检查可以出的牌
        const playableCards = this.getPlayableCards(ai.cards);
        
        if (playableCards.length > 0) {
            // 按照策略选择出牌
            const cardToPlay = this.aiChooseCard(playableCards, ai.cards);
            this.playCard(cardToPlay, ai.cards.indexOf(cardToPlay));
        } else {
            // 不能出牌，摸一张
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
        
        // 从玩家手牌中移除
        player.cards.splice(cardIndex, 1);
        
        // 添加到弃牌堆
        this.discardPile.push(card);
        
        // 更新当前颜色和数值
        if (card.color !== 'black') {
            this.currentColor = card.color;
        }
        this.currentValue = card.value;
        
        // 处理卡牌效果
        this.handleCardEffect(card);
        
        // 检查是否赢了
        if (player.cards.length === 0) {
            this.winner = this.currentPlayerIndex;
            this.endGame();
            return;
        }
        
        // 切换到下一个玩家
        this.nextPlayer();
    }
    
    // 当前玩家摸一张牌
    drawCardForCurrentPlayer() {
        const player = this.players[this.currentPlayerIndex];
        player.cards.push(this.drawCard());
        
        // 摸牌后跳过回合
        this.nextPlayer();
    }
    
    // 喊UNO
    callUno() {
        const player = this.players[this.currentPlayerIndex];
        if (player.isHuman && this.unoButtonEnabled) {
            player.unoCalled = true;
            this.unoButtonEnabled = false;
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
            .map((player, index) => ({ index, cards: player.cards.length }))
            .sort((a, b) => a.cards - b.cards)
            .map((player, rank) => ({ playerIndex: player.index, rank: rank + 1 }));
        
        // 更新积分
        this.updateScores(rankings);
        
        // 显示结果
        this.displayGameResult(rankings);
    }
    
    // 更新积分
    updateScores(rankings) {
        const scoreChanges = {
            1: this.mode === 'rating' ? 10 : 10,  // 第一名
            2: this.mode === 'rating' ? 4 : 4,    // 第二名
            3: this.mode === 'rating' ? -3 : -4,  // 第三名
            4: this.mode === 'rating' ? -9 : -10  // 第四名
        };
        
        // 在实际应用中，这里应该调用Supabase API更新用户积分
        console.log("游戏结束，排名和积分变化:", rankings.map(r => ({
            player: this.players[r.playerIndex].name,
            rank: r.rank,
            scoreChange: scoreChanges[r.rank]
        })));
        
        // 模拟更新积分到Supabase
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
            } else {
                console.log('积分更新成功:', newScore);
            }
        } catch (error) {
            console.error('更新积分过程出错:', error);
        }
    }
    
    // 显示游戏结果
    displayGameResult(rankings) {
        // 在实际应用中，这里应该更新UI显示游戏结果
        console.log("游戏结束!");
        rankings.forEach(ranking => {
            console.log(`第${ranking.rank}名: ${this.players[ranking.playerIndex].name}`);
        });
        
        // 显示积分变化
        const scoreChanges = {
            1: this.mode === 'rating' ? 10 : 10,
            2: this.mode === 'rating' ? 4 : 4,
            3: this.mode === 'rating' ? -3 : -4,
            4: this.mode === 'rating' ? -9 : -10
        };
        
        const userRanking = rankings.find(r => this.players[r.playerIndex].isHuman);
        if (userRanking) {
            const change = scoreChanges[userRanking.rank];
            const changeText = change > 0 ? `+${change}` : change;
            console.log(`您的积分变化: ${changeText}`);
            
            // 在实际应用中，这里应该显示一个模态框或更新UI
            alert(`游戏结束！您获得了第${userRanking.rank}名，积分${changeText}`);
        }
    }
}
