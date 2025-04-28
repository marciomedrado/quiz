import { NextResponse } from 'next/server'

const openaiApiKey = process.env.OPENAI_API_KEY

async function gerarQuestoes(prompt: string): Promise<any> {
  console.log("Chamando OpenAI com prompt:", prompt.slice(0, 300) + '...')

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    console.error("Erro da OpenAI:", openaiRes.status, errText)
    throw new Error(`Erro da OpenAI: ${openaiRes.status} - ${errText}`)
  }

  const openaiData = await openaiRes.json()
  const content = openaiData.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Erro ao gerar questões com a OpenAI: resposta vazia')
  }

  let questions
  try {
    questions = JSON.parse(content)
  } catch {
    const match = content.match(/\[[\s\S]*\]/)
    if (!match) {
      console.error("Conteúdo retornado pela OpenAI (sem JSON):", content)
      throw new Error('JSON não encontrado na resposta da OpenAI')
    }
    try {
      questions = JSON.parse(match[0])
    } catch (err) {
      console.error("Erro ao parsear JSON extraído:", match[0])
      throw new Error('Falha ao parsear o JSON extraído da resposta da OpenAI')
    }
  }
  return questions
}

function getNivelQuestaoPrompt(nivel: string) {
  switch (nivel) {
    case 'Nível Fundamental I (até 11 anos)':
      return 'A questão deve ser adequada para crianças até 11 anos, com linguagem simples e exemplos do cotidiano escolar ou familiar.'
    case 'Nível Fundamental II (até 14 anos)':
      return 'A questão deve ser adequada para adolescentes até 14 anos, com linguagem acessível e exemplos do cotidiano escolar, podendo abordar temas um pouco mais complexos.'
    case 'Nível Médio':
      return 'A questão deve ser adequada para estudantes do Ensino Médio, com linguagem apropriada para jovens de 15 a 18 anos, podendo abordar temas mais aprofundados e críticos.'
    case 'Nível Superior':
      return 'A questão deve ser adequada para estudantes universitários, com linguagem técnica e abordagem aprofundada dos temas.'
    default:
      return ''
  }
}

function getNivelExplicacaoPrompt(nivel: string) {
  switch (nivel) {
    case 'Direta e curta.':
      return 'A explicação deve ser direta e muito curta, apenas o essencial para justificar a resposta.'
    case 'Detalhada e aprofundada.':
      return 'A explicação deve ser detalhada, com justificativas completas, exemplos e aprofundamento no tema.'
    case 'Com analogias e exemplos.':
      return 'A explicação deve conter analogias e exemplos para facilitar o entendimento.'
    default:
      return ''
  }
}

export async function POST(req: Request) {
  console.log("OPENAI_API_KEY está presente?", !!openaiApiKey)

  if (!openaiApiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key não configurada' },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const nivelQuestaoPrompt = getNivelQuestaoPrompt(body.nivel)
    const nivelExplicacaoPrompt = getNivelExplicacaoPrompt(body.explicacao)

    let prompt = ''
    
    if (body.alternativas === 0 || body.alternativas === 'Aberta') {
      prompt = `
Gere uma questão sobre o tema "${body.tema}" na área "${body.area}".
A questão deve conter:
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
]`
    } else {
      prompt = `
Gere uma questão de múltipla escolha sobre o tema "${body.tema}" na área "${body.area}".
A questão deve ter ${body.alternativas || 4} alternativas, apenas uma correta.
IMPORTANTE: 
- Distribua as respostas corretas de forma aleatória entre as alternativas.
- Evite colocar mais de uma resposta correta.
- Escreva as alternativas como uma lista de strings, sem letras, números ou símbolos antes do texto.
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
]`
    }

    const questions = await gerarQuestoes(prompt)
    console.log("Questão gerada com sucesso")
    
    return NextResponse.json({ questions })

  } catch (error: any) {
    console.error("Erro ao gerar questão:", error)
    return NextResponse.json(
      { error: error.message || 'Erro desconhecido ao gerar questão' },
      { status: 500 }
    )
  }
}