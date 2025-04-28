import React, { useState } from 'react'

export interface QuizFormData {
  area: string
  tema: string
  quantidade: number
  alternativas: number
  idioma: string
  nivel: string
  explicacao: string
}

interface QuizFormProps {
  onSubmit: (data: QuizFormData) => void
}

const niveis = [
  'Nível Fundamental I (até 11 anos)',
  'Nível Fundamental II (até 14 anos)',
  'Nível Médio',
  'Nível Superior',
]

const explicacoes = [
  'Direta e curta.',
  'Detalhada e aprofundada.',
  'Com analogias e exemplos.',
]

export default function QuizForm({ onSubmit }: QuizFormProps) {
  const [form, setForm] = useState<QuizFormData>({
    area: '',
    tema: '',
    quantidade: 1,
    alternativas: 4,
    idioma: 'Português',
    nivel: niveis[0],
    explicacao: explicacoes[0],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'quantidade' || name === 'alternativas' ? Number(value) : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-6 shadow-md"
    >
      <div>
        <label className="block text-sm font-medium text-blue-700 mb-1">Área do Quiz</label>
        <input
          type="text"
          name="area"
          value={form.area}
          onChange={handleChange}
          required
          className="w-full rounded-lg border border-blue-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Ex: Matemática"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-blue-700 mb-1">Tema do Quiz</label>
        <input
          type="text"
          name="tema"
          value={form.tema}
          onChange={handleChange}
          required
          className="w-full rounded-lg border border-blue-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Ex: Frações"
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-blue-700 mb-1">Número de Questões</label>
          <input
            type="number"
            name="quantidade"
            value={form.quantidade}
            onChange={handleChange}
            min={1}
            max={5}
            required
            className="w-full rounded-lg border border-blue-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-blue-700 mb-1">Número de Alternativas</label>
          <select
            name="alternativas"
            value={form.alternativas}
            onChange={handleChange}
            className="w-full rounded-lg border border-blue-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={0}>Aberta</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-blue-700 mb-1">Idioma</label>
        <select
          name="idioma"
          value={form.idioma}
          onChange={handleChange}
          className="w-full rounded-lg border border-blue-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option>Português</option>
          <option>Inglês</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-blue-700 mb-1">Nível da Questão</label>
        <select
          name="nivel"
          value={form.nivel}
          onChange={handleChange}
          className="w-full rounded-lg border border-blue-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {niveis.map(n => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-blue-700 mb-1">Nível da Explicação</label>
        <select
          name="explicacao"
          value={form.explicacao}
          onChange={handleChange}
          className="w-full rounded-lg border border-blue-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {explicacoes.map(e => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg shadow transition"
      >
        Gerar Questões
      </button>
    </form>
  )
}