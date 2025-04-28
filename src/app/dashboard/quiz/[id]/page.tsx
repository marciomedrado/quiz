'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Question {
  enunciado: string
  alternativas: string[]
  correta: number
  explicacao: string
}

export default function QuizPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!user) {
        router.push('/auth/login')
        return
      }
      setLoading(true)
      setError(null)
      try {
        // Busca o quiz
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', params.id)
          .single()

        if (quizError || !quizData) {
          setError('Quiz não encontrado.')
          setLoading(false)
          return
        }
        setQuiz(quizData)

        // Busca as questões
        const { data: questionRow, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', params.id)
          .single()

        if (questionError || !questionRow) {
          setQuestions([])
        } else {
          setQuestions(questionRow.data || [])
        }
      } catch (err: any) {
        setError('Erro ao buscar quiz.')
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [user, params.id, router])

  if (loading) {
    return <div className="p-8">Carregando...</div>
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{quiz.tema} - {quiz.area}</h1>
      {questions.length === 0 ? (
        <p className="text-gray-500">Nenhuma questão encontrada para este quiz.</p>
      ) : (
        <div className="space-y-8">
          {questions.map((q, idx) => (
            <div key={idx} className="bg-white rounded shadow p-4">
              <div className="font-semibold mb-2">Questão {idx + 1}:</div>
              <div className="mb-2">{q.enunciado}</div>
              <ul className="mb-2 list-disc pl-6">
                {q.alternativas.map((alt, i) => (
                  <li
                    key={i}
                    className={i === q.correta ? 'font-bold text-green-700' : ''}
                  >
                    {alt}
                  </li>
                ))}
              </ul>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Explicação:</span> {q.explicacao}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}