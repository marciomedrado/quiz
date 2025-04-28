// src/components/QuestionsBoard.tsx

'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'

interface Question {
  enunciado: string
  alternativas?: string[]
  correta?: number
  explicacao: string
  resposta?: string
}

interface QuestionsBoardProps {
  questions: Question[]
  setQuestions: (questions: Question[]) => void
}

export default function QuestionsBoard({ questions, setQuestions }: QuestionsBoardProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<Question>>({})

  // Função para reordenar array
  const reorder = (list: Question[], startIndex: number, endIndex: number) => {
    const result = Array.from(list)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
  }

  // Ao soltar o card
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const reordered = reorder(questions, result.source.index, result.destination.index)
    setQuestions(reordered)
  }

  // Iniciar edição
  const handleEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditData({ ...questions[idx] })
  }

  // Salvar edição
  const handleSave = (idx: number) => {
    const updated = [...questions]
    updated[idx] = { ...updated[idx], ...editData }
    setQuestions(updated)
    setEditingIdx(null)
    setEditData({})
  }

  // Excluir questão com confirmação
  const handleDelete = (idx: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta questão?')) {
      setQuestions(questions.filter((_, i) => i !== idx))
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="questions">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {questions.map((q, idx) => (
              <Draggable key={idx} draggableId={String(idx)} index={idx}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="bg-white border border-blue-100 rounded-xl shadow-md p-6 mb-4 flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold text-blue-800">
                        Questão {idx + 1}
                      </div>
                      <div className="flex gap-2">
                        {editingIdx === idx ? (
                          <button
                            onClick={() => handleSave(idx)}
                            className="text-green-600 font-bold"
                          >
                            Salvar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEdit(idx)}
                            className="text-blue-600 font-bold"
                          >
                            Editar
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(idx)}
                          className="text-red-600 font-bold"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                    {editingIdx === idx ? (
                      <>
                        <input
                          className="mb-2 border rounded px-2 py-1 w-full"
                          value={editData.enunciado || ''}
                          onChange={e =>
                            setEditData(ed => ({ ...ed, enunciado: e.target.value }))
                          }
                        />
                        {q.alternativas && (
                          <div className="mb-2">
                            {q.alternativas.map((alt, i) => (
                              <input
                                key={i}
                                className="mb-1 border rounded px-2 py-1 w-full"
                                value={editData.alternativas?.[i] ?? alt}
                                onChange={e => {
                                  const newAlts = [...(editData.alternativas || q.alternativas!)]
                                  newAlts[i] = e.target.value
                                  setEditData(ed => ({ ...ed, alternativas: newAlts }))
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <input
                          className="mb-2 border rounded px-2 py-1 w-full"
                          value={editData.explicacao || ''}
                          onChange={e =>
                            setEditData(ed => ({ ...ed, explicacao: e.target.value }))
                          }
                        />
                      </>
                    ) : (
                      <>
                        <div className="mb-2 text-gray-800">{q.enunciado}</div>
                        {q.alternativas && q.alternativas.length > 0 && (
                          <ul className="mb-2 list-none pl-0">
                            {q.alternativas.map((alt, i) => (
                              <li key={i} className="text-gray-700">
                                <span className="inline-block bg-blue-200 text-blue-800 rounded px-2 py-0.5 font-semibold">
                                  {String.fromCharCode(65 + i)})</span> {alt}
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
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}