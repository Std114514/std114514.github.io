import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { gameId, playerId, cardIndex, newColor } = await req.json();

    // 获取游戏状态
    const { data: game, error: gameError } = await supabaseClient
      .from('uno_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;

    // 获取玩家信息
    const { data: player, error: playerError } = await supabaseClient
      .from('uno_game_players')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', playerId)
      .single();

    if (playerError) throw playerError;

    // 检查是否是当前玩家
    if (game.current_player_index !== player.player_order) {
      return new Response(
        JSON.stringify({ success: false, message: "不是你的回合" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取玩家手牌
    const hand = player.hand || [];
    if (cardIndex < 0 || cardIndex >= hand.length) {
      return new Response(
        JSON.stringify({ success: false, message: "无效的牌" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const card = hand[cardIndex];

    // 检查是否可以出牌
    if (!canPlayCard(card, game.current_color, game.current_value)) {
      return new Response(
        JSON.stringify({ success: false, message: "不能出这张牌" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查UNO状态
    if (hand.length === 2 && !game.uno_called) {
      // 没喊UNO，罚抽2张牌
      await handleDrawCards(supabaseClient, gameId, playerId, 2);
      return new Response(
        JSON.stringify({ success: false, message: "没喊UNO，罚抽2张牌" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 执行出牌逻辑
    await playCardLogic(supabaseClient, game, player, cardIndex, newColor);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 检查是否可以出牌
function canPlayCard(card, currentColor, currentValue) {
  // 万能牌和黑色特殊牌总是可以出
  if (card.type === 'wild' || card.color === 'black') return true;
  
  // 颜色匹配
  if (card.color === currentColor) return true;
  
  // 数值匹配
  if (card.value === currentValue) return true;
  
  return false;
}

// 处理抽牌
async function handleDrawCards(supabaseClient, gameId, playerId, count) {
  const { data: player } = await supabaseClient
    .from('uno_game_players')
    .select('hand')
    .eq('game_id', gameId)
    .eq('user_id', playerId)
    .single();

  const newCards = Array(count).fill(0).map(() => drawCardFromDeck(supabaseClient, gameId));
  const newHand = [...(player.hand || []), ...newCards];

  await supabaseClient
    .from('uno_game_players')
    .update({ hand: newHand })
    .eq('game_id', gameId)
    .eq('user_id', playerId);
}

// 从牌堆抽牌
function drawCardFromDeck(supabaseClient, gameId) {
  // 简化实现，实际应该从游戏牌堆中抽取
  return { type: 'number', color: 'red', value: '0' };
}

// 执行出牌逻辑
async function playCardLogic(supabaseClient, game, player, cardIndex, newColor) {
  const hand = player.hand || [];
  const card = hand[cardIndex];
  
  // 移除手牌中的这张牌
  const newHand = [...hand];
  newHand.splice(cardIndex, 1);
  
  // 更新玩家手牌
  await supabaseClient
    .from('uno_game_players')
    .update({ hand: newHand })
    .eq('game_id', game.id)
    .eq('user_id', player.user_id);

  // 添加到弃牌堆
  const newDiscardPile = [...(game.discard_pile || []), card];
  
  // 更新游戏状态
  const updateData: any = {
    discard_pile: newDiscardPile,
    uno_called: false,
    updated_at: new Date().toISOString()
  };

  // 更新当前颜色和数值
  if (card.type === 'wild' && newColor) {
    updateData.current_color = newColor;
    updateData.current_value = null;
  } else {
    updateData.current_color = card.color;
    updateData.current_value = card.value;
  }

  // 处理卡片效果
  await processCardEffect(supabaseClient, game, player, card, updateData);

  // 更新游戏状态
  await supabaseClient
    .from('uno_games')
    .update(updateData)
    .eq('id', game.id);

  // 检查游戏是否结束
  if (newHand.length === 0) {
    await handleGameEnd(supabaseClient, game, player);
  }
}

// 处理卡片效果
async function processCardEffect(supabaseClient, game, player, card, updateData) {
  // 实现卡片效果逻辑
  // 这里简化处理
  switch (card.value) {
    case 'skip':
      updateData.current_player_index = (game.current_player_index + 1) % game.max_players;
      break;
    case 'reverse':
      updateData.direction = -game.direction;
      break;
    // 其他卡片效果...
  }
}

// 处理游戏结束
async function handleGameEnd(supabaseClient, game, winner) {
  // 更新游戏状态为结束
  await supabaseClient
    .from('uno_games')
    .update({
      status: 'finished',
      winner_id: winner.user_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', game.id);

  // 计算分数并更新玩家等级分
  await calculateScores(supabaseClient, game);
}

// 计算分数
async function calculateScores(supabaseClient, game) {
  // 获取所有玩家
  const { data: players } = await supabaseClient
    .from('uno_game_players')
    .select('user_id, player_order')
    .eq('game_id', game.id)
    .order('player_order', { ascending: true });

  // 计算分数变化
  const ratingChanges = getRatingChanges(players.length, game.mode);
  
  // 更新玩家分数
  for (let i = 0; i < players.length; i++) {
    const change = ratingChanges[i];
    
    if (game.mode === 'rating') {
      await supabaseClient.rpc('update_rating_score', {
        user_id: players[i].user_id,
        score_change: change
      });
    } else {
      await supabaseClient.rpc('update_evaluate_score', {
        user_id: players[i].user_id,
        score_change: change
      });
    }

    // 记录分数变化
    await supabaseClient
      .from('uno_game_players')
      .update({ rating_change: change })
      .eq('game_id', game.id)
      .eq('user_id', players[i].user_id);
  }
}

// 获取分数变化
function getRatingChanges(playerCount, mode) {
  if (mode === 'rating') {
    switch (playerCount) {
      case 4: return [10, 4, -3, -9];
      case 5: return [12, 6, 1, -5, -11];
      case 6: return [15, 9, 4, -3, -8, -13];
      case 7: return [18, 12, 7, 2, -4, -10, -16];
      default: return new Array(playerCount).fill(0);
    }
  } else {
    switch (playerCount) {
      case 4: return [10, 4, -4, -10];
      case 5: return [12, 6, 0, -6, -12];
      case 6: return [15, 9, 3, -3, -9, -15];
      case 7: return [18, 12, 6, 0, -6, -12, -18];
      default: return new Array(playerCount).fill(0);
    }
  }
}
