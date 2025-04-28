import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: Request) {
  try {
    // Get the authorization token from headers
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 })
    }

    // Create Supabase client with auth context
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    // Get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await req.json()

    // Insert quiz into database
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        area: body.area,
        tema: body.tema,
        num_questoes: body.numQuestoes,
        num_alternativas: body.numAlternativas === 'aberta' ? null : body.numAlternativas,
        lingua: body.lingua,
        nivel_questao: body.nivelQuestao,
        nivel_explicacao: body.nivelExplicacao,
      })
      .select()
      .single()

    if (quizError) {
      console.error('Quiz creation error:', quizError)
      return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 })
    }

    return NextResponse.json({ id: quiz.id })
  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}