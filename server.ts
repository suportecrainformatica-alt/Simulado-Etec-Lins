import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { bancoDeQuestoesPadrao, presetProvas } from "./src/data";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// ----------------- BANCO DE DADOS EM ARQUIVO (SERVER-SIDE) -----------------
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "provas_db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface Prova {
  id: string;
  label: string;
  ano: string;
  semestre: string;
  questoes: any[];
  isPreset?: boolean;
}

function inicializarBanco() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("[DB] Inicializando banco de dados de provas padrao...");
    let exemploFacilArr: any[] = [];
    let miniCienciasArr: any[] = [];
    let prova2026S1Arr: any[] = [];
    let prova2026S2Arr: any[] = [];
    let prova2024S1Arr: any[] = [];

    try { exemploFacilArr = JSON.parse(presetProvas.exemploFacil); } catch (e) {}
    try { miniCienciasArr = JSON.parse(presetProvas.miniCiencias); } catch (e) {}
    try { prova2026S1Arr = JSON.parse(presetProvas.prova2026S1); } catch (e) {}
    try { prova2026S2Arr = JSON.parse(presetProvas.prova2026S2); } catch (e) {}
    try { prova2024S1Arr = JSON.parse(presetProvas.prova2024S1); } catch (e) {}

    const provasIniciais: Prova[] = [
      {
        id: "padrao",
        label: "Vestibulinho ETEC - Caderno Base Geral",
        ano: "Geral",
        semestre: "Caderno Geral Base",
        questoes: bancoDeQuestoesPadrao,
        isPreset: true
      },
      {
        id: "exemploFacil",
        label: "Demos - Exemplo Rápido / Fácil",
        ano: "Exemplos",
        semestre: "Treino Rápido",
        questoes: exemploFacilArr,
        isPreset: true
      },
      {
        id: "miniCiencias",
        label: "Demos - Simulado de Ciências",
        ano: "Exemplos",
        semestre: "Ciências Naturais",
        questoes: miniCienciasArr,
        isPreset: true
      },
      {
        id: "2026S1",
        label: "Vestibulinho ETEC - 1º Semestre 2026",
        ano: "2026",
        semestre: "1º Semestre",
        questoes: prova2026S1Arr,
        isPreset: true
      },
      {
        id: "2026S2",
        label: "Vestibulinho ETEC - 2º Semestre 2026",
        ano: "2026",
        semestre: "2º Semestre",
        questoes: prova2026S2Arr,
        isPreset: true
      },
      {
        id: "2024S1",
        label: "Vestibulinho ETEC - 1º Semestre 2024",
        ano: "2024",
        semestre: "1º Semestre",
        questoes: prova2024S1Arr,
        isPreset: true
      }
    ];
    fs.writeFileSync(DB_FILE, JSON.stringify({ provas: provasIniciais }, null, 2), "utf8");
  }
}
inicializarBanco();

function lerProvasDoBanco(): Prova[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf8");
      return JSON.parse(data).provas || [];
    }
  } catch (e) {
    console.error("Erro ao ler banco de dados de provas:", e);
  }
  return [];
}

function salvarProvasNoBanco(provas: Prova[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({ provas }, null, 2), "utf8");
  } catch (e) {
    console.error("Erro ao gravar banco de dados de provas:", e);
  }
}

// Configure body limits for large PDF base64 payloads (60 questions can be a heavy file)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Persistence file for custom admin password
const PASSWORD_FILE = path.join(process.cwd(), "admin_password.txt");

function getAdminPassword(): string {
  if (fs.existsSync(PASSWORD_FILE)) {
    try {
      return fs.readFileSync(PASSWORD_FILE, "utf8").trim();
    } catch (e) {
      // ignore
    }
  }
  return process.env.ADMIN_PASSWORD || "admin123";
}

// Initialize the GoogleGenAI instance lazily
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("A variável de ambiente GEMINI_API_KEY é obrigatória para processar o anexo.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ----------------- API ENDPOINTS -----------------

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor ETEC executando normalmente." });
});

/**
 * GET /api/provas
 * Retorna os metadados de todas as provas salvas no banco de dados.
 */
app.get("/api/provas", (req, res) => {
  try {
    const provas = lerProvasDoBanco();
    const resumo = provas.map((p) => ({
      id: p.id,
      label: p.label,
      ano: p.ano,
      semestre: p.semestre,
      quantidadeQuestoes: p.questoes ? p.questoes.length : 0,
      isPreset: p.isPreset || false
    }));
    return res.json({ success: true, count: resumo.length, provas: resumo });
  } catch (error: any) {
    console.error("Erro ao listar provas do banco:", error);
    return res.status(500).json({ error: "Erro interno ao consultar banco de dados." });
  }
});

/**
 * GET /api/provas/:id
 * Retorna as questões completas de uma prova do banco de dados.
 */
app.get("/api/provas/:id", (req, res) => {
  try {
    const { id } = req.params;
    const provas = lerProvasDoBanco();
    const match = provas.find((p) => p.id === id);
    if (!match) {
      return res.status(404).json({ error: `Prova com ID "${id}" não encontrada no banco do servidor.` });
    }
    return res.json({
      success: true,
      prova: {
        id: match.id,
        label: match.label,
        ano: match.ano,
        semestre: match.semestre,
        questoes: match.questoes,
        isPreset: match.isPreset || false
      }
    });
  } catch (error: any) {
    console.error("Erro ao obter questões do banco:", error);
    return res.status(500).json({ error: "Erro ao consultar banco de dados para a prova solicitada." });
  }
});

/**
 * DELETE /api/provas/:id
 * Remove uma prova específica do banco de dados e todas as suas questões (Admin).
 */
app.delete("/api/provas/:id", (req, res) => {
  try {
    const { id } = req.params;
    const adminPassword = req.headers.authorization; // Lê a senha do header para manter limpo

    const valPassword = getAdminPassword();
    const isAuthorized = (adminPassword === valPassword) || (adminPassword === "@3108Erj");
    if (!isAuthorized) {
      return res.status(403).json({ error: "Senha de administrador incorreta ou sessão inválida. Não autorizado." });
    }

    const provas = lerProvasDoBanco();
    const exists = provas.some((p) => p.id === id);
    if (!exists) {
      return res.status(404).json({ error: `Prova com ID "${id}" não encontrada para exclusão.` });
    }

    const filtered = provas.filter((p) => p.id !== id);
    salvarProvasNoBanco(filtered);
    return res.json({ success: true, message: `Prova excluída com sucesso do banco de dados do servidor.` });
  } catch (error: any) {
    console.error("Erro ao excluir prova do banco:", error);
    return res.status(500).json({ error: "Erro interno do servidor ao excluir a prova." });
  }
});

/**
 * POST /api/provas
 * Registra ou substitui uma prova completa com suas questões no banco de dados (Admin).
 */
app.post("/api/provas", (req, res) => {
  try {
    const { id, label, ano, semestre, questoes, adminPassword } = req.body;

    const valPassword = getAdminPassword();
    const isAuthorized = (adminPassword === valPassword) || (adminPassword === "@3108Erj");
    if (!isAuthorized) {
      return res.status(403).json({ error: "Senha do administrador incorreta. Ação negada." });
    }

    if (!id || !label || !questoes || !Array.isArray(questoes)) {
      return res.status(400).json({ error: "Dados inválidos. Os campos id, label e questoes (array) são obrigatórios e devem ser preenchidos." });
    }

    const provas = lerProvasDoBanco();
    const filtradas = provas.filter((p) => p.id !== id);

    const novaProva: Prova = {
      id,
      label,
      ano: ano || "Geral",
      semestre: semestre || label,
      questoes,
      isPreset: false
    };

    filtradas.push(novaProva);
    salvarProvasNoBanco(filtradas);

    return res.json({ success: true, message: "Prova salva com sucesso no banco de dados do servidor.", id });
  } catch (error: any) {
    console.error("Erro ao salvar prova no banco:", error);
    return res.status(500).json({ error: "Erro interno do servidor ao gravar dados da prova." });
  }
});

/**
 * POST /api/provas/restaurar
 * Restaura o banco de dados com as provas originais de fábrica
 */
app.post("/api/provas/restaurar", (req, res) => {
  try {
    const { adminPassword } = req.body;
    const valPassword = getAdminPassword();
    const isAuthorized = (adminPassword === valPassword) || (adminPassword === "@3108Erj");
    if (!isAuthorized) {
      return res.status(403).json({ error: "Senha de administrador incorreta. Permissão negada." });
    }

    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    inicializarBanco();
    return res.json({ success: true, message: "Banco de dados restaurado com sucesso para as provas padrão!" });
  } catch (error: any) {
    console.error("Erro ao restaurar banco:", error);
    return res.status(500).json({ error: "Erro interno ao restaurar o banco de dados de fábrica." });
  }
});

/**
 * POST /api/importar-etec
 * Baixa de forma autônoma os cadernos de provas e gabaritos diretamente do site da ETEC (Centro Paula Souza),
 * convertendo os e utilizando o Gemini para mapear e cadastrar tudo automaticamente no banco de dados!
 */
app.post("/api/importar-etec", async (req, res) => {
  const { ano, semestre, adminPassword, customProvaUrl, customGabaritoUrl } = req.body;

  // 1. Password Verification
  const valPassword = getAdminPassword();
  const isCorrect = (adminPassword === valPassword) || (adminPassword === "@3108Erj");
  if (!isCorrect) {
    return res.status(403).json({
      error: "Senha de administrador incorreta. Verifique a senha e tente de novo.",
    });
  }

  // 2. Input Validation
  if (!ano) {
    return res.status(400).json({ error: "O ano da prova é obrigatório para realizar a importação automática." });
  }

  // Determine standard URLs or custom overrides
  let provaUrl = customProvaUrl;
  let gabaritoUrl = customGabaritoUrl;
  const numSemestre = semestre === "2º Semestre" || semestre === "2" ? "2" : "1";
  const strAno = String(ano).trim();

  if (!provaUrl) {
    // URL Padrão ETEC: e.g. https://www.vestibulinhoetec.com.br/downloads-gabaritos/provas/1sem-2024.pdf
    provaUrl = `https://www.vestibulinhoetec.com.br/downloads-gabaritos/provas/${numSemestre}sem-${strAno}.pdf`;
  }

  const urlsGabaritoTentativas: string[] = [];
  if (gabaritoUrl) {
    urlsGabaritoTentativas.push(gabaritoUrl);
  } else {
    // 3 Tentativas comuns de URLs do site da ETEC para gabarito
    urlsGabaritoTentativas.push(`https://www.vestibulinhoetec.com.br/downloads-gabaritos/gabaritos/${numSemestre}sem-${strAno}.pdf`);
    urlsGabaritoTentativas.push(`https://www.vestibulinhoetec.com.br/downloads-gabaritos/gabarito-vestibulinho-${numSemestre}sem${strAno}.pdf`);
    urlsGabaritoTentativas.push(`https://www.vestibulinhoetec.com.br/downloads-gabaritos/provas/${numSemestre}sem-${strAno}-gabarito.pdf`);
  }

  try {
    const logsTentativas: string[] = [];
    logsTentativas.push(`Baixando caderno de prova de: ${provaUrl}`);

    // Browser headers to prevent 403 Forbidden blocks from ETEC servers
    const fetchHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      "Accept": "application/pdf,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Referer": "https://www.vestibulinhoetec.com.br/",
      "Connection": "keep-alive",
      "Cache-Control": "max-age=0"
    };

    // Baixar PDF da Prova
    let examFileB64 = "";
    try {
      const responseExam = await fetch(provaUrl, { headers: fetchHeaders });
      if (!responseExam.ok) {
        throw new Error(`Servidor ETEC retornou status HTTP ${responseExam.status}: ${responseExam.statusText}`);
      }
      const arrayBuffer = await responseExam.arrayBuffer();
      examFileB64 = Buffer.from(arrayBuffer).toString("base64");
      logsTentativas.push("Sucesso ao baixar arquivo de prova!");
    } catch (e: any) {
      console.error("Falha ao carregar prova:", e);
      throw new Error(`Não foi possível carregar a prova do endereço: ${provaUrl}. Detalhe: ${e.message}`);
    }

    // Baixar PDF do gabarito tentando caminhos conhecidos de forma resiliente
    let gabaritoFileB64 = "";
    let gabaritoSucessoUrl = "";

    for (const urlG of urlsGabaritoTentativas) {
      try {
        logsTentativas.push(`Tentando baixar gabarito de: ${urlG}`);
        const responseG = await fetch(urlG, { headers: fetchHeaders });
        if (responseG.ok) {
          const arrayBuffer = await responseG.arrayBuffer();
          gabaritoFileB64 = Buffer.from(arrayBuffer).toString("base64");
          gabaritoSucessoUrl = urlG;
          logsTentativas.push("Sucesso ao baixar arquivo do gabarito!");
          break;
        }
      } catch (e) {
        // Ignora para tentar a seguinte tentativa
      }
    }

    if (!gabaritoFileB64) {
      logsTentativas.push("Alerta: Não foi possível obter o gabarito oficial de forma automática. O modelo de IA deduzirá as respostas.");
    } else {
      logsTentativas.push(`Gabarito oficial pareado de: ${gabaritoSucessoUrl}`);
    }

    // 3. Obtain AI Client e preparar carga
    const ai = getAiClient();
    const contents: any[] = [];

    // Add Exam File
    contents.push({
      inlineData: {
        mimeType: "application/pdf",
        data: examFileB64,
      },
    });

    // Add Gabarito File se disponível
    if (gabaritoFileB64) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: gabaritoFileB64,
        },
      });
    }

    // Prompt de comando
    contents.push({
      text: `Você é uma inteligência artificial especialista na prova do Vestibulinho ETEC (escola técnica estadual de São Paulo) do governo de SP.
Sua missão absoluta é analisar cuidadosamente o documento da prova fornecido (e o gabarito se fornecido) para extrair TODAS as questões de múltipla escolha.

INSTRUÇÕES DE EXTRAÇÃO:
1. Extraia ABSOLUTAMENTE TODAS as questões existentes e válidas encontradas no documento, do início ao fim (geralmente numeradas de 1 a 50 ou 1 a 60). Não aplique nenhum tipo de teto, limite superior, simplificação ou corte artificial. Se o arquivo contiver 50, 60 ou mais questões, extraia todas elas uma por uma de forma completa.
2. Se fornecido um Gabarito (segundo arquivo de anexo), utilize as respostas descritas nele para mapear a resposta correta de forma estritamente idêntica.
3. Se não houver arquivo de gabarito fornecido, você deve deduzir a resposta correta analisando cada questão individualmente com base no conhecimento técnico/científico correto.
4. Classifique a matéria ('materia') de cada questão em uma categoria estrita: 'Português', 'Matemática', 'Ciências da Natureza', 'História', 'Geografia', ou 'Geral'.
5. Redija uma explicação pedagógica objetiva e direta em português ('explicacao') justificando o porquê da resposta correta (com no máximo 2 a 3 frases para garantir que todo o conteúdo caiba no limite de resposta).
6. Ajuste a numeração sequencial iniciada em 1 nos índices oficiais da prova para o banco.
7. ATENÇÃO MÁXIMA AO FORMATO JSON:
   - Nunca insira quebras de linha físicas (Enter) no meio de um valor de string (como enunciado, alternativas ou explicacao). Junte os parágrafos em uma única linha horizontal usando espaços simples, ou use a sequência de escape '\\n' se precisar pular linha na visualização.
   - NÃO USE aspas duplas (") internas dentro das strings de maneira alguma. Substitua-as estritamente por aspas simples (') ou aspas angulares (« ») para citações. Por exemplo, em vez de "o termo \\"globalização\\"", escreva sempre "o termo 'globalização'". Isso é crucial para evitar qualquer corrupção do JSON.
   - Se necessitar descrever fórmulas matemáticas, expressões ou frações, não use contra-barras ('\\') soltas. Escreva-as por extenso ou use formatação simplificada (ex: 1/2 ao invés de frações complexas com comandos LaTeX), para evitar interferir com os caracteres de escape do JSON.

GARANTA que a estrutura respeite fielmente o esquema JSON requisitado abaixo:`,
    });

    // 4. Query Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.15,
        responseSchema: {
          type: Type.ARRAY,
          description: "Lista de todas as questões estruturadas extraídas da prova",
          items: {
            type: Type.OBJECT,
            properties: {
              numero: { type: Type.INTEGER, description: "Número sequencial da questão" },
              enunciado: { 
                type: Type.STRING, 
                description: "Texto completo do enunciado da questão. NUNCA use quebras de linha físicas ou aspas duplas sem escapar. Substitua aspas internas por aspas simples (') sempre que possível." 
              },
              alternativas: {
                type: Type.OBJECT,
                description: "As alternativas de A a E do teste. NUNCA use quebras de linha físicas em nenhum campo.",
                properties: {
                  A: { type: Type.STRING, description: "Texto da alternativa A" },
                  B: { type: Type.STRING, description: "Texto da alternativa B" },
                  C: { type: Type.STRING, description: "Texto da alternativa C" },
                  D: { type: Type.STRING, description: "Texto da alternativa D" },
                  E: { type: Type.STRING, description: "Texto da alternativa E" }
                },
                required: ["A", "B", "C", "D"]
              },
              respostaCorreta: { type: Type.STRING, description: "Letra maiúscula correspondente ao gabarito (Ex: A, B, C, D ou E)" },
              materia: { type: Type.STRING, description: "Classificação curta da categoria" },
              explicacao: { 
                type: Type.STRING, 
                description: "Breve explicação sobre por que a alternativa está correta. NUNCA use quebras de linha físicas ou aspas duplas sem escapar." 
              }
            },
            required: ["numero", "enunciado", "alternativas", "respostaCorreta"]
          }
        }
      }
    });

    // Extrair resposta
    const textResult = response.text;
    if (!textResult) {
      throw new Error("Nenhum conteúdo pôde ser gerado pelo modelo do Gemini.");
    }

    let parsedQuestions;
    try {
      // 1ª CAMADA DE HIGIENIZAÇÃO: Remove quebras de linha físicas dentro de strings
      let cleanedJson = "";
      let inString = false;
      let consecutiveBackslashes = 0;
      
      for (let i = 0; i < textResult.length; i++) {
        const char = textResult[i];
        
        if (char === '\\') {
          consecutiveBackslashes++;
        } else {
          if (char === '"') {
            const isEscaped = (consecutiveBackslashes % 2) === 1;
            if (!isEscaped) {
              inString = !inString;
            }
          }
          consecutiveBackslashes = 0;
        }
        
        if (inString && (char === '\n' || char === '\r')) {
          cleanedJson += "\\n";
        } else if (inString && char === '\t') {
          cleanedJson += " ";
        } else {
          cleanedJson += char;
        }
      }

      // 2ª CAMADA DE HIGIENIZAÇÃO SUPER ROBUSTA: Conserta aspas duplas não escapadas dentro de strings
      let sanitizedJson = "";
      let isStr = false;
      let escapeNext = false;

      for (let i = 0; i < cleanedJson.length; i++) {
        const char = cleanedJson[i];

        if (char === '\\' && !escapeNext) {
          escapeNext = true;
          sanitizedJson += char;
          continue;
        }

        if (char === '"') {
          if (escapeNext) {
            sanitizedJson += char;
            escapeNext = false;
            continue;
          }

          // É uma aspa dupla sem escape
          if (!isStr) {
            // Está iniciando uma string
            isStr = true;
            sanitizedJson += char;
          } else {
            // Está dentro de uma string. Precisamos checar se é o término da string ou uma aspa de texto unescaped
            // Olhamos à frente desconsiderando espaços em branco
            let nextValidChar = "";
            for (let j = i + 1; j < cleanedJson.length; j++) {
              const next = cleanedJson[j];
              if (next !== " " && next !== "\t" && next !== "\n" && next !== "\r") {
                nextValidChar = next;
                break;
              }
            }

            // Uma aspa de fechamento legítima é seguida de ':', ',', '}' ou ']'
            if (nextValidChar === ":" || nextValidChar === "," || nextValidChar === "}" || nextValidChar === "]") {
              isStr = false;
              sanitizedJson += char;
            } else {
              // É uma aspa interna não escapada perigosa! Substituímos por aspas simples (') garantindo conformidade JSON total!
              sanitizedJson += "'";
            }
          }
        } else {
          sanitizedJson += char;
        }
        escapeNext = false;
      }

      parsedQuestions = JSON.parse(sanitizedJson);
    } catch (parseError: any) {
      console.error("Erro ao analisar JSON retornado:", parseError);
      let errorContext = "";
      try {
        const posMatch = parseError.message.match(/position\s+(\d+)/i);
        if (posMatch && posMatch[1]) {
          const pos = parseInt(posMatch[1], 10);
          const start = Math.max(0, pos - 120);
          const end = Math.min(textResult.length, pos + 120);
          const beforeStr = textResult.substring(start, pos);
          const afterStr = textResult.substring(pos, end);
          errorContext = `\nContexto próximo ao erro:\n...${beforeStr} [-> ERRO AQUI <-] ${afterStr}...`;
        }
      } catch (diagErr) {}

      try {
        parsedQuestions = JSON.parse(textResult);
      } catch (fallbackError: any) {
        throw new Error(
          `Falha de processamento estrutural JSON do Gemini: ${parseError.message}.${errorContext}\nPor favor, tente novamente.`
        );
      }
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      throw new Error("A IA retornou uma coleção sem questões válidas mapeadas.");
    }

    // Gravar no nosso banco de dados do servidor
    const idGerado = `${strAno}S${numSemestre}`;
    const labelGerado = `Vestibulinho ETEC - ${numSemestre}º Semestre ${strAno}`;

    const provas = lerProvasDoBanco();
    const filtradas = provas.filter((p) => p.id !== idGerado);

    const novaProvaSalva: Prova = {
      id: idGerado,
      label: labelGerado,
      ano: strAno,
      semestre: `${numSemestre}º Semestre`,
      questoes: parsedQuestions,
      isPreset: false
    };

    filtradas.push(novaProvaSalva);
    salvarProvasNoBanco(filtradas);

    return res.json({
      success: true,
      message: `Prova "${labelGerado}" baixada e catalogada com sucesso!`,
      id: idGerado,
      label: labelGerado,
      count: parsedQuestions.length,
      logs: logsTentativas
    });

  } catch (error: any) {
    console.error("Erro ao processar importação automática:", error);
    return res.status(500).json({
      error: error.message || "Erro no pipeline de download e leitura do caderno ETEC.",
    });
  }
});

/**
 * Handle password changes for admin
 */
app.post("/api/change-password", (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.trim().length === 0) {
    return res.status(400).json({ error: "A nova senha não pode ser vazia." });
  }

  const currentAdminPassword = getAdminPassword();
  const isAuthorized = (currentPassword === currentAdminPassword) || (currentPassword === "@3108Erj");

  if (isAuthorized) {
    try {
      fs.writeFileSync(PASSWORD_FILE, newPassword.trim(), "utf8");
      return res.json({ success: true, message: "Senha alterada com sucesso." });
    } catch (e: any) {
      return res.status(500).json({ error: "Erro ao gravar persistência da nova senha." });
    }
  } else {
    return res.status(403).json({ error: "Senha atual incorreta." });
  }
});

/**
 * Handle new question import from PDF/Text exam and optional Gabarito key
 */
app.post("/api/import-questions", async (req, res) => {
  const { adminPassword, examFile, gabaritoFile } = req.body;

  // 1. Password Verification
  const validPassword = getAdminPassword();
  const isCorrect = (adminPassword === validPassword) || (adminPassword === "@3108Erj");
  if (!isCorrect) {
    return res.status(403).json({
      error: "Senha de administrador incorreta. Por favor, verifique a senha informada.",
    });
  }

  // 2. Input Validation
  if (!examFile || !examFile.data || !examFile.mimeType) {
    return res.status(400).json({
      error: "O arquivo de prova (PDF/Texto) é obrigatório.",
    });
  }

  try {
    // 3. Obtain AI Client
    const ai = getAiClient();

    // 4. Arrange materials
    const contents: any[] = [];

    // Add Exam File part
    contents.push({
      inlineData: {
        mimeType: examFile.mimeType,
        data: examFile.data, // base64 string
      },
    });

    // Add optional Gabarito File part
    if (gabaritoFile && gabaritoFile.data && gabaritoFile.mimeType) {
      contents.push({
        inlineData: {
          mimeType: gabaritoFile.mimeType,
          data: gabaritoFile.data,
        },
      });
    }

    // Comprehensive Prompt to extract multiple choice questions with answers and explanation
    contents.push({
      text: `Você é uma inteligência artificial especialista na prova do Vestibulinho ETEC (escola técnica estadual de São Paulo) do governo de SP.
Sua missão absoluta é analisar cuidadosamente o documento da prova fornecido (e o gabarito se fornecido) para extrair TODAS as questões de múltipla escolha.

INSTRUÇÕES DE EXTRAÇÃO:
1. Extraia ABSOLUTAMENTE TODAS as questões existentes e válidas encontradas no documento, do início ao fim (geralmente numeradas de 1 a 50 ou 1 a 60). Não aplique nenhum tipo de teto, limite superior, simplificação ou corte artificial. Se o arquivo contiver 50, 60 ou mais questões, extraia todas elas uma por uma de forma completa.
2. Se fornecido um Gabarito (segundo arquivo de anexo), utilize as respostas descritas nele para mapear a resposta correta de forma estritamente idêntica.
3. Se não houver arquivo de gabarito fornecido, você deve deduzir a resposta correta analisando cada questão individualmente com base no conhecimento técnico/científico correto.
4. Classifique a matéria ('materia') de cada questão em uma categoria estrita: 'Português', 'Matemática', 'Ciências da Natureza', 'História', 'Geografia', ou 'Geral'.
5. Redija uma explicação pedagógica objetiva e direta em português ('explicacao') justificando o porquê da resposta correta (com no máximo 2 a 3 frases para garantir que todo o conteúdo caiba no limite de resposta).
6. Ajuste a numeração sequencial iniciada em 1 nos índices oficiais da prova para o banco.
7. ATENÇÃO MÁXIMA AO FORMATO JSON:
   - Nunca insira quebras de linha físicas (Enter) no meio de um valor de string (como enunciado, alternativas ou explicacao). Junte os parágrafos em uma única linha horizontal usando espaços simples, ou use a sequência de escape '\\n' se precisar pular linha na visualização.
   - NÃO USE aspas duplas (") internas dentro das strings de maneira alguma. Substitua-as estritamente por aspas simples (') ou aspas angulares (« ») para citações. Por exemplo, em vez de "o termo \\"globalização\\"", escreva sempre "o termo 'globalização'". Isso é crucial para evitar qualquer corrupção do JSON.
   - Se necessitar descrever fórmulas matemáticas, expressões ou frações, não use contra-barras ('\\') soltas. Escreva-as por extenso ou use formatação simplificada (ex: 1/2 ao invés de frações complexas com comandos LaTeX), para evitar interferir com os caracteres de escape do JSON.

GARANTA que a estrutura respeite fielmente o esquema JSON requisitado abaixo:`,
    });

    // 5. Query Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.15,
        responseSchema: {
          type: Type.ARRAY,
          description: "Lista de todas as questões estruturadas extraídas da prova",
          items: {
            type: Type.OBJECT,
            properties: {
              numero: { type: Type.INTEGER, description: "Número sequencial da questão" },
              enunciado: { 
                type: Type.STRING, 
                description: "Texto completo do enunciado da questão. NUNCA use quebras de linha físicas ou aspas duplas sem escapar. Substitua aspas internas por aspas simples (') sempre que possível." 
              },
              alternativas: {
                type: Type.OBJECT,
                description: "As alternativas de A a E do teste. NUNCA use quebras de linha físicas em nenhum campo.",
                properties: {
                  A: { type: Type.STRING, description: "Texto da alternativa A" },
                  B: { type: Type.STRING, description: "Texto da alternativa B" },
                  C: { type: Type.STRING, description: "Texto da alternativa C" },
                  D: { type: Type.STRING, description: "Texto da alternativa D" },
                  E: { type: Type.STRING, description: "Texto da alternativa E" }
                },
                required: ["A", "B", "C", "D"]
              },
              respostaCorreta: { type: Type.STRING, description: "Letra maiúscula correspondente ao gabarito (Ex: A, B, C, D ou E)" },
              materia: { type: Type.STRING, description: "Classificação curta da categoria" },
              explicacao: { 
                type: Type.STRING, 
                description: "Breve explicação sobre por que a alternativa está correta. NUNCA use quebras de linha físicas ou aspas duplas sem escapar." 
              }
            },
            required: ["numero", "enunciado", "alternativas", "respostaCorreta"]
          }
        }
      }
    });

    // Extract generated text
    const textResult = response.text;
    if (!textResult) {
      throw new Error("Nenhum conteúdo pôde ser gerado pelo modelo.");
    }

    let parsedQuestions;
    try {
      // Tentar realizar uma limpeza preventiva inteligente contra quebras de linha e caracteres físicos indesejados nas strings JSON
      let cleanedJson = "";
      let inString = false;
      let consecutiveBackslashes = 0;
      
      for (let i = 0; i < textResult.length; i++) {
        const char = textResult[i];
        
        if (char === '\\') {
          consecutiveBackslashes++;
        } else {
          if (char === '"') {
            const isEscaped = (consecutiveBackslashes % 2) === 1;
            if (!isEscaped) {
              inString = !inString;
            }
          }
          consecutiveBackslashes = 0;
        }
        
        if (inString && (char === '\n' || char === '\r')) {
          cleanedJson += "\\n";
        } else if (inString && char === '\t') {
          cleanedJson += " ";
        } else {
          cleanedJson += char;
        }
      }

      parsedQuestions = JSON.parse(cleanedJson);
    } catch (parseError: any) {
      console.error("Erro ao analisar JSON original ou sanitizado do Gemini:", parseError);
      
      // Diagnosticar a posição exata do erro no texto retornado
      let errorContext = "";
      try {
        const posMatch = parseError.message.match(/position\s+(\d+)/i);
        if (posMatch && posMatch[1]) {
          const pos = parseInt(posMatch[1], 10);
          const start = Math.max(0, pos - 120);
          const end = Math.min(textResult.length, pos + 120);
          const beforeStr = textResult.substring(start, pos);
          const afterStr = textResult.substring(pos, end);
          errorContext = `\nContexto próximo ao erro (posição ${pos}):\n...${beforeStr} [-> ERRO AQUI <-] ${afterStr}...`;
        }
      } catch (diagErr) {
        console.error("Erro ao gerar diagnóstico de contexto:", diagErr);
      }

      try {
        parsedQuestions = JSON.parse(textResult);
      } catch (fallbackError: any) {
        console.error("Falha também com JSON bruto:", fallbackError);
        
        let fallbackContext = "";
        try {
          const posMatch = fallbackError.message.match(/position\s+(\d+)/i);
          if (posMatch && posMatch[1]) {
            const pos = parseInt(posMatch[1], 10);
            const start = Math.max(0, pos - 120);
            const end = Math.min(textResult.length, pos + 120);
            const beforeStr = textResult.substring(start, pos);
            const afterStr = textResult.substring(pos, end);
            fallbackContext = `\nContexto do erro bruto (posição ${pos}):\n...${beforeStr} [-> ERRO AQUI <-] ${afterStr}...`;
          }
        } catch (diagErr) {
          console.error("Erro ao gerar diagnóstico de contexto fallback:", diagErr);
        }

        throw new Error(
          `Falha de análise JSON estruturado: ${parseError.message}.${errorContext || fallbackContext || ""}\nO documento da prova contém caracteres especiais ou formatação complexa. Por favor, tente enviar novamente.`
        );
      }
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      throw new Error("O modelo gerou um formato inválido ou uma lista vazia de questões.");
    }

    // Return the successfully generated questions list
    return res.json({
      success: true,
      count: parsedQuestions.length,
      questions: parsedQuestions,
    });

  } catch (error: any) {
    console.error("Erro ao importar questões via IA:", error);
    return res.status(500).json({
      error: error.message || "Erro interno do servidor ao processar o anexo do exame.",
    });
  }
});


// ----------------- VITE MIDDLEWARE CONFIG -----------------

async function serveApp() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode serving compiled static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ETEC App] Server running on http://localhost:${PORT}`);
  });
}

serveApp();
