import { supabase } from './supabase-client.js';
import { getCurrentUser } from './auth.js';

// 游戏状态管理
class UNOGameClient {
    constructor(gameId) {
        this.gameId = gameId;
        this.userId = getCurrentUser()?.id;
        this.state = null;
        this.subscription = null;
    }

    // 加入游戏
    async joinGame() {
        if (!this.userId) {
            throw new Error('用户未登录');
        }

        // 获取游戏状态
        await this.loadGameState();
        
        // 订阅游戏状态变化
        this.subscribeToGame();

        return this.state;
    }

    // 加载游戏状态
    async loadGameState() {
        const { data: game, error: gameError } = await supabase
            .from('uno_games')
            .select('*')
            .eq('id', this.gameId)
            .single();

        if (gameError) throw gameError;

        const { data: players, error: playersError } = await supabase
            .from('uno_game_players')
            .select('user_id, player_order, hand, uno_users(username)')
            .eq('game_id', this.gameId)
            .order('player_order', { ascending: true });

        if (playersError) throw playersError;

        const { data: currentPlayer, error: currentError } = await supabase
            .from('uno_game_players')
            .select('user_id')
            .eq('game_id', this.gameId)
            .eq('player_order', game.current_player_index)
            .single();

        // 构建游戏状态
        this.state = {
            gameId: game.id,
            mode: game.mode,
            status: game.status,
            currentPlayerIndex: game.current_player_index,
            currentPlayerId: currentPlayer?.user_id,
            direction: game.direction,
            currentColor: game.current_color,
            currentValue: game.current_value,
            deckCount: game.deck?.length || 0,
            discardTop: game.discard_pile?.[game.discard_pile.length - 1],
            unoCalled: game.uno_called,
            plusStack: game.plus_stack,
            players: players.map(player => ({
                id: player.user_id,
                username: player.uno_users.username,
                handCount: player.hand?.length || 0,
                isCurrent: player.user_id === currentPlayer?.user_id
            })),
            // 当前用户的手牌
            myHand: players.find(p => p.user_id === this.userId)?.hand || []
        };

        return this.state;
    }

    // 订阅游戏状态变化
    subscribeToGame() {
        this.subscription = supabase
            .channel(`game:${this.gameId}`)
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'uno_games',
                    filter: `id=eq.${this.gameId}`
                }, 
                async (payload) => {
                    console.log('游戏状态更新:', payload);
                    await this.loadGameState();
                    
                    // 触发状态更新回调
                    if (this.onStateChange) {
                        this.onStateChange(this.state);
                    }
                }
            )
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'uno_game_players',
                    filter: `game_id=eq.${this.gameId}`
                },
                async (payload) => {
                    console.log('玩家状态更新:', payload);
                    await this.loadGameState();
                    
                    if (this.onStateChange) {
                        this.onStateChange(this.state);
                    }
                }
            )
            .subscribe();
    }

    // 玩家操作：出牌
    async playCard(cardIndex, newColor = null) {
        if (!this.userId) {
            throw new Error('用户未登录');
        }

        // 调用Supabase Edge Function处理出牌逻辑
        const { data, error } = await supabase.functions.invoke('uno-play-card', {
            body: {
                gameId: this.gameId,
                playerId: this.userId,
                cardIndex: cardIndex,
                newColor: newColor
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    }

    // 玩家操作：抽牌
    async drawCard() {
        if (!this.userId) {
            throw new Error('用户未登录');
        }

        const { data, error } = await supabase.functions.invoke('uno-draw-card', {
            body: {
                gameId: this.gameId,
                playerId: this.userId
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    }

    // 玩家操作：喊UNO
    async callUno() {
        if (!this.userId) {
            throw new Error('用户未登录');
        }

        const { data, error } = await supabase.functions.invoke('uno-call-uno', {
            body: {
                gameId: this.gameId,
                playerId: this.userId
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    }

    // 离开游戏
    leaveGame() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    // 设置状态变化回调
    onStateChange(callback) {
        this.onStateChange = callback;
    }
}

export { UNOGameClient };
