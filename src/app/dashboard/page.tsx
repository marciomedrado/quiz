'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QuizForm, { QuizFormData } from '@/components/QuizForm'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Função utilitária para embaralhar arrays
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

interface Question {
  enunciado: string
  alternativas?: string[]
  correta?: number
  explicacao: string
}

export default function Dashboard() {
  const router = useRouter()
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)

  const letras = ['A', 'B', 'C', 'D']

  // Proteção de rota
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/')
      } else {
        setIsAuthChecking(false)
      }
    })
  }, [router])

  // Se ainda está verificando autenticação, mostra loading
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const handleCreateQuiz = async (data: QuizFormData) => {
    setLoading(true)
    setQuestions([])
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao gerar questões')
      }

      const result = await response.json()
      setQuestions(result.questions)
      toast.success('Questões geradas com sucesso!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const exportXLSX = () => {
    // Cabeçalhos
    const headers = [
      'Enunciado',
      'Alternativa A',
      'Alternativa B',
      'Alternativa C',
      'Alternativa D',
      'Resposta',
      'Explicação'
    ]

    // Linhas de dados
    const rows = questions.map(q => {
      if (!q.alternativas) {
        // Questão aberta: só enunciado e explicação
        return [
          q.enunciado, '', '', '', '', '', q.explicacao
        ]
      }
      const alternativasComIndices = q.alternativas.map((alt, idx) => ({
        texto: alt,
        eCorreta: idx === q.correta
      }))
      const alternativasEmbaralhadas = shuffleArray(alternativasComIndices)
      const alternativaCorreta = alternativasEmbaralhadas.find(alt => alt.eCorreta)?.texto || ''
      const alternativasPadronizadas = [
        alternativasEmbaralhadas[0]?.texto || '',
        alternativasEmbaralhadas[1]?.texto || '',
        alternativasEmbaralhadas[2]?.texto || '',
        alternativasEmbaralhadas[3]?.texto || ''
      ]
      return [
        q.enunciado,
        ...alternativasPadronizadas,
        alternativaCorreta,
        q.explicacao
      ]
    })

    // Monta a planilha
    const wsData = [headers, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Ajusta largura das colunas
    ws['!cols'] = [
      { wch: 40 }, // Enunciado
      { wch: 20 }, // Alternativa A
      { wch: 20 }, // Alternativa B
      { wch: 20 }, // Alternativa C
      { wch: 20 }, // Alternativa D
      { wch: 20 }, // Resposta
      { wch: 40 }, // Explicação
    ]

    // Cria o arquivo
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Quiz')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

    // Faz download
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quiz.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  // DOCX exporta com letras nas alternativas e na resposta
  const exportDOCX = async () => {
    const letras = ['A', 'B', 'C', 'D']
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: questions.flatMap((q, idx) => {
            const blocks = [
              new Paragraph({
                children: [
                  new TextRun({ text: `Questão ${idx + 1}:`, bold: true, size: 28 }),
                ],
                spacing: { after: 120 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: q.enunciado, size: 24 }),
                ],
                spacing: { after: 120 }
              }),
            ];

            if (q.alternativas && q.alternativas.length > 0) {
              blocks.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: "Alternativas:", bold: true, size: 24 }),
                  ],
                  spacing: { after: 80 }
                }),
                ...q.alternativas.map((alt, i) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${letras[i]}) ${alt}`, size: 24 }),
                    ],
                    spacing: { after: 40 }
                  })
                ),
                typeof q.correta === 'number' && new Paragraph({
                  children: [
                    new TextRun({ text: `Correta: ${letras[q.correta]}) ${q.alternativas[q.correta]}`, bold: true, size: 24 }),
                  ],
                  spacing: { after: 80 }
                })
              );
            }

            blocks.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `Explicação: ${q.explicacao}`, size: 22 }),
                ],
                spacing: { after: 200 }
              })
            );

            // Remove possíveis "false" do array (caso não haja correta)
            return blocks.filter(Boolean);
          }),
        },
      ],
    });

    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quiz.docx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Gerador de Quiz</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
          <QuizForm onSubmit={handleCreateQuiz} />

          {loading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Gerando questões...</p>
            </div>
          )}

          {questions.length > 0 && (
            <div className="mt-8">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={exportXLSX}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
                >
                  Exportar XLSX
                </button>
                <button
                  onClick={exportDOCX}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Exportar DOCX
                </button>
              </div>
              <h2 className="text-lg font-semibold mb-2">Questões Geradas</h2>
              <ul className="space-y-6">
                {questions.map((q, idx) => (
                  <li key={idx} className="bg-gray-100 rounded p-4">
                    <div className="font-semibold mb-2">Questão {idx + 1}:</div>
                    <div className="mb-2">{q.enunciado}</div>
                    {q.alternativas && q.alternativas.length > 0 && (
                      <>
                        <ul className="mb-2 list-disc pl-6">
                          {q.alternativas.map((alt, i) => (
                            <li
                              key={i}
                              className={i === q.correta ? 'font-bold text-green-700' : ''}
                            >
                              <span className="font-semibold">{letras[i]})</span> {alt}
                            </li>
                          ))}
                        </ul>
                        {typeof q.correta === 'number' && (
                          <div className="mb-2 text-green-700 font-semibold">
                            Resposta: {letras[q.correta]}) {q.alternativas[q.correta]}
                          </div>
                        )}
                      </>
                    )}
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Explicação:</span> {q.explicacao}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}