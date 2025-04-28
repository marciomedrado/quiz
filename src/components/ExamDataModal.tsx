// src/components/ExamDataModal.tsx

'use client'

import { useState, useEffect } from 'react'
import AutoCompleteInput from './AutoCompleteInput'

export interface ExamData {
  escola: string
  professor: string
  aluno: string
  turma: string
  disciplina: string
  area: string
  tema: string
}

interface ExamDataModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: ExamData) => void
  defaultArea?: string
  defaultTema?: string
}

export default function ExamDataModal({
  isOpen,
  onClose,
  onConfirm,
  defaultArea = '',
  defaultTema = '',
}: ExamDataModalProps) {
  const [formData, setFormData] = useState<ExamData>({
    escola: '',
    professor: '',
    aluno: '',
    turma: '',
    disciplina: '',
    area: defaultArea,
    tema: defaultTema,
  })

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        aluno: '', // sempre vazio ao abrir
        area: defaultArea,
        tema: defaultTema,
      }))
    }
  }, [isOpen, defaultArea, defaultTema])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold mb-4 text-blue-700">Dados da Prova</h2>

          <AutoCompleteInput
            table="escolas"
            label="Escola"
            value={formData.escola}
            onChange={val => setFormData(prev => ({ ...prev, escola: val }))}
          />
          <AutoCompleteInput
            table="professores"
            label="Professor"
            value={formData.professor}
            onChange={val => setFormData(prev => ({ ...prev, professor: val }))}
          />
          <AutoCompleteInput
            table="alunos"
            label="Aluno"
            value={formData.aluno}
            onChange={val => setFormData(prev => ({ ...prev, aluno: val }))}
          />
          <AutoCompleteInput
            table="turmas"
            label="Turma"
            value={formData.turma}
            onChange={val => setFormData(prev => ({ ...prev, turma: val }))}
          />
          <AutoCompleteInput
            table="disciplinas"
            label="Disciplina"
            value={formData.disciplina}
            onChange={val => setFormData(prev => ({ ...prev, disciplina: val }))}
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
            <input
              type="text"
              value={formData.area}
              readOnly
              className="w-full border rounded px-3 py-2 bg-gray-100"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
            <input
              type="text"
              value={formData.tema}
              readOnly
              className="w-full border rounded px-3 py-2 bg-gray-100"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}