'use client'

import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import SelectFromListModal from './SelectFromListModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AutoCompleteInputProps {
  table: string
  label: string
  value: string
  onChange: (val: string) => void
  required?: boolean
}

export default function AutoCompleteInput({
  table,
  label,
  value,
  onChange,
  required = false,
}: AutoCompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Busca sugestões ao digitar
  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    if (val.length > 0) {
      const { data } = await supabase
        .from(table)
        .select('name')
        .ilike('name', `%${val}%`)
        .order('name')
      setSuggestions(data?.map(d => d.name) || [])
      setShowDropdown(true)
    } else {
      setShowDropdown(false)
    }
  }

  // Seleciona sugestão
  const handleSelect = (name: string) => {
    onChange(name)
    setShowDropdown(false)
  }

  // Adiciona ao banco se não existir
  const handleBlur = async () => {
    setTimeout(async () => {
      if (value && !suggestions.includes(value)) {
        await supabase.from(table).insert([{ name: value }])
      }
      setShowDropdown(false)
    }, 200) // timeout para permitir clique na sugestão
  }

  // Abre modal de seleção
  const handleOpenList = () => setShowModal(true)

  return (
    <div className="relative flex items-center mb-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInput}
          onBlur={handleBlur}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          autoComplete="off"
          required={required}
        />
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-20 bg-white border rounded w-full mt-1 max-h-40 overflow-y-auto shadow">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="px-3 py-1 hover:bg-blue-100 cursor-pointer"
                onMouseDown={() => handleSelect(s)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={handleOpenList}
        className="ml-2 text-blue-600 font-bold text-lg px-2 py-1 rounded hover:bg-blue-100"
        title={`Selecionar ${label} da lista`}
      >
        +
      </button>
      {showModal && (
        <SelectFromListModal
          table={table}
          label={label}
          onSelect={name => {
            onChange(name)
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}