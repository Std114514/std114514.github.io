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

    console.log('喊UNO请求:', { gameId, playerId })

    // 1. 验证游戏状态
    const { data: game, error: gameError } = await supabaseClient
      .from('uno_games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError) throw new Error(`游戏不存在: ${gameError.message}`)
    if (game.status !== 'playing') throw new Error('游戏未在进行中')

    // 2. 验证玩家身份
    const { data: player, error: playerError } = await supabaseClient
      .from('uno_game_players')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', playerId)
      .single()

    if (playerError) throw new Error(`玩家不在游戏中: ${playerError.message}`)

    // 3. 检查玩家手牌数量
    const hand = player.hand || []
    if (hand.length !== 1) {
      // 错喊 UNO，罚抽 2 张牌
      await handleDrawCards(supabaseClient, gameId, playerId, 2)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "错喊UNO，罚抽2张牌",
          penalty: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. 设置 UNO 状态
    await supabaseClient
      .from('uno_games')
      .update({
        uno_called: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)

    // 5. 记录游戏动作
    await supabaseClient
      .from('uno_game_actions')
      .insert({
        game_id: gameId,
        user_id: playerId,
        action_type: 'call_uno',
        action_data: { success: true }
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "UNO!"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('喊UNO错误:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// 处理抽牌
async function handleDrawCards(supabaseClient: any, gameId: string, playerId: string, count: number) {
  const { data: player } = await supabaseClient
    .from('uno_game_players')
    .select('hand')
    .eq('game_id', gameId)
    .eq('user_id', playerId)
    .single()

  // 模拟抽牌
  const newCards = []
  for (let i = 0; i < count; i++) {
    newCards.push({
      type: 'number',
      color: ['red', 'blue', 'green', 'yellow'][Math.floor(Math.random() * 4)],
      value: Math.floor(Math.random() * 10).toString()
    })
  }

  const newHand = [...(player.hand || []), ...newCards]

  await supabaseClient
    .from('uno_game_players')
    .update({ hand: newHand })
    .eq('game_id', gameId)
    .eq('user_id', playerId)

  // 记录惩罚动作
  await supabaseClient
    .from('uno_game_actions')
    .insert({
      game_id: gameId,
      user_id: playerId,
      action_type: 'call_uno',
      action_data: { 
        success: false, 
        penalty: true,
        cardsDrawn: count 
      }
    })
}
