import { NextResponse } from 'next/server'

const openaiApiKey = process.env.OPENAI_API_KEY

// Função para verificar a distribuição das respostas
function verificaDistribuicaoRespostas(questions: any[]) {
  const contagem = questions.reduce((acc: { [key: number]: number }, q) => {
    if (q.correta !== undefined) {
      acc[q.correta] = (acc[q.correta] || 0) + 1
    }
    return acc
  }, {})

  const total = questions.length
  const porcentagens = Object.entries(contagem).map(([posicao, quantidade]) => ({
    posicao: Number(posicao),
    porcentagem: (quantidade / total) * 100
  }))

  const distribuicaoRuim = porcentagens.some(p => p.porcentagem > 60)
  const todasMesmaPosicao = Object.keys(contagem).length === 1

  return {
    distribuicaoRuim,
    todasMesmaPosicao,
    contagem
  }
}

// Função para gerar questões via OpenAI
async function gerarQuestoes(prompt: string): Promise<any> {
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Sempre usa gpt-4o-mini
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  const openaiData = await openaiRes.json()
  const content = openaiData.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Erro ao gerar questões com a OpenAI')
  }

  const match = content.match(/\[\s*{[\s\S]*}\s*\]/)
  if (!match) {
    throw new Error('JSON não encontrado na resposta da OpenAI')
  }

  return JSON.parse(match[0])
}

// Funções de adaptação de prompt
function getNivelQuestaoPrompt(nivel: string) {
  switch (nivel) {
    case 'Nível Fundamental I (até 11 anos)':
      return 'As questões devem ser adequadas para crianças até 11 anos, com linguagem simples e exemplos do cotidiano escolar ou familiar.'
    case 'Nível Fundamental II (até 15 anos)':
      return 'As questões devem ser adequadas para adolescentes até 15 anos, com linguagem acessível e exemplos do cotidiano escolar, podendo abordar temas um pouco mais complexos.'
    case 'Nível Médio (Ensino Médio)':
      return 'As questões devem ser adequadas para estudantes do Ensino Médio, com linguagem apropriada para jovens de 15 a 18 anos, podendo abordar temas mais aprofundados e críticos.'
    case 'Nível Avançado (Ensino Superior)':
      return 'As questões devem ser adequadas para estudantes universitários, com linguagem técnica e abordagem aprofundada dos temas.'
    default:
      return ''
  }
}

function getNivelExplicacaoPrompt(nivel: string) {
  switch (nivel) {
    case 'Direta e curta.':
      return 'A explicação deve ser direta e muito curta, apenas o essencial para justificar a resposta.'
    case 'Explicação curta.':
      return 'A explicação deve ser curta, clara e objetiva, com uma frase simples.'
    case 'Explicação intermediária.':
      return 'A explicação deve ser intermediária, com detalhes suficientes para justificar a resposta, mas sem se alongar demais.'
    case 'Explicação detalhada.':
      return 'A explicação deve ser detalhada, com justificativas completas, exemplos e aprofundamento no tema.'
    default:
      return ''
  }
}

export async function POST(req: Request) {
  if (!openaiApiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key não configurada' },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const nivelQuestaoPrompt = getNivelQuestaoPrompt(body.nivelQuestao)
    const nivelExplicacaoPrompt = getNivelExplicacaoPrompt(body.nivelExplicacao)

    let questions
    let tentativas = 0
    const maxTentativas = 3

    do {
      let prompt = ''
      
      if (body.numAlternativas === 'Aberta') {
        prompt = `
Gere ${body.numQuestoes} questões abertas sobre o tema "${body.tema}" na área "${body.area}".
Cada questão deve conter:
1. O enunciado da questão
2. A resposta correta
3. Uma explicação da resposta
${nivelQuestaoPrompt}
A explicação deve seguir este critério: ${nivelExplicacaoPrompt}
Responda apenas com o JSON, sem explicações, sem comentários, sem texto antes ou depois.
Exemplo de formato esperado:
[
  {
    "enunciado": "Pergunta aberta...",
    "resposta": "Resposta correta da pergunta...",
    "explicacao": "Explicação detalhada da resposta..."
  }
]
`
      } else {
        prompt = `
Gere ${body.numQuestoes} questões de múltipla escolha sobre o tema "${body.tema}" na área "${body.area}".
Cada questão deve ter ${body.numAlternativas || 4} alternativas, apenas uma correta.
IMPORTANTE: Distribua as respostas corretas de forma aleatória entre as alternativas.
Evite colocar muitas respostas corretas na mesma posição.
Escreva as alternativas como uma lista de strings, sem letras, números ou símbolos antes do texto (apenas o texto da alternativa).
Indique o índice da alternativa correta após o embaralhamento, usando o campo "correta" (de 0 a 3).
${nivelQuestaoPrompt}
A explicação deve seguir este critério: ${nivelExplicacaoPrompt}
Responda apenas com o JSON, sem explicações, sem comentários, sem texto antes ou depois.
Exemplo de formato esperado:
[
  {
    "enunciado": "Qual é a capital da França?",
    "alternativas": ["Paris", "Londres", "Berlim", "Roma"],
    "correta": 0,
    "explicacao": "Paris é a capital da França."
  }
]
`
      }

      questions = await gerarQuestoes(prompt)
      
      if (body.numAlternativas !== 'Aberta') {
        const { distribuicaoRuim, todasMesmaPosicao } = verificaDistribuicaoRespostas(questions)
        if (!distribuicaoRuim && !todasMesmaPosicao) {
          break
        }
        console.log(`Tentativa ${tentativas + 1}: Distribuição ruim ou respostas na mesma posição. Gerando novamente...`)
      } else {
        break
      }

      tentativas++
    } while (tentativas < maxTentativas)

    return NextResponse.json({ questions })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}