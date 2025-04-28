// src/components/ListManager.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ListItem {
  id: string
  name: string
  created_at: string
}

interface ListManagerProps {
  isOpen: boolean
  onClose: () => void
}

export default function ListManager({ isOpen, onClose }: ListManagerProps) {
  const [activeList, setActiveList] = useState<string>('escolas')
  const [items, setItems] = useState<ListItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const lists = [
    { id: 'escolas', name: 'Escolas' },
    { id: 'professores', name: 'Professores' },
    { id: 'alunos', name: 'Alunos' },
    { id: 'turmas', name: 'Turmas' },
    { id: 'disciplinas', name: 'Disciplinas' },
  ]

  useEffect(() => {
    if (isOpen) {
      loadItems()
    }
  }, [activeList, isOpen])

  async function loadItems() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from(activeList)
        .select('*')
        .order('name')

      if (error) {
        throw error
      }

      setItems(data || [])
    } catch (error: any) {
      toast.error(`Erro ao carregar items: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAdd() {
    if (!newItem.trim()) return

    try {
      const { error } = await supabase
        .from(activeList)
        .insert([{ name: newItem.trim() }])

      if (error) {
        throw error
      }

      setNewItem('')
      loadItems()
      toast.success('Item adicionado com sucesso!')
    } catch (error: any) {
      toast.error(`Erro ao adicionar item: ${error.message}`)
    }
  }

  async function handleEdit(id: string) {
    if (!editingName.trim()) return

    try {
      const { error } = await supabase
        .from(activeList)
        .update({ name: editingName.trim() })
        .eq('id', id)

      if (error) {
        throw error
      }

      setEditingId(null)
      setEditingName('')
      loadItems()
      toast.success('Item atualizado com sucesso!')
    } catch (error: any) {
      toast.error(`Erro ao editar item: ${error.message}`)
    }
  }

  async function handleDelete(id: string) {
    // Confirmação antes de excluir
    const confirmed = window.confirm('Tem certeza que deseja excluir este item?')
    if (!confirmed) return
  
    try {
      const { error } = await supabase
        .from(activeList)
        .delete()
        .eq('id', id)
  
      if (error) {
        throw error
      }
  
      loadItems()
      toast.success('Item removido com sucesso!')
    } catch (error: any) {
      toast.error(`Erro ao deletar item: ${error.message}`)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-700">Gerenciar Listas</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {lists.map(list => (
            <button
              key={list.id}
              onClick={() => setActiveList(list.id)}
              className={`px-3 py-1 rounded whitespace-nowrap ${
                activeList === list.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } transition`}
            >
              {list.name}
            </button>
          ))}
        </div>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder={`Novo(a) ${activeList.slice(0, -1)}...`}
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onKeyPress={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          >
            Adicionar
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              Nenhum item encontrado
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition"
              >
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className="flex-1 border rounded px-2 py-1 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                    onKeyPress={e => e.key === 'Enter' && handleEdit(item.id)}
                  />
                ) : (
                  <span className="text-gray-700">{item.name}</span>
                )}
                <div className="flex gap-2">
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => handleEdit(item.id)}
                        className="text-green-600 hover:text-green-700 transition"
                        title="Salvar"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditingName('')
                        }}
                        className="text-red-600 hover:text-red-700 transition"
                        title="Cancelar"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(item.id)
                          setEditingName(item.name)
                        }}
                        className="text-blue-600 hover:text-blue-700 transition"
                        title="Editar"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-700 transition"
                        title="Excluir"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}