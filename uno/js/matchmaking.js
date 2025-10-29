import { supabase } from './supabase-client.js';
import { getCurrentUser } from './auth.js';

// 加入匹配队列
export async function joinMatchmaking(mode) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('请先登录');
    }

    try {
        // 更新在线状态
        await updateOnlineStatus(user.id, mode);

        // 加入匹配队列
        const { error } = await supabase
            .from('uno_matchmaking')
            .upsert({
                user_id: user.id,
                mode: mode,
                joined_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,mode'
            });

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('加入匹配失败:', error);
        throw error;
    }
}

// 离开匹配队列
export async function leaveMatchmaking(mode) {
    const user = getCurrentUser();
    if (!user) return;

    const { error } = await supabase
        .from('uno_matchmaking')
        .delete()
        .eq('user_id', user.id)
        .eq('mode', mode);

    if (error) {
        console.error('离开匹配失败:', error);
    }
}

// 获取匹配状态
export async function getMatchmakingStatus(mode) {
    const user = getCurrentUser();
    if (!user) return { position: 1, total: 0 };

    try {
        // 获取队列中的所有用户
        const { data: queue, error } = await supabase
            .from('uno_matchmaking')
            .select('user_id, joined_at')
            .eq('mode', mode)
            .order('joined_at', { ascending: true });

        if (error) throw error;

        const position = queue.findIndex(item => item.user_id === user.id) + 1;
        
        return {
            position: position > 0 ? position : 1,
            total: queue.length
        };
    } catch (error) {
        console.error('获取匹配状态失败:', error);
        return { position: 1, total: 0 };
    }
}

// 检查是否匹配成功
export async function checkMatchSuccess(mode) {
    const user = getCurrentUser();
    if (!user) return null;

    try {
        // 检查用户是否在游戏中
        const { data: gamePlayer, error } = await supabase
            .from('uno_game_players')
            .select('game_id')
            .eq('user_id', user.id)
            .eq('uno_games!inner(mode, status)', mode, 'playing')
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return gamePlayer ? gamePlayer.game_id : null;
    } catch (error) {
        console.error('检查匹配成功失败:', error);
        return null;
    }
}

// 更新在线状态
async function updateOnlineStatus(userId, mode) {
    const { error } = await supabase
        .from('uno_online_users')
        .upsert({
            user_id: userId,
            mode: mode,
            last_active: new Date().toISOString()
        }, {
            onConflict: 'user_id,mode'
        });

    if (error) {
        console.error('更新在线状态失败:', error);
    }
}

// 订阅匹配成功事件
export function subscribeToMatchmaking(mode, callback) {
    const user = getCurrentUser();
    if (!user) return;

    // 订阅游戏玩家表的变化
    return supabase
        .channel('matchmaking')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'uno_game_players',
                filter: `user_id=eq.${user.id}`
            }, 
            (payload) => {
                // 检查游戏模式是否匹配
                supabase
                    .from('uno_games')
                    .select('mode, status')
                    .eq('id', payload.new.game_id)
                    .single()
                    .then(({ data }) => {
                        if (data && data.mode === mode && data.status === 'playing') {
                            callback(payload.new.game_id);
                        }
                    });
            }
        )
        .subscribe();
}
