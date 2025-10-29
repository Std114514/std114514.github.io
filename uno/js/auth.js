import { supabase } from './supabase-client.js';

// 检查认证状态
export async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // 获取用户信息
        const { data: userData, error } = await supabase
            .from('uno_users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('获取用户信息失败:', error);
            return null;
        }

        // 保存到本地存储
        localStorage.setItem('userData', JSON.stringify({
            id: session.user.id,
            username: userData.username,
            rating_score: userData.rating_score,
            evaluate_score: userData.evaluate_score
        }));

        return {
            id: session.user.id,
            username: userData.username,
            rating_score: userData.rating_score,
            evaluate_score: userData.evaluate_score
        };
    } else {
        localStorage.removeItem('userData');
        return null;
    }
}

// 获取当前用户
export function getCurrentUser() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

// 登录
export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

// 注册
export async function register(username, email, password) {
    // 先创建认证用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        throw new Error(authError.message);
    }

    // 创建用户记录
    const { error: userError } = await supabase
        .from('uno_users')
        .insert([
            {
                id: authData.user.id,
                username: username,
                rating_score: 0,
                evaluate_score: 0
            }
        ]);

    if (userError) {
        throw new Error(userError.message);
    }

    return authData;
}

// 登出
export async function logout() {
    const { error } = await supabase.auth.signOut();
    localStorage.removeItem('userData');
    
    if (error) {
        throw new Error(error.message);
    }
}
