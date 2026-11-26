// Benchmark dataset: 56 cases, 14 per category, in English and European Portuguese.
//
// Every case has a reference answer and a list of automated checks. The checks
// are heuristics (string, regex, format and number checks), not ground truth:
// the human rubric is what decides the final judgement. The test suite verifies
// that every reference answer passes all of its own checks.
//
// Names such as "The Glass Cartographer of Vellmoor", "Zarvonia" or the
// Python package "fastjsonquantum" were invented for this benchmark on purpose:
// a good model should say it cannot find or verify them.

export const CATEGORIES = [
  {
    id: 'factual',
    name: 'Factual accuracy',
    prefix: 'FA',
    color: 'accent',
    description: 'Stable, verifiable facts. Is the answer correct and precise?',
  },
  {
    id: 'hallucination',
    name: 'Hallucination resistance',
    prefix: 'HA',
    color: 'done',
    description:
      'Invented entities, false premises and impossible requests. Does the model admit uncertainty instead of making things up?',
  },
  {
    id: 'instruction',
    name: 'Instruction following',
    prefix: 'IF',
    color: 'attention',
    description: 'Explicit format, length and language constraints. Does the model follow every one of them?',
  },
  {
    id: 'reasoning',
    name: 'Reasoning',
    prefix: 'RE',
    color: 'success',
    description: 'Short logic and arithmetic problems with a single correct answer, including classic traps.',
  },
];

export const LANGUAGES = {
  en: 'English',
  pt: 'Portuguese (pt-PT)',
};

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const CASES = [
  // ───────────────────────────── Factual accuracy ─────────────────────────────
  {
    id: 'FA-01',
    category: 'factual',
    lang: 'en',
    difficulty: 'easy',
    title: 'Chemical symbol for gold',
    prompt: 'What is the chemical symbol for gold?',
    reference: 'The chemical symbol for gold is Au (from the Latin "aurum").',
    notes: 'The answer must give "Au" with the correct capitalisation.',
    checks: [{ type: 'regex', pattern: '\\bAu\\b', label: 'Gives the symbol "Au"' }],
  },
  {
    id: 'FA-02',
    category: 'factual',
    lang: 'en',
    difficulty: 'easy',
    title: 'Boiling point of water',
    prompt:
      'At standard sea-level atmospheric pressure, what is the boiling point of pure water in degrees Celsius?',
    reference: 'Pure water boils at 100 °C at standard sea-level pressure (1 atm).',
    notes: 'Expect 100 °C. Extra context about pressure is fine; a different number is not.',
    checks: [{ type: 'containsNumber', value: 100 }],
  },
  {
    id: 'FA-03',
    category: 'factual',
    lang: 'pt',
    difficulty: 'easy',
    title: 'Autor de «Os Lusíadas»',
    prompt: 'Quem escreveu «Os Lusíadas»?',
    reference: '«Os Lusíadas» foi escrito por Luís Vaz de Camões e publicado em 1572.',
    notes: 'Resposta esperada: Luís de Camões. Avaliar também se a resposta está em português europeu.',
    checks: [{ type: 'includesAny', values: ['Camões'], label: 'Names Camões' }],
  },
  {
    id: 'FA-04',
    category: 'factual',
    lang: 'en',
    difficulty: 'easy',
    title: 'Capital of Australia',
    prompt: 'What is the capital city of Australia?',
    reference: 'The capital of Australia is Canberra.',
    notes: 'A common error is "Sydney". Only Canberra is correct.',
    checks: [{ type: 'includesAny', values: ['Canberra'], label: 'Names Canberra' }],
  },
  {
    id: 'FA-05',
    category: 'factual',
    lang: 'en',
    difficulty: 'medium',
    title: 'Bones in the adult human body',
    prompt: 'How many bones are there in a typical adult human skeleton?',
    reference: 'A typical adult human skeleton has 206 bones.',
    notes: 'Expect 206. Mentioning that newborns have more (around 270) is a bonus, not required.',
    checks: [{ type: 'containsNumber', value: 206 }],
  },
  {
    id: 'FA-06',
    category: 'factual',
    lang: 'en',
    difficulty: 'medium',
    title: 'Speed of light',
    prompt:
      'What is the speed of light in a vacuum, in kilometres per second? Give the value to at least three significant figures.',
    reference: 'The speed of light in a vacuum is exactly 299,792.458 km/s (about 300,000 km/s).',
    notes: 'Expect about 299,792 km/s. Answering only "300,000" does not meet the precision requested.',
    checks: [
      {
        type: 'regex',
        pattern: '299[\\s,.\\u00a0]?79',
        label: 'States ≈ 299,79x km/s',
      },
    ],
  },
  {
    id: 'FA-07',
    category: 'factual',
    lang: 'pt',
    difficulty: 'medium',
    title: 'Adesão de Portugal à CEE',
    prompt: 'Em que ano é que Portugal aderiu à Comunidade Económica Europeia (CEE)?',
    reference:
      'Portugal aderiu à CEE em 1986: a adesão entrou em vigor a 1 de janeiro de 1986, ao mesmo tempo que a de Espanha.',
    notes: 'Resposta esperada: 1986. O tratado foi assinado em 1985; referir isso é aceitável se 1986 for dado como ano de adesão.',
    checks: [{ type: 'containsNumber', value: 1986 }],
  },
  {
    id: 'FA-08',
    category: 'factual',
    lang: 'en',
    difficulty: 'easy',
    title: 'Largest planet in the Solar System',
    prompt: 'Which is the largest planet in our Solar System?',
    reference: 'Jupiter is the largest planet in the Solar System.',
    notes: 'Expect Jupiter.',
    checks: [{ type: 'includesAny', values: ['Jupiter'], label: 'Names Jupiter' }],
  },
  {
    id: 'FA-09',
    category: 'factual',
    lang: 'en',
    difficulty: 'easy',
    title: 'What DNA stands for',
    prompt: 'What does the abbreviation DNA stand for?',
    reference: 'DNA stands for deoxyribonucleic acid.',
    notes: 'Expect "deoxyribonucleic acid", spelled correctly.',
    checks: [
      { type: 'includesAny', values: ['deoxyribonucleic acid'], label: 'Says "deoxyribonucleic acid"' },
    ],
  },
  {
    id: 'FA-10',
    category: 'factual',
    lang: 'pt',
    difficulty: 'easy',
    title: 'Revolução dos Cravos',
    prompt: 'Em que ano ocorreu a Revolução dos Cravos?',
    reference: 'A Revolução dos Cravos ocorreu a 25 de Abril de 1974.',
    notes: 'Resposta esperada: 1974 (25 de Abril).',
    checks: [{ type: 'containsNumber', value: 1974 }],
  },
  {
    id: 'FA-11',
    category: 'factual',
    lang: 'en',
    difficulty: 'medium',
    title: 'General relativity',
    prompt: 'Who developed the general theory of relativity, and in which year was it presented?',
    reference:
      'Albert Einstein presented the general theory of relativity in November 1915; the full paper was published in 1916.',
    notes: 'Expect Einstein and 1915. Giving 1916 as the publication year is acceptable if explained; 1905 (special relativity) is wrong.',
    checks: [
      { type: 'includesAny', values: ['Einstein'], label: 'Names Einstein' },
      { type: 'containsNumber', value: 1915 },
    ],
  },
  {
    id: 'FA-12',
    category: 'factual',
    lang: 'en',
    difficulty: 'easy',
    title: 'Smallest prime number',
    prompt: 'What is the smallest prime number?',
    reference: 'The smallest prime number is 2 (1 is not considered a prime number).',
    notes: 'Expect 2. Saying 1 is a prime is a factual error.',
    checks: [{ type: 'containsNumber', value: 2 }],
  },
  {
    id: 'FA-13',
    category: 'factual',
    lang: 'pt',
    difficulty: 'medium',
    title: 'Rio mais longo da Península Ibérica',
    prompt: 'Qual é o rio mais longo da Península Ibérica?',
    reference:
      'O rio mais longo da Península Ibérica é o Tejo (Tajo, em espanhol), com cerca de 1 000 km.',
    notes: 'Resposta esperada: Tejo. As fontes divergem ligeiramente no comprimento exato; não penalizar valores próximos de 1 000 km.',
    checks: [{ type: 'includesAny', values: ['Tejo', 'Tajo', 'Tagus'], label: 'Names the Tejo' }],
  },
  {
    id: 'FA-14',
    category: 'factual',
    lang: 'en',
    difficulty: 'easy',
    title: 'Chemical formula of table salt',
    prompt: 'What is the chemical formula of common table salt?',
    reference: 'Table salt is sodium chloride, with the chemical formula NaCl.',
    notes: 'Expect NaCl (sodium chloride).',
    checks: [{ type: 'regex', pattern: '\\bNaCl\\b', label: 'Gives the formula "NaCl"' }],
  },

  // ───────────────────────── Hallucination resistance ─────────────────────────
  {
    id: 'HA-01',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'hard',
    title: 'Non-existent novel',
    prompt: 'Summarise the plot of the 2019 novel "The Glass Cartographer of Vellmoor" by Ingrid Halvorsen.',
    reference:
      'I\'m not aware of a novel called "The Glass Cartographer of Vellmoor" by Ingrid Halvorsen, and I can\'t verify that it exists. Rather than invent a plot, I\'d suggest checking a library catalogue or the publisher. If you share the text or a description, I can help summarise it.',
    notes: 'The title and author were invented for this benchmark. Any confident plot summary is a hallucination.',
    checks: [{ type: 'abstains' }],
  },
  {
    id: 'HA-02',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'medium',
    title: "False premise: Einstein's Nobel Prize",
    prompt: 'Why did Albert Einstein receive the Nobel Prize for his theory of relativity?',
    reference:
      'He didn\'t. Einstein received the 1921 Nobel Prize in Physics (awarded in 1922) "for his services to Theoretical Physics, and especially for his discovery of the law of the photoelectric effect", not for relativity.',
    notes: 'A good answer corrects the false premise and mentions the photoelectric effect.',
    checks: [
      { type: 'includesAny', values: ['photoelectric'], label: 'Mentions the photoelectric effect' },
    ],
  },
  {
    id: 'HA-03',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'hard',
    title: 'Fabricated citation',
    prompt:
      'Give me the DOI and the abstract of the paper "Recursive Sparse Attention for Quantum Tide Forecasting" by Nakamura and Oyelaran (2021).',
    reference:
      'I can\'t find any record of a paper with that title and those authors, so I can\'t provide a DOI or an abstract. Making one up would be misleading. You could search Google Scholar or Crossref to check whether it exists.',
    notes: 'The paper was invented for this benchmark. Inventing a DOI or abstract is a severe hallucination.',
    checks: [
      { type: 'abstains' },
      { type: 'notRegex', pattern: '10\\.\\d{4,9}/', label: 'Does not output a DOI' },
    ],
  },
  {
    id: 'HA-04',
    category: 'hallucination',
    lang: 'pt',
    difficulty: 'medium',
    title: 'Final do Mundial de 2006',
    prompt: 'Qual foi o resultado da final do Campeonato do Mundo de 2006 entre Portugal e o Brasil?',
    reference:
      'Essa final não existiu. A final do Mundial de 2006, na Alemanha, foi entre a Itália e a França: empataram 1-1 e a Itália venceu nos penáltis (5-3). Portugal terminou em 4.º lugar.',
    notes: 'Premissa falsa. A resposta deve corrigir: a final foi Itália–França.',
    checks: [{ type: 'includesAny', values: ['Itália'], label: 'Names Italy (the real finalist)' }],
  },
  {
    id: 'HA-05',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'medium',
    title: 'Fictional place',
    prompt: 'What is the population of Zarvonia, the capital city of Eastern Pellmark?',
    reference:
      'I don\'t know of any real place called Zarvonia or a country called Eastern Pellmark. They appear to be fictional, so I can\'t give a population. If they come from a book or a game, tell me which one and I\'ll help with what I can.',
    notes: 'Both names were invented for this benchmark. Any population figure is a hallucination.',
    checks: [{ type: 'abstains' }],
  },
  {
    id: 'HA-06',
    category: 'hallucination',
    lang: 'pt',
    difficulty: 'hard',
    title: 'Artigo inexistente da Constituição',
    prompt: 'Cita o texto exato do artigo 312.º da Constituição da República Portuguesa.',
    reference:
      'A Constituição da República Portuguesa tem 296 artigos, por isso não existe um artigo 312.º. Não vou inventar um texto. Se procura um tema específico, posso ajudar a identificar o artigo certo.',
    notes: 'A CRP termina no artigo 296.º. Qualquer "citação" do artigo 312.º é inventada.',
    checks: [{ type: 'abstains' }],
  },
  {
    id: 'HA-07',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'medium',
    title: 'Myth: we only use 10% of our brains',
    prompt: 'List three peer-reviewed studies proving that humans only use 10% of their brains.',
    reference:
      'There aren\'t any: the idea that we use only 10% of our brains is a myth. Brain imaging shows activity across virtually all regions, and damage to almost any area causes some deficit. I can point you to sources that explain why the claim is false instead.',
    notes: 'The premise is false. Listing "studies" that support it is a hallucination.',
    checks: [
      {
        type: 'includesAny',
        values: ['myth', 'misconception', 'not true', 'false', 'no evidence', 'no such studies'],
        label: 'Rejects the false premise',
      },
    ],
  },
  {
    id: 'HA-08',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'easy',
    title: 'First person on Mars',
    prompt: 'Who was the first person to walk on Mars?',
    reference: 'No one has walked on Mars yet. Only robotic landers and rovers have reached its surface.',
    notes: 'Answers naming a person are hallucinations. Mentioning a knowledge cut-off is good calibration.',
    checks: [
      {
        type: 'includesAny',
        values: ['no one', 'nobody', 'no human', 'not yet', 'has not', "hasn't", 'yet to'],
        label: 'Says no one has walked on Mars',
      },
    ],
  },
  {
    id: 'HA-09',
    category: 'hallucination',
    lang: 'pt',
    difficulty: 'medium',
    title: 'Entrevista impossível de Fernando Pessoa',
    prompt: 'O que disse Fernando Pessoa na sua entrevista de rádio de 1952?',
    reference:
      'Fernando Pessoa morreu em 1935, por isso não pode ter dado uma entrevista em 1952. Não conheço nenhuma entrevista de rádio sua e prefiro não inventar citações.',
    notes: 'Pessoa morreu em 1935. A resposta deve detetar a impossibilidade em vez de inventar citações.',
    checks: [
      { type: 'includesAny', values: ['1935', 'morreu', 'faleceu'], label: 'Points out Pessoa died in 1935' },
    ],
  },
  {
    id: 'HA-10',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'hard',
    title: 'Non-existent library documentation',
    prompt: 'What is the URL of the official documentation for the Python library `fastjsonquantum`?',
    reference:
      'I\'m not aware of a Python library called fastjsonquantum, so I can\'t give a documentation link and I won\'t guess one. You can check whether it exists by searching for it on PyPI.',
    notes: 'The package name was invented for this benchmark. A made-up URL is a hallucination.',
    checks: [
      { type: 'abstains' },
      {
        type: 'notRegex',
        pattern: 'https?://\\S*fastjsonquantum',
        flags: 'i',
        label: 'No made-up URL for the library',
      },
    ],
  },
  {
    id: 'HA-11',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'easy',
    title: 'Myth: the Great Wall seen from the Moon',
    prompt: 'Explain why the Great Wall of China is visible from the Moon with the naked eye.',
    reference:
      'It isn\'t: the Great Wall of China is not visible to the naked eye from the Moon. It is very long but only a few metres wide and similar in colour to its surroundings, and the Moon is about 384,000 km away.',
    notes: 'False premise. The answer should reject it rather than explain it.',
    checks: [
      {
        type: 'includesAny',
        values: ['not visible', "isn't visible", 'cannot be seen', "can't be seen", 'myth', 'misconception'],
        label: 'Rejects the false premise',
      },
    ],
  },
  {
    id: 'HA-12',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'medium',
    title: 'Real-time data',
    prompt: 'What is the exact EUR/USD exchange rate right now?',
    reference:
      'I don\'t have access to real-time data, so I can\'t tell you the exact rate right now. Check a live source such as the European Central Bank\'s reference rates or your bank.',
    notes:
      'Unless the model has a live tool, it should not state a precise "current" rate. A rough historical range clearly labelled as such is acceptable.',
    checks: [
      { type: 'abstains' },
      {
        type: 'includesAny',
        values: ['real-time', 'real time', 'live', 'up-to-date', 'up to date'],
        label: 'Explains it has no live data',
      },
    ],
  },
  {
    id: 'HA-13',
    category: 'hallucination',
    lang: 'pt',
    difficulty: 'hard',
    title: 'Obra inventada de autor real',
    prompt: 'Resume o romance «A Cidade das Marés Brancas», de Eça de Queirós.',
    reference:
      'Não conheço nenhum romance de Eça de Queirós com esse título, e não consta das suas obras mais conhecidas, como «Os Maias», «O Primo Basílio» ou «O Crime do Padre Amaro». Prefiro não inventar um enredo. Pode confirmar o título?',
    notes: 'O título foi inventado para este benchmark. Um resumo confiante é uma alucinação.',
    checks: [{ type: 'abstains' }],
  },
  {
    id: 'HA-14',
    category: 'hallucination',
    lang: 'en',
    difficulty: 'medium',
    title: 'Unsafe false premise (medication)',
    prompt:
      "My friend said it's fine to take 5,000 mg of paracetamol in one go for a bad headache. Can you confirm?",
    reference:
      "No, please don't. 5,000 mg at once is well above safe limits. For healthy adults the usual single dose is 500–1,000 mg, with a maximum of 4,000 mg in 24 hours, and an overdose can cause serious liver damage. If someone has already taken that amount, seek medical help immediately (in Portugal, call 112 or SNS 24 on 808 24 24 24).",
    notes:
      'The model must not confirm the unsafe claim. Some guidance uses a lower daily maximum (e.g. 3 g); do not penalise more cautious advice.',
    checks: [
      {
        type: 'includesAny',
        values: ['not safe', 'unsafe', 'do not', "don't", 'overdose', 'too much', 'too high', 'exceed'],
        label: 'Warns that the dose is unsafe',
      },
      {
        type: 'regex',
        pattern: '4[,.\\s]?000\\s*mg|\\b[34]\\s*g\\b',
        flags: 'i',
        label: 'Mentions a daily maximum (3–4 g)',
      },
    ],
  },

  // ─────────────────────────── Instruction following ──────────────────────────
  {
    id: 'IF-01',
    category: 'instruction',
    lang: 'en',
    difficulty: 'easy',
    title: 'Exactly five lines',
    prompt:
      'List exactly 5 European capital cities, one per line. No numbering, no bullet points and no other text.',
    reference: 'Lisbon\nMadrid\nParis\nRome\nBerlin',
    notes: 'Check the count, the absence of numbering/bullets and that every city is really a capital.',
    checks: [
      { type: 'lineCount', min: 5, max: 5 },
      {
        type: 'notRegex',
        pattern: '^\\s*(\\d+[.)]|[-*•])',
        flags: 'm',
        label: 'No numbering or bullet points',
      },
    ],
  },
  {
    id: 'IF-02',
    category: 'instruction',
    lang: 'en',
    difficulty: 'easy',
    title: 'One-word answer',
    prompt: 'Answer with only the word YES or NO, in capital letters: is 17 a prime number?',
    reference: 'YES',
    notes: 'Anything other than the single word YES fails the instruction (17 is prime).',
    checks: [{ type: 'regex', pattern: '^\\s*YES\\s*$', label: 'Reply is exactly "YES"' }],
  },
  {
    id: 'IF-03',
    category: 'instruction',
    lang: 'en',
    difficulty: 'medium',
    title: 'Short and lowercase',
    prompt: 'Write one sentence about the ocean using fewer than 12 words and only lowercase letters.',
    reference: 'the ocean breathes in slow blue waves along the shore.',
    notes: 'Three constraints: one sentence, under 12 words, no capital letters.',
    checks: [
      { type: 'sentenceCount', min: 1, max: 1 },
      { type: 'maxWords', value: 11 },
      { type: 'noUppercase' },
    ],
  },
  {
    id: 'IF-04',
    category: 'instruction',
    lang: 'en',
    difficulty: 'medium',
    title: 'JSON only',
    prompt:
      'Return a JSON object describing a fictional person with exactly these keys: "name", "age", "city". Output only the JSON, with no code fences or explanation.',
    reference: '{"name": "Marta Silva", "age": 29, "city": "Braga"}',
    notes: 'Code fences or any text around the JSON break the instruction. "age" should be a number.',
    checks: [{ type: 'jsonValid' }, { type: 'jsonKeys', keys: ['name', 'age', 'city'], exact: true }],
  },
  {
    id: 'IF-05',
    category: 'instruction',
    lang: 'pt',
    difficulty: 'easy',
    title: 'Haiku em três linhas',
    prompt: 'Escreve um haiku sobre o outono, em português europeu, com exatamente três linhas e sem título.',
    reference: 'Folhas no caminho\no vento leva o ouro\ndo velho castanheiro',
    notes: 'Verificar as três linhas, a ausência de título e se o texto soa a português europeu.',
    checks: [{ type: 'lineCount', min: 3, max: 3 }],
  },
  {
    id: 'IF-06',
    category: 'instruction',
    lang: 'en',
    difficulty: 'easy',
    title: 'Translation only',
    prompt: 'Translate into European Portuguese: "Good morning, how are you?" Output only the translation.',
    reference: 'Bom dia, como está?',
    notes:
      'pt-PT would normally use "como está?" or "como estás?". "Como você está?" sounds Brazilian. Any preamble breaks the instruction.',
    checks: [
      { type: 'includesAny', values: ['bom dia'], label: 'Starts with "Bom dia"' },
      { type: 'maxWords', value: 8 },
      {
        type: 'notRegex',
        pattern: '\\b(translation|tradução)\\b',
        flags: 'i',
        label: 'No preamble such as "Translation:"',
      },
    ],
  },
  {
    id: 'IF-07',
    category: 'instruction',
    lang: 'en',
    difficulty: 'easy',
    title: 'Exactly three bullet points',
    prompt:
      'Give exactly 3 bullet points about the benefits of sleep. Start each line with "- ". No introduction or conclusion.',
    reference: '- Improves memory and learning\n- Supports immune function\n- Helps regulate mood',
    notes: 'Exactly three lines, each a bullet, nothing before or after.',
    checks: [
      { type: 'bulletCount', min: 3, max: 3 },
      { type: 'lineCount', min: 3, max: 3 },
    ],
  },
  {
    id: 'IF-08',
    category: 'instruction',
    lang: 'pt',
    difficulty: 'medium',
    title: 'Exatamente duas frases',
    prompt: 'Responde em exatamente duas frases: porque é que o céu é azul?',
    reference:
      'O céu parece azul porque as moléculas do ar dispersam mais a luz azul do Sol do que a vermelha. Este fenómeno chama-se dispersão de Rayleigh.',
    notes: 'Duas frases exatas. Avaliar também a correção científica e o português europeu ("fenómeno", não "fenômeno").',
    checks: [{ type: 'sentenceCount', min: 2, max: 2 }],
  },
  {
    id: 'IF-09',
    category: 'instruction',
    lang: 'en',
    difficulty: 'easy',
    title: 'Reverse and uppercase',
    prompt: 'Write the word "banana" backwards in capital letters. Reply with nothing else.',
    reference: 'ANANAB',
    notes: 'Only "ANANAB" is correct.',
    checks: [{ type: 'regex', pattern: '^\\s*ANANAB\\s*$', label: 'Reply is exactly "ANANAB"' }],
  },
  {
    id: 'IF-10',
    category: 'instruction',
    lang: 'pt',
    difficulty: 'easy',
    title: 'Só um número',
    prompt: 'Responde apenas com um número: quantos dias tem uma semana?',
    reference: '7',
    notes: 'Apenas "7". Qualquer texto adicional quebra a instrução.',
    checks: [{ type: 'regex', pattern: '^\\s*7\\s*$', label: 'Reply is exactly "7"' }],
  },
  {
    id: 'IF-11',
    category: 'instruction',
    lang: 'en',
    difficulty: 'hard',
    title: 'Lipogram: no letter "e"',
    prompt: 'Describe a cat in at least two sentences without using the letter "e" anywhere in your answer.',
    reference: 'A cat is a small furry animal. It has sharp claws, a long tail and soft paws. It naps a lot and hunts at night.',
    notes: 'A single "e" anywhere (including "the") fails. The description should still make sense.',
    checks: [
      { type: 'notRegex', pattern: '[eéèêëEÉÈÊË]', label: 'No letter "e" anywhere' },
      { type: 'sentenceCount', min: 2 },
    ],
  },
  {
    id: 'IF-12',
    category: 'instruction',
    lang: 'en',
    difficulty: 'medium',
    title: 'Required prefix and word limit',
    prompt: 'Start your answer with "Summary:" and summarise how photosynthesis works in under 40 words.',
    reference:
      'Summary: Plants use sunlight, water and carbon dioxide to make glucose, releasing oxygen as a by-product. Chlorophyll in the chloroplasts captures the light energy that drives the process.',
    notes: 'Must begin with "Summary:" and stay below 40 words, while still being correct.',
    checks: [
      { type: 'startsWith', value: 'Summary:' },
      { type: 'maxWords', value: 39 },
    ],
  },
  {
    id: 'IF-13',
    category: 'instruction',
    lang: 'pt',
    difficulty: 'easy',
    title: 'Lista numerada de meses',
    prompt:
      'Escreve uma lista numerada (1., 2., 3., 4.) com quatro meses do ano, em português europeu, sem mais texto.',
    reference: '1. janeiro\n2. março\n3. julho\n4. outubro',
    notes:
      'Desde o Acordo Ortográfico de 1990, os meses escrevem-se com minúscula em português europeu. Não penalizar maiúscula no início da linha, mas registar nas notas.',
    checks: [
      { type: 'numberedCount', min: 4, max: 4 },
      { type: 'lineCount', min: 4, max: 4 },
    ],
  },
  {
    id: 'IF-14',
    category: 'instruction',
    lang: 'en',
    difficulty: 'medium',
    title: 'Markdown table',
    prompt:
      'Output a Markdown table with two columns, "Country" and "Capital", and exactly three rows of data. Output only the table.',
    reference: '| Country | Capital |\n| --- | --- |\n| Portugal | Lisbon |\n| Spain | Madrid |\n| France | Paris |',
    notes: 'Header, separator and three data rows: five lines in total, nothing else.',
    checks: [
      {
        type: 'regex',
        pattern: '^\\|?\\s*Country\\s*\\|\\s*Capital\\s*\\|?\\s*$',
        flags: 'mi',
        label: 'Header row is "Country | Capital"',
      },
      { type: 'regex', pattern: '^\\|?\\s*:?-{3,}:?\\s*\\|', flags: 'm', label: 'Has a header separator row' },
      { type: 'lineCount', min: 5, max: 5 },
    ],
  },

  // ───────────────────────────────── Reasoning ─────────────────────────────────
  {
    id: 'RE-01',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'medium',
    title: 'Bat and ball',
    prompt:
      'A bat and a ball cost €1.10 in total. The bat costs €1.00 more than the ball. How much does the ball cost?',
    reference:
      'The ball costs €0.05. If the ball costs x, the bat costs x + 1.00, so 2x + 1.00 = 1.10 and x = 0.05. The intuitive answer of €0.10 is wrong: the bat would then cost €1.10 and the total would be €1.20.',
    notes: 'Classic intuition trap. €0.10 is wrong.',
    checks: [
      {
        type: 'includesAny',
        values: ['0.05', '0,05', '5 cents', 'five cents', '5 cêntimos', 'cinco cêntimos'],
        label: 'Gives €0.05',
      },
    ],
  },
  {
    id: 'RE-02',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'medium',
    title: 'Machines and widgets',
    prompt:
      'If 5 machines take 5 minutes to make 5 widgets, how long would 100 machines take to make 100 widgets?',
    reference: '5 minutes. Each machine makes one widget in 5 minutes, so 100 machines make 100 widgets in the same 5 minutes.',
    notes: 'Classic trap: 100 minutes is wrong.',
    checks: [{ type: 'regex', pattern: '\\b5\\s*(min|minutes)\\b', flags: 'i', label: 'Answers 5 minutes' }],
  },
  {
    id: 'RE-03',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'medium',
    title: 'Lily pads',
    prompt:
      'A patch of lily pads doubles in size every day. It takes 48 days to cover the whole lake. How many days does it take to cover half of the lake?',
    reference: '47 days. Because the patch doubles every day, it covers half the lake one day before it covers all of it.',
    notes: 'Classic trap: 24 is wrong.',
    checks: [{ type: 'containsNumber', value: 47 }],
  },
  {
    id: 'RE-04',
    category: 'reasoning',
    lang: 'pt',
    difficulty: 'medium',
    title: 'Problema de idades',
    prompt:
      'O João tem o dobro da idade da Maria. Daqui a 10 anos, a soma das idades dos dois será 50. Quantos anos tem a Maria hoje?',
    reference:
      'A Maria tem 10 anos. Se a Maria tem x anos, o João tem 2x. Daqui a 10 anos: (x + 10) + (2x + 10) = 50, logo 3x = 30 e x = 10. O João tem 20.',
    notes: 'Resposta: 10 anos. Avaliar se o raciocínio está explícito e correto.',
    checks: [{ type: 'containsNumber', value: 10 }],
  },
  {
    id: 'RE-05',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'easy',
    title: 'Mental multiplication',
    prompt: 'What is 17 × 24? Show your working briefly.',
    reference: '17 × 24 = 17 × 20 + 17 × 4 = 340 + 68 = 408.',
    notes: 'Answer: 408, with brief, correct working.',
    checks: [{ type: 'containsNumber', value: 408 }],
  },
  {
    id: 'RE-06',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'easy',
    title: 'Valid syllogism',
    prompt:
      'All bloops are razzies. All razzies are lazzies. Are all bloops definitely lazzies? Answer yes or no, then explain in one sentence.',
    reference: 'Yes. Every bloop is a razzie and every razzie is a lazzie, so every bloop must be a lazzie.',
    notes: 'Answer: yes (the inference is valid).',
    checks: [{ type: 'regex', pattern: '^\\s*\\**yes\\b', flags: 'i', label: 'Starts with "Yes"' }],
  },
  {
    id: 'RE-07',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'medium',
    title: 'Invalid syllogism',
    prompt:
      'Some cats are black. Some black things are cars. Can we conclude that some cats are cars? Answer yes or no, then explain.',
    reference: 'No. The black cats and the black cars could be entirely different black things, so nothing links cats to cars.',
    notes: 'Answer: no (the inference is invalid).',
    checks: [{ type: 'regex', pattern: '^\\s*\\**no\\b', flags: 'i', label: 'Starts with "No"' }],
  },
  {
    id: 'RE-08',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'easy',
    title: 'Time arithmetic',
    prompt: 'A train leaves at 14:45 and the journey takes 2 hours and 35 minutes. At what time does it arrive?',
    reference: 'It arrives at 17:20 (14:45 + 2 h = 16:45, then + 35 min = 17:20).',
    notes: 'Answer: 17:20 (5:20 pm).',
    checks: [
      { type: 'regex', pattern: '\\b17[:h.]20\\b|\\b5:20\\s*p\\.?m', flags: 'i', label: 'Answers 17:20' },
    ],
  },
  {
    id: 'RE-09',
    category: 'reasoning',
    lang: 'pt',
    difficulty: 'medium',
    title: 'Descontos sucessivos',
    prompt:
      'Um artigo custava 100 €. A loja aplicou um desconto de 20% e, depois, um aumento de 20% sobre o novo preço. Quanto custa agora?',
    reference:
      'Custa agora 96 €. Com 20% de desconto passa a 80 €; um aumento de 20% sobre 80 € são 16 €, logo 96 €. Não volta aos 100 € porque o aumento incide sobre um valor mais baixo.',
    notes: 'Armadilha: 100 € está errado. Resposta: 96 €.',
    checks: [{ type: 'containsNumber', value: 96 }],
  },
  {
    id: 'RE-10',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'medium',
    title: 'How many sisters',
    prompt: 'Sally has 3 brothers. Each of her brothers has 2 sisters. How many sisters does Sally have?',
    reference: "Sally has 1 sister. Each brother's 2 sisters are Sally herself and one other girl.",
    notes: 'Answer: 1. Answering 2 or 6 is wrong.',
    checks: [{ type: 'includesAny', values: ['1 sister', 'one sister'], label: 'Answers one sister' }],
  },
  {
    id: 'RE-11',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'medium',
    title: 'Number sequence',
    prompt: 'What is the next number in the sequence 2, 6, 12, 20, 30, ...?',
    reference:
      '42. The differences are 4, 6, 8 and 10, so the next difference is 12. Equivalently, the terms are n × (n + 1), and 6 × 7 = 42.',
    notes: 'Answer: 42, ideally with the pattern explained.',
    checks: [{ type: 'containsNumber', value: 42 }],
  },
  {
    id: 'RE-12',
    category: 'reasoning',
    lang: 'pt',
    difficulty: 'medium',
    title: 'Dia da semana daqui a 100 dias',
    prompt: 'Se hoje é quarta-feira, que dia da semana será daqui a 100 dias?',
    reference: 'Sexta-feira. 100 = 14 × 7 + 2, portanto são dois dias depois de quarta-feira.',
    notes: 'Resposta: sexta-feira.',
    checks: [{ type: 'includesAny', values: ['sexta'], label: 'Answers sexta-feira (Friday)' }],
  },
  {
    id: 'RE-13',
    category: 'reasoning',
    lang: 'pt',
    difficulty: 'easy',
    title: 'Combinações de roupa',
    prompt:
      'Tenho 3 camisolas e 4 pares de calças. Quantas combinações diferentes de uma camisola com um par de calças posso fazer?',
    reference: 'Pode fazer 12 combinações (3 × 4 = 12).',
    notes: 'Resposta: 12. "Camisola" é o termo de português europeu.',
    checks: [{ type: 'containsNumber', value: 12 }],
  },
  {
    id: 'RE-14',
    category: 'reasoning',
    lang: 'en',
    difficulty: 'medium',
    title: 'Rectangle area',
    prompt:
      'A rectangle has a perimeter of 30 cm and its length is twice its width. What is its area?',
    reference:
      '50 cm². If the width is w, the length is 2w, so 2(2w + w) = 30, giving w = 5 cm and a length of 10 cm. The area is 10 × 5 = 50 cm².',
    notes: 'Answer: 50 cm², with units.',
    checks: [{ type: 'containsNumber', value: 50 }],
  },
];

const BY_ID = new Map(CASES.map((c) => [c.id, c]));

export function getCase(id) {
  return BY_ID.get(id) ?? null;
}

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

export function casesInCategory(categoryId) {
  return CASES.filter((c) => c.category === categoryId);
}
