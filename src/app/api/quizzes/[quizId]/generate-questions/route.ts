import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!

export async function POST(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  try {
    const quizId = params.quizId
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Busca os dados do quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz não encontrado' }, { status: 404 })
    }

    // Monta o prompt para a OpenAI
    const prompt = `
      Gere ${quiz.num_questoes} questões de múltipla escolha sobre o tema "${quiz.tema}" na área "${quiz.area}".
      Cada questão deve ter ${quiz.num_alternativas || 4} alternativas, apenas uma correta.
      Escreva as questões no idioma "${quiz.lingua}".
      Nível das questões: ${quiz.nivel_questao}. Nível da explicação: ${quiz.nivel_explicacao}.
      Para cada questão, forneça: enunciado, alternativas, índice da correta e uma explicação.
      Responda em JSON, exemplo:
      [
        {
          "enunciado": "...",
          "alternativas": ["A", "B", "C", "D"],
          "correta": 2,
          "explicacao": "..."
        },
        ...
      ]
    `

    // Chama a OpenAI API
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    const openaiData = await openaiRes.json()
    const content = openaiData.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'Erro ao gerar questões com a OpenAI' }, { status: 500 })
    }

    // Tenta fazer o parse do JSON retornado
    let questions
    try {
      questions = JSON.parse(content)
    } catch (e) {
      return NextResponse.json({ error: 'Erro ao interpretar resposta da OpenAI' }, { status: 500 })
    }

    // Salva as questões no Supabase
    const { error: insertError } = await supabase
      .from('questions')
      .insert({
        quiz_id: quizId,
        data: questions,
      })

    if (insertError) {
      return NextResponse.json({ error: 'Erro ao salvar questões no banco' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}