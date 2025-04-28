'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QuizForm, { QuizFormData } from '@/components/QuizForm'
import ExamDataModal, { ExamData } from '@/components/ExamDataModal'
import ListManager from '@/components/ListManager'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const letras = ['A', 'B', 'C', 'D', 'E']

interface Question {
  enunciado: string
  alternativas?: string[]
  correta?: number
  explicacao: string
  resposta?: string // para questões abertas
}

type EditData = {
  enunciado?: string
  alternativas?: string[]
  correta?: number
  explicacao?: string
  resposta?: string
}

// Função de embaralhamento
function embaralharAlternativas(questao: Question): Question {
  // Se não for questão de múltipla escolha, retorna sem alteração
  if (!questao.alternativas || typeof questao.correta !== 'number') {
    return questao
  }

  const alternativas = [...questao.alternativas]
  const correta = questao.correta
  const indices = alternativas.map((_, i) => i)
  
  // Embaralha os índices (Fisher-Yates)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  
  // Aplica o embaralhamento nas alternativas
  const novasAlternativas = indices.map(i => alternativas[i])
  // Descobre o novo índice da correta
  const novaCorreta = indices.indexOf(correta)
  
  return {
    ...questao,
    alternativas: novasAlternativas,
    correta: novaCorreta
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddMore, setShowAddMore] = useState(false)
  const [addCount, setAddCount] = useState(1)
  const [isGeneratingMore, setIsGeneratingMore] = useState(false)
  const [lastFormData, setLastFormData] = useState<QuizFormData | null>(null)
  const [showExamModal, setShowExamModal] = useState(false)
  const [showListManager, setShowListManager] = useState(false)
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editData, setEditData] = useState<EditData>({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/')
      } else {
        setIsAuthChecking(false)
      }
    })
  }, [router])

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleCreateQuiz = async (data: QuizFormData) => {
    setLoading(true)
    setQuestions([])
    setShowAddMore(false)
    setLastFormData(data)
    setExamData(null)
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
      console.log('Questões originais:', result.questions)
      const questoesEmbaralhadas = result.questions.map(embaralharAlternativas)
      console.log('Questões embaralhadas:', questoesEmbaralhadas)
      setQuestions(questoesEmbaralhadas)
      setShowAddMore(true)
      toast.success('Questões geradas com sucesso!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateMore = async () => {
    if (!lastFormData) {
      toast.error('Erro: Dados do formulário não encontrados')
      return
    }
  
    setIsGeneratingMore(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...lastFormData,
          quantidade: 1
        }),
      })
  
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao gerar questões adicionais')
      }
  
      const result = await response.json()
      const novasQuestoesEmbaralhadas = result.questions.map(embaralharAlternativas)
      setQuestions(prev => [...prev, ...novasQuestoesEmbaralhadas])
      toast.success('Questão adicional gerada com sucesso!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsGeneratingMore(false)
    }
  }

  // XLSX exporta apenas a resposta, sem letra
  const exportXLSX = () => {
    if (!questions.length) return
    const data = questions.map((q) => {
      if (q.alternativas && typeof q.correta === 'number') {
        return {
          'Enunciado': q.enunciado,
          'Alternativa A': q.alternativas[0] || '',
          'Alternativa B': q.alternativas[1] || '',
          'Alternativa C': q.alternativas[2] || '',
          'Alternativa D': q.alternativas[3] || '',
          'Resposta': q.alternativas[q.correta] || '',
          'Explicação': q.explicacao,
        }
      } else {
        return {
          'Enunciado': q.enunciado,
          'Resposta': q.resposta || '',
          'Explicação': q.explicacao,
        }
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Prova')
    XLSX.writeFile(wb, 'prova.xlsx')
  }

  // Função para exportar DOCX (prova ou gabarito)
  const exportDOCX = async (isProva = false) => {
    if (!questions.length || !examData) return
    setIsGeneratingDocx(true)
    try {
      const headerFields = [
        { label: 'Escola', value: examData.escola },
        { label: 'Professor', value: examData.professor },
        { label: 'Aluno', value: examData.aluno },
        { label: 'Turma', value: examData.turma },
        { label: 'Disciplina', value: examData.disciplina },
        { label: 'Área', value: examData.area },
        { label: 'Tema', value: examData.tema },
      ]

      const headerParagraphs = headerFields.map(
        ({ label, value }) =>
          new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, bold: true }),
              new TextRun({ text: value || '' }),
            ],
            spacing: { after: 100 },
          })
      )

      const corpoQuestoes = questions.flatMap((q, idx) => {
        const questoes: Paragraph[] = [
          new Paragraph({
            children: [
              new TextRun({
                text: `Questão ${idx + 1}:`,
                bold: true,
                size: 28,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: q.enunciado,
                size: 24,
              }),
            ],
            spacing: { after: 100 },
          }),
        ]
        if (q.alternativas && q.alternativas.length > 0) {
          questoes.push(
            ...q.alternativas.map((alt, i) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${letras[i]}) ${alt}`,
                    size: 24,
                  }),
                ],
                spacing: { after: 50 },
              })
            )
          )
          if (!isProva && typeof q.correta === 'number') {
            questoes.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Resposta: ${q.alternativas[q.correta]}`,
                    bold: true,
                    color: '008000',
                    size: 24,
                  }),
                ],
                spacing: { after: 100 },
              })
            )
          }
        } else if (!isProva && q.resposta) {
          questoes.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Resposta: ${q.resposta}`,
                  bold: true,
                  color: '008000',
                  size: 24,
                }),
              ],
              spacing: { after: 100 },
            })
          )
        }
        if (!isProva) {
          questoes.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Explicação: ${q.explicacao}`,
                  italics: true,
                  size: 22,
                  color: '666666',
                }),
              ],
              spacing: { after: 200 },
            })
          )
        }
        return questoes
      })

      // Cria o documento
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: isProva ? 'Prova' : 'Gabarito',
                    bold: true,
                    size: 32,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
              }),
              ...headerParagraphs,
              new Paragraph({ text: '', spacing: { after: 200 } }),
              ...corpoQuestoes,
            ],
          },
        ],
      })

      const alunoNome = examData.aluno?.trim() ? examData.aluno : 'geral'
      const sufixo = isProva ? 'prova' : 'gabarito'
      const nomeArquivo = `${examData.disciplina || ''}_${examData.tema || ''}_${examData.turma || ''}_${alunoNome}_${questions.length}_questoes_${sufixo}.docx`
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase()

      const blob = await Packer.toBlob(doc)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nomeArquivo
      a.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setIsGeneratingDocx(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // Função para mover questão
  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= questions.length) return
    const updated = [...questions]
    const [removed] = updated.splice(from, 1)
    updated.splice(to, 0, removed)
    setQuestions(updated)
  }

  // Edição
  const handleEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditData({ ...questions[idx] })
  }

  const handleSave = (idx: number) => {
    const updated = [...questions]
    // Se as alternativas foram editadas, embaralha novamente
    if (editData.alternativas) {
      const questaoAtualizada = embaralharAlternativas({
        ...updated[idx],
        ...editData
      })
      updated[idx] = questaoAtualizada
    } else {
      updated[idx] = { ...updated[idx], ...editData }
    }
    setQuestions(updated)
    setEditingIdx(null)
    setEditData({})
  }

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingIdx(null)
    setEditData({})
  }

  // Exclusão com confirmação
  const handleDelete = (idx: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta questão?')) {
      setQuestions(questions.filter((_, i) => i !== idx))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-green-100 flex flex-col font-sans">
      <div className="flex flex-1 flex-col items-center justify-center">
        <header className="w-full flex flex-col items-center mt-12 mb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 font-sans text-center mb-2 drop-shadow">
            Gerador de Provas
          </h1>
          <button
            onClick={handleLogout}
            className="mt-2 bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg shadow hover:bg-blue-50 transition"
          >
            Sair
          </button>
        </header>
        <main className="w-full flex flex-col items-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg mb-8">
            <QuizForm onSubmit={handleCreateQuiz} />
            {loading && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Gerando questões...</p>
              </div>
            )}
          </div>
          {questions.length > 0 && (
            <div className="w-full max-w-3xl flex flex-col items-center">
              {/* Botões de ação */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={exportXLSX}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition"
                >
                  Exportar XLSX
                </button>
                <button
                  onClick={() => setShowExamModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition"
                >
                  Gerar Prova
                </button>
                <button
                  onClick={() => setShowListManager(true)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition"
                >
                  Gerenciar Listas
                </button>
                {examData && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportDOCX(true)}
                      className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-semibold shadow transition"
                      disabled={isGeneratingDocx}
                    >
                      {isGeneratingDocx ? 'Gerando...' : 'Baixar Prova'}
                    </button>
                    <button
                      onClick={() => exportDOCX(false)}
                      className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold shadow transition"
                      disabled={isGeneratingDocx}
                    >
                      {isGeneratingDocx ? 'Gerando...' : 'Baixar Gabarito'}
                    </button>
                  </div>
                )}
              </div>

              {/* Título e área das questões geradas */}
              <h2 className="text-2xl font-bold text-blue-700 mb-4">Questões Geradas</h2>
              <div className="flex flex-col gap-y-12 w-full">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-blue-100 rounded-xl shadow-md p-6 flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-blue-800">Questão {idx + 1}</span>
                        <button
                          onClick={() => moveQuestion(idx, idx - 1)}
                          disabled={editingIdx !== null || idx === 0}
                          className={`font-bold px-1 ${editingIdx !== null || idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-700'}`}
                          title="Mover para cima"
                          type="button"
                        >↑</button>
                        <button
                          onClick={() => moveQuestion(idx, idx + 1)}
                          disabled={editingIdx !== null || idx === questions.length - 1}
                          className={`font-bold px-1 ${editingIdx !== null || idx === questions.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-700'}`}
                          title="Mover para baixo"
                          type="button"
                        >↓</button>
                      </div>
                      <div className="flex gap-2">
                        {editingIdx === idx ? (
                          <>
                            {/* Botões no modo edição */}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(idx)}
                              className="text-blue-600 font-bold"
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(idx)}
                              className="text-red-600 font-bold"
                              type="button"
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingIdx === idx ? (
                      <>
                        <div className="mb-2">
                          <label className="block text-xs font-semibold text-blue-700 mb-1">Enunciado</label>
                          <input
                            className="mb-2 border rounded px-2 py-1 w-full"
                            value={editData.enunciado || ''}
                            onChange={e =>
                              setEditData(ed => ({ ...ed, enunciado: e.target.value }))
                            }
                          />
                        </div>
                        {q.alternativas && (
                          <div className="mb-2">
                            <label className="block text-xs font-semibold text-blue-700 mb-1">Alternativas</label>
                            {q.alternativas.map((alt, i) => (
                              <div key={i} className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-blue-700 mr-1">{letras[i]})</span>
                                <input
                                  className="border rounded px-2 py-1 flex-1"
                                  value={editData.alternativas?.[i] ?? alt}
                                  onChange={e => {
                                    const newAlts = [...(editData.alternativas || q.alternativas!)]
                                    newAlts[i] = e.target.value
                                    setEditData(ed => ({ ...ed, alternativas: newAlts }))
                                  }}
                                />
                                <input
                                  type="radio"
                                  name={`correta-${idx}`}
                                  checked={editData.correta === i}
                                  onChange={() => setEditData(ed => ({ ...ed, correta: i }))}
                                  title="Marcar como correta"
                                />
                                <span className="text-xs text-green-700">{editData.correta === i ? 'Correta' : ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Campo de resposta para questão aberta */}
                        {(!q.alternativas || q.alternativas.length === 0) && (
                          <div className="mb-2">
                            <label className="block text-xs font-semibold text-green-700 mb-1">Resposta</label>
                            <input
                              className="border rounded px-2 py-1 w-full"
                              value={editData.resposta || ''}
                              onChange={e =>
                                setEditData(ed => ({ ...ed, resposta: e.target.value }))
                              }
                            />
                          </div>
                        )}
                        <div className="mb-2">
                          <label className="block text-xs font-semibold text-blue-700 mb-1">Explicação</label>
                          <input
                            className="border rounded px-2 py-1 w-full"
                            value={editData.explicacao || ''}
                            onChange={e =>
                              setEditData(ed => ({ ...ed, explicacao: e.target.value }))
                            }
                          />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSave(idx)}
                            className="text-green-600 font-bold"
                            type="button"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 font-bold"
                            type="button"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-2 text-gray-800">{q.enunciado}</div>
                        {(!q.alternativas || q.alternativas.length === 0) && q.resposta && (
                          <div className="mb-2 text-green-700 font-semibold">
                            Resposta: {q.resposta}
                          </div>
                        )}
                        {q.alternativas && q.alternativas.length > 0 && (
                          <ul className="mb-2 list-none pl-0">
                            {q.alternativas.map((alt, i) => (
                              <li
                                key={i}
                                className={`flex items-center gap-2 ${i === q.correta ? 'font-bold text-green-700' : 'text-gray-700'}`}
                              >
                                <span className="font-bold text-blue-700 mr-1">{letras[i]})</span>
                                {alt}
                                {i === q.correta && (
                                  <span className="ml-2 text-xs text-green-700 font-semibold">(Correta)</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="text-sm text-gray-600 mt-2">
                          <span className="font-semibold">Explicação:</span> {q.explicacao}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Bloco de "Gerar mais questões" vem depois */}
              {showAddMore && (
                <div className="mt-8 p-4 bg-white rounded-lg shadow-md w-full">
                  <h3 className="text-lg font-semibold text-blue-700 mb-3">
                    Gerar mais questões
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Quantidade:</label>
                      <input
                        type="number"
                        min={1}
                        max={1}
                        value={addCount}
                        onChange={(e) => setAddCount(Number(e.target.value))}
                        className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <button
                      onClick={handleGenerateMore}
                      disabled={isGeneratingMore}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition disabled:opacity-50"
                    >
                      {isGeneratingMore ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Gerando...
                        </span>
                      ) : (
                        '+ questões'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      <footer className="text-center text-gray-500 py-6 mt-8">
        Criado por Márcio Medrado - marciomedrado@gmail.com
      </footer>
      {/* Modais */}
      <ExamDataModal
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        onConfirm={data => {
          setExamData(data)
          setShowExamModal(false)
          toast.success('Dados da prova salvos! Agora você pode baixar a Prova e o Gabarito.')
        }}
        defaultArea={lastFormData?.area || ''}
        defaultTema={lastFormData?.tema || ''}
      />
      <ListManager
        isOpen={showListManager}
        onClose={() => setShowListManager(false)}
      />
    </div>
  )
}