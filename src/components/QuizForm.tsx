import { useState } from 'react'

export interface QuizFormData {
  area: string
  tema: string
  numQuestoes: number
  numAlternativas: string
  lingua: string
  nivelQuestao: string
  nivelExplicacao: string
}

interface Props {
  onSubmit: (data: QuizFormData) => void
}

export default function QuizForm({ onSubmit }: Props) {
  const [form, setForm] = useState<QuizFormData>({
    area: '',
    tema: '',
    numQuestoes: 1,
    numAlternativas: '4',
    lingua: 'Português',
    nivelQuestao: 'Nível Fundamental I (até 11 anos)',
    nivelExplicacao: 'Direta e curta.',
  })

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        onSubmit(form)
      }}
      className="space-y-2"
    >
      <div>
        <label>Área do Quiz</label>
        <input
          type="text"
          value={form.area}
          onChange={e => setForm({ ...form, area: e.target.value })}
          className="border ml-2"
        />
      </div>
      <div>
        <label>Tema do Quiz</label>
        <input
          type="text"
          value={form.tema}
          onChange={e => setForm({ ...form, tema: e.target.value })}
          className="border ml-2"
        />
      </div>
      <div>
        <label>Número de Questões</label>
        <input
          type="number"
          min={1}
          max={50}
          value={form.numQuestoes}
          onChange={e => setForm({ ...form, numQuestoes: Number(e.target.value) })}
          className="border ml-2 w-16"
        />
      </div>
      <div>
        <label>Número de Alternativas</label>
        <select
          value={form.numAlternativas}
          onChange={e => setForm({ ...form, numAlternativas: e.target.value })}
          className="border ml-2"
        >
          <option value="Aberta">Aberta</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </div>
      <div>
        <label>Idioma</label>
        <select
          value={form.lingua}
          onChange={e => setForm({ ...form, lingua: e.target.value })}
          className="border ml-2"
        >
          <option value="Português">Português</option>
          <option value="Inglês">Inglês</option>
          <option value="Espanhol">Espanhol</option>
        </select>
      </div>
      <div>
        <label>Nível da Questão</label>
        <select
          value={form.nivelQuestao}
          onChange={e => setForm({ ...form, nivelQuestao: e.target.value })}
          className="border ml-2"
        >
          <option>Nível Fundamental I (até 11 anos)</option>
          <option>Nível Fundamental II (até 15 anos)</option>
          <option>Nível Médio (Ensino Médio)</option>
          <option>Nível Avançado (Ensino Superior)</option>
        </select>
      </div>
      <div>
        <label>Nível da Explicação</label>
        <select
          value={form.nivelExplicacao}
          onChange={e => setForm({ ...form, nivelExplicacao: e.target.value })}
          className="border ml-2"
        >
          <option>Direta e curta.</option>
          <option>Explicação curta.</option>
          <option>Explicação intermediária.</option>
          <option>Explicação detalhada.</option>
        </select>
      </div>
      <button
        type="submit"
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
      >
        Gerar Questões
      </button>
    </form>
  )
}