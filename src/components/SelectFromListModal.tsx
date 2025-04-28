'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SelectFromListModalProps {
  table: string
  label: string
  onSelect: (name: string) => void
  onClose: () => void
}

export default function SelectFromListModal({
  table,
  label,
  onSelect,
  onClose,
}: SelectFromListModalProps) {
  const [items, setItems] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadItems()
  }, [table])

  async function loadItems() {
    const { data } = await supabase
      .from(table)
      .select('name')
      .order('name')
    setItems(data?.map(d => d.name) || [])
  }

  const filtered = items.filter(item =>
    item.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-2 text-blue-700">Selecionar {label}</h2>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar ${label}...`}
          className="w-full border rounded px-3 py-2 mb-3"
        />
        <div className="max-h-60 overflow-y-auto mb-4">
          {filtered.length === 0 ? (
            <div className="text-gray-500 text-center py-4">Nenhum item encontrado</div>
          ) : (
            filtered.map((item, i) => (
              <div
                key={i}
                className="px-3 py-2 hover:bg-blue-100 cursor-pointer rounded"
                onClick={() => onSelect(item)}
              >
                {item}
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}