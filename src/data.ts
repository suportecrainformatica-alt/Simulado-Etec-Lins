import { Questao } from "./types";

export const bancoDeQuestoesPadrao: Questao[] = [
  {
    numero: 1,
    enunciado: "Segundo os dados científicos e históricos do Vestibulinho ETEC, a domesticação de animais e o desenvolvimento da agricultura foram fundamentais para a emancipação e evolução da humanidade. Esse processo, iniciado no período Neolítico, permitiu que as populações humanas se tornassem sedentárias. Qual das alternativas a seguir expressa CORRETAMENTE um impacto direto desse período?",
    alternativas: {
      "A": "Provocou a redução imediata da expectativa de vida por falta de variedade nutricional.",
      "B": "Causou o abandono completo de qualquer manifestação artística ou cultural entre os clãs.",
      "C": "Permitiu o surgimento de excedentes agrícolas, dando início a trocas comerciais, divisão do trabalho e crescimento urbano.",
      "D": "Ocorreu tardiamente, logo após o início do período medieval na Europa ocidental.",
      "E": "Impossibilitou temporariamente a adaptação genética ao consumo de derivados lácteos na fase adulta."
    },
    respostaCorreta: "C",
    materia: "História",
    explicacao: "A transição para o Neolítico (revolução agrícola) levou ao sedentarismo, gerando excedente de alimentos. Esse excedente propiciou o surgimento do comércio, a especialização do trabalho e o avanço das primeiras civilizações e cidades."
  },
  {
    numero: 2,
    enunciado: "Considerando que no Brasil existem cerca de 6,5 milhões de pessoas com deficiência visual severa e que há aproximadamente 200 cães-guia em atividade, qual é a alternativa que melhor representa a razão entre o número de cães-guia em atividade e o número dessas pessoas no país?",
    alternativas: {
      "A": "1 cão-guia para cada 29.500 pessoas com deficiência visual.",
      "B": "1 cão-guia para cada 32.500 pessoas com deficiência visual.",
      "C": "1 cão-guia para cada 12.000 pessoas com deficiência visual.",
      "D": "1 cão-guia para cada 150.000 pessoas com deficiência visual.",
      "E": "1 cão-guia para cada 45.000 pessoas com deficiência visual."
    },
    respostaCorreta: "B",
    materia: "Matemática",
    explicacao: "Para encontrar a razão, calculamos: 200 cães-guia divididos por 6.500.000 pessoas. Simplificando: 200 / 6.500.000 = 2 / 65.000 = 1 / 32.500. Logo, a relação é de exatamente 1 cão-guia para cada 32.500 pessoas."
  },
  {
    numero: 3,
    enunciado: "A fotossíntese é um processo físico-químico através do qual plantas, algas e certas bactérias convertem matéria inorgânica em matéria orgânica com uso de energia luminosa. Sobre a fotossíntese, assinale a afirmativa correta quanto aos reagentes e produtos envolvidos:",
    alternativas: {
      "A": "O processo absorve oxigênio gasoso do ar e libera dióxido de carbono como produto nobre.",
      "B": "Tem como reagentes o gás carbônico (CO2) e a água (H2O), produzindo glicose (C6H12O6) e liberando oxigênio (O2) para a atmosfera.",
      "C": "Ocorre predominantemente nas mitocôndrias das células foliares, dependendo de glicose prévia.",
      "D": "Necessita exclusivamente de nitrogênio líquido e magnésio aquoso para que a quebra de sacarose ocorra.",
      "E": "É um processo meramente catabólico que dispensa de forma integral a captação de fótons solares."
    },
    respostaCorreta: "B",
    materia: "Ciências da Natureza",
    explicacao: "Na presença de luz solar e clorofila, a planta reage gás carbônico (CO2) e água (H2O) para converter em matéria orgânica (glicose) e liberar oxigênio (O2) como subproduto essencial para a respiração de seres aeróbios."
  },
  {
    numero: 4,
    enunciado: "Em uma receita de bolo para o lanche dos alunos de uma ETEC, são recomendados 400 gramas de farinha de trigo para cada 150 mililitros de leite integral. Mantida a proporção exata para manter a consistência, se forem utilizados 2,4 quilogramas (2400g) de farinha de trigo, qual volume de leite em mililitros será estritamente necessário?",
    alternativas: {
      "A": "600 mL",
      "B": "750 mL",
      "C": "800 mL",
      "D": "900 mL",
      "E": "1.200 mL"
    },
    respostaCorreta: "D",
    materia: "Matemática",
    explicacao: "Podemos montar uma regra de três simples: 400g está para 150mL, assim como 2400g está para X. Temos: X = (2400 * 150) / 400. Simplificando (2400 / 400) = 6. Então, X = 6 * 150 = 900 mL."
  },
  {
    numero: 5,
    enunciado: "Leia com atenção os versos de Fernando Pessoa:\n\"O poeta é um fingidor.\nFinge tão completamente\nQue chega a fingir que é dor\nA dor que deveras sente.\"\n\nA figura de linguagem que expressa uma contradição de termos sob uma aparente harmonia lógica, presente no núcleo poético de fingir sentir o que já se sente de verdade, representa um(a):",
    alternativas: {
      "A": "Pleonasmo vicioso, pelo excesso de repetição desprovido de estilo.",
      "B": "Paradoxo, no qual duas ideias contraditórias coexistem de forma a desafiar o senso comum.",
      "C": "Eufemismo, cujo objetivo principal é suavizar uma informação dolorosa.",
      "D": "Hipérbole, expandindo a realidade por meio de um exagero explícito ou dimensional.",
      "E": "Onomatopeia, mimetizando sons produzidos por fenômenos ou objetos físicos do ambiente."
    },
    respostaCorreta: "B",
    materia: "Português",
    explicacao: "O paradoxo reside no fato de o poeta simular uma dor que de fato ele sente, criando uma proposição contrária que une conceitos mutuamente excludentes, mas que carregam profundo sentido lírico."
  },
  {
    numero: 6,
    enunciado: "O efeito estufa é um fenômeno natural essencial para a manutenção da vida na Terra, pois conserva o planeta aquecido. No entanto, a ação antrópica desregulada tem ampliado esse efeito, gerando o aquecimento global. Qual dos seguintes gases listados é considerado o principal responsável direto por esse aumento antrópico exacerbado no planeta?",
    alternativas: {
      "A": "Dióxido de Carbono (CO2), derivado majoritariamente da queima de combustíveis fósseis e desmatamentos.",
      "B": "Argônio (Ar), que se eleva de áreas industriais mineradoras ativas.",
      "C": "Hélio (He), que escapa de balões atmosféricos e fendas tectônicas.",
      "D": "Oxigênio Biatômico (O2), emitido continuamente pela cobertura florestal intacta.",
      "E": "Nitrogênio Gasoso (N2), que aumenta devido ao excesso de pecuária extensiva de corte."
    },
    respostaCorreta: "A",
    materia: "Ciências da Natureza",
    explicacao: "Embora o metano (CH4) e o vapor de água também tenham forte papel, o dióxido de carbono (CO2) é o principal gás do efeito estufa emitido por fontes antrópicas (industriais, transportes, e queimas produtivas), sendo o vetor-chave do aquecimento global acelerado."
  },
  {
    numero: 7,
    enunciado: "Durante o período da Revolução Industrial, ocorrido a partir do século XVIII na Inglaterra, observou-se uma migração em massa das populações rurais em direção às cidades. Esse movimento migratório populacional interno e de reestruturação demográfica é conhecido pela Geografia como:",
    alternativas: {
      "A": "Transumância sazonal laboral.",
      "B": "Êxodo rural.",
      "C": "Imigração internacional qualificada.",
      "D": "Nomadismo de subsistência.",
      "E": "Movimento pendular diário."
    },
    respostaCorreta: "B",
    materia: "Geografia",
    explicacao: "O deslocamento massivo e duradouro das populações das áreas do campo para os centros urbanos em busca de postos de trabalho e novas perspectivas é classificado teoricamente como êxodo rural."
  },
  {
    numero: 8,
    enunciado: "Considere a escala cartográfica de um mapa rodoviário oficial do estado de São Paulo no qual 1 centímetro desenhado representa exatamente 50 quilômetros medidos em terreno real. Se a distância gráfica entre a ETEC local e uma unidade vizinha de treinamento é medida com régua como sendo 4,5 cm, qual é a distância útil real?",
    alternativas: {
      "A": "112,5 quilômetros.",
      "B": "225,0 quilômetros.",
      "C": "450,0 quilômetros.",
      "D": "300,0 quilômetros.",
      "E": "180,0 quilômetros."
    },
    respostaCorreta: "B",
    materia: "Geografia",
    explicacao: "Se 1 cm representa 50 km, basta multiplicar o valor medido em centímetros pelo fator de escala em quilômetros: 4,5 cm * 50 km/cm = 225 km."
  }
];

export const presetProvas = {
  exemploFacil: `[
  {
    "numero": 1,
    "enunciado": "Qual é a capital do estado de São Paulo?",
    "alternativas": {
      "A": "Campinas",
      "B": "Santos",
      "C": "São Paulo",
      "D": "São Bernardo do Campo",
      "E": "Ribeirão Preto"
    },
    "respostaCorreta": "C",
    "materia": "Geografia",
    "explicacao": "A capital administrativa e política do estado de São Paulo é o município homônimo de São Paulo."
  },
  {
    "numero": 2,
    "enunciado": "Se x + 5 = 12, qual é o valor numérico de x?",
    "alternativas": {
      "A": "5",
      "B": "7",
      "C": "8",
      "D": "12",
      "E": "17"
    },
    "respostaCorreta": "B",
    "materia": "Matemática",
    "explicacao": "Subtraindo 5 de ambos os lados da igualdade (x = 12 - 5), obtemos o resultado x = 7."
  }
]`,

  miniCiencias: `[
  {
    "numero": 1,
    "enunciado": "A vacinação em massa é uma das medidas profiláticas mais eficientes para o controle de patologias infecciosas. Como a vacina atua preventivamente em nosso organismo?",
    "alternativas": {
      "A": "Destruindo instantaneamente os anticorpos excedentes que agravam as inflamações.",
      "B": "Fornecendo anticorpos prontos produzidos em laboratório, conferindo imunização passiva imediata.",
      "C": "Estimulando o sistema imunológico a produzir antígenos específicos e células de memória sem causar a doença ativa.",
      "D": "Modificando permanentemente o código genético do hospedeiro para repelir qualquer invasor.",
      "E": "Acidificando o sangue de modo a impedir o desenvolvimento normal de seres celulares."
    },
    "respostaCorreta": "C",
    "materia": "Ciências da Natureza",
    "explicacao": "As vacinas apresentam antígenos enfraquecidos ou partes deles ao corpo, estimulando de forma segura a síntese autônoma de anticorpos protetores e gerando células de memória imunológica para combate rápido em caso de futuras infecções."
  },
  {
    "numero": 2,
    "enunciado": "Qual dos seguintes recursos energéticos listados abaixo é classificado como limpo e de fonte estritamente renovável?",
    "alternativas": {
      "A": "Carvão mineral de jazida.",
      "B": "Energia eólica, captada através dos aerogeradores.",
      "C": "Petróleo nafta bruto refinado.",
      "D": "Energia nuclear por fissão de urânio enriquecido.",
      "E": "Gás de xisto extraído por fraturamento hidráulico."
    },
    "respostaCorreta": "B",
    "materia": "Geografia",
    "explicacao": "A energia eólica provém do movimento mecânico contínuo das massas de ar (ventos), sendo inesgotável, limpa e renovável, em contraponto direta aos combustíveis fósseis tradicionais."
  }
]`
};
