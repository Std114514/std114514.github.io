// Supabase配置
const SUPABASE_URL = 'https://xwrgpngwmdjbmsziuodl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cmdwbmd3bWRqYm1zeml1b2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDUzNjksImV4cCI6MjA3NTcyMTM2OX0.kVpcSCmmwcLcs60C0BjPxyXFDxdl3V4ny-vutKsnbV8';

// 初始化Supabase客户端
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 获取赛季信息
export async function getSeasonInfo() {
    const { data, error } = await supabase
        .from('uno_season')
        .select('season_number')
        .order('season_number', { ascending: false })
        .limit(1)
        .single();
    
    return error ? 1 : data.season_number;
}

// 获取在线人数
export async function getOnlineCounts() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    try {
        const { data: ratingData, error: ratingError } = await supabase
            .from('uno_online_users')
            .select('user_id')
            .eq('mode', 'rating')
            .gt('last_active', fiveMinutesAgo);

        const { data: evaluateData, error: evaluateError } = await supabase
            .from('uno_online_users')
            .select('user_id')
            .eq('mode', 'evaluate')
            .gt('last_active', fiveMinutesAgo);

        return {
            rating: ratingError ? 0 : ratingData.length,
            evaluate: evaluateError ? 0 : evaluateData.length
        };
    } catch (error) {
        console.error('获取在线人数失败:', error);
        return { rating: 0, evaluate: 0 };
    }
}

// 获取排行榜
export async function getLeaderboards() {
    const currentSeason = await getSeasonInfo();
    
    try {
        const { data: ratingData, error: ratingError } = await supabase
            .from('uno_leaderboard_snapshot')
            .select(`
                rank,
                uno_users(username),
                score
            `)
            .eq('mode', 'rating')
            .eq('season', currentSeason)
            .order('rank', { ascending: true })
            .limit(10);

        const { data: evaluateData, error: evaluateError } = await supabase
            .from('uno_leaderboard_snapshot')
            .select(`
                rank,
                uno_users(username),
                score
            `)
            .eq('mode', 'evaluate')
            .eq('season', currentSeason)
            .order('rank', { ascending: true })
            .limit(10);

        return {
            rating: ratingError ? [] : ratingData.map(item => ({
                username: item.uno_users.username,
                score: item.score
            })),
            evaluate: evaluateError ? [] : evaluateData.map(item => ({
                username: item.uno_users.username,
                score: item.score
            }))
        };
    } catch (error) {
        console.error('获取排行榜失败:', error);
        return { rating: [], evaluate: [] };
    }
}

// 获取用户统计信息
export async function getUserStats(userId) {
    try {
        const { data, error } = await supabase
            .from('uno_users')
            .select('rating_score, evaluate_score')
            .eq('id', userId)
            .single();

        if (error) throw error;

        return {
            ratingLevel: calculateRatingLevel(data.rating_score, true),
            evaluateLevel: calculateRatingLevel(data.evaluate_score, false)
        };
    } catch (error) {
        console.error('获取用户统计失败:', error);
        return {
            ratingLevel: '青铜5 (0分)',
            evaluateLevel: '学1-1 (0分)'
        };
    }
}

// 等级计算函数
function calculateRatingLevel(score, isRating = true) {
    if (isRating) {
        // 积分场等级计算
        if (score < 20) return `青铜${5 - Math.floor(score / 4)} (${score}分)`;
        if (score < 60) return `白银${5 - Math.floor((score - 20) / 8)} (${score}分)`;
        if (score < 120) return `黄金${5 - Math.floor((score - 60) / 12)} (${score}分)`;
        if (score < 200) return `铂金${5 - Math.floor((score - 120) / 16)} (${score}分)`;
        if (score < 300) return `钻石${5 - Math.floor((score - 200) / 20)} (${score}分)`;
        if (score < 425) return `大师${5 - Math.floor((score - 300) / 25)} (${score}分)`;
        if (score < 600) return `皇冠${5 - Math.floor((score - 425) / 35)} (${score}分)`;
        const stars = Math.floor((score - 600) / 50) + 1;
        return `战神${stars}星 (${score}分)`;
    } else {
        // 评测场等级计算
        if (score < 30) {
            const level = Math.floor(score / 5) + 1;
            const subLevel = level <= 6 ? 1 : 2;
            const mainLevel = level <= 6 ? 1 : 2;
            return `学${mainLevel}-${subLevel} (${score}分)`;
        }
        if (score < 90) {
            const level = Math.floor((score - 30) / 10) + 1;
            return `学${level + 2}-${(level % 3) || 3} (${score}分)`;
        }
        if (score < 180) {
            const level = Math.floor((score - 90) / 15) + 1;
            return `业${level + 1}-${(level % 3) || 3} (${score}分)`;
        }
        if (score < 300) {
            const level = Math.floor((score - 180) / 20) + 1;
            return `业${level + 3}-${(level % 3) || 3} (${score}分)`;
        }
        if (score < 450) {
            const level = Math.floor((score - 300) / 25) + 1;
            return `业${level + 5}-${(level % 3) || 3} (${score}分)`;
        }
        if (score < 630) {
            const level = Math.floor((score - 450) / 30) + 1;
            return `业${level + 7}-${(level % 3) || 3} (${score}分)`;
        }
        if (score < 990) {
            const level = Math.floor((score - 630) / 40) + 1;
            return `专${level}-${(level % 3) || 3} (${score}分)`;
        }
        if (score < 1000) return `神0-1 (${score}分)`;
        const level = Math.floor((score - 1000) / 50) + 1;
        return `神${level}-${(level % 3) || 3} (${score}分)`;
    }
}
