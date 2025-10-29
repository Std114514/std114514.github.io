import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { gameId, playerId } = await req.json()

    console.log('抽牌请求:', { gameId, playerId })

    // 1. 验证游戏状态
    const { data: game, error: gameError } = await supabaseClient
      .from('uno_games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError) throw new Error(`游戏不存在: ${gameError.message}`)
    if (game.status !== 'playing') throw new Error('游戏未在进行中')

    // 2. 验证玩家身份和回合
    const { data: player, error: playerError } = await supabaseClient
      .from('uno_game_players')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', playerId)
      .single()

    if (playerError) throw new Error(`玩家不在游戏中: ${playerError.message}`)
    if (player.player_order !== game.current_player_index) {
      throw new Error('不是您的回合')
    }

    // 3. 抽一张牌
    const newCard = drawCardFromDeck()
    const newHand = [...(player.hand || []), newCard]

    // 4. 更新玩家手牌
    await supabaseClient
      .from('uno_game_players')
      .update({ hand: newHand })
      .eq('game_id', gameId)
      .eq('user_id', playerId)

    // 5. 移动到下一个玩家
    const playerCount = await getPlayerCount(supabaseClient, gameId)
    const nextPlayerIndex = (game.current_player_index + 1) % playerCount

    await supabaseClient
      .from('uno_games')
      .update({
        current_player_index: nextPlayerIndex,
        uno_called: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)

    // 6. 记录游戏动作
    await supabaseClient
      .from('uno_game_actions')
      .insert({
        game_id: gameId,
        user_id: playerId,
        action_type: 'draw_card',
        action_data: { card: newCard }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "抽牌成功",
        card: newCard
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('抽牌错误:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// 从牌堆抽牌（简化实现）
function drawCardFromDeck() {
  const colors = ['red', 'blue', 'green', 'yellow']
  const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  
  return {
    type: 'number',
    color: colors[Math.floor(Math.random() * colors.length)],
    value: values[Math.floor(Math.random() * values.length)]
  }
}

// 获取玩家数量
async function getPlayerCount(supabaseClient: any, gameId: string): Promise<number> {
  const { data, error } = await supabaseClient
    .from('uno_game_players')
    .select('id', { count: 'exact' })
    .eq('game_id', gameId)

  return error ? 4 : (data?.length || 4)
}
