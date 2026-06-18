import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Configure body limits for large PDF base64 payloads (60 questions can be a heavy file)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
 * Handle new question import from PDF/Text exam and optional Gabarito key
 */
app.post("/api/import-questions", async (req, res) => {
  const { adminPassword, examFile, gabaritoFile } = req.body;

  // 1. Password Verification
  const validPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (adminPassword !== validPassword) {
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
1. Extraia o máximo possível de questões válidas contidas no documento. Tente extrair uma média de 50 a 60 questões se houver todas essas no arquivo.
2. Se fornecido um Gabarito (segundo arquivo de anexo), utilize as respostas descritas nele para mapear a resposta correta de forma estritamente idêntica.
3. Se não houver arquivo de gabarito fornecido, você deve deduzir a resposta correta analisando cada questão individualmente com base no conhecimento técnico/científico correto.
4. Classifique a matéria ('materia') de cada questão em uma categoria estrita: 'Português', 'Matemática', 'Ciências da Natureza', 'História', 'Geografia', ou 'Geral'.
5. Redija uma explicação pedagógica detalhada em português ('explicacao') justificando o porquê da resposta correta e demonstrando o raciocínio matemático ou interpretação necessária.
6. Ajuste a numeração sequencial iniciada em 1 nos índices oficiais da prova para o banco.

GARANTA que a estrutura respeite fielmente o esquema JSON requisitado abaixo:`,
    });

    // 5. Query Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Lista de questões estruturadas extraídas da prova",
          items: {
            type: Type.OBJECT,
            properties: {
              numero: { type: Type.INTEGER, description: "Número sequencial da questão" },
              enunciado: { type: Type.STRING, description: "Texto completo do enunciado da questão" },
              alternativas: {
                type: Type.OBJECT,
                description: "As alternativas de A a E do teste",
                properties: {
                  A: { type: Type.STRING },
                  B: { type: Type.STRING },
                  C: { type: Type.STRING },
                  D: { type: Type.STRING },
                  E: { type: Type.STRING }
                },
                required: ["A", "B", "C", "D"]
              },
              respostaCorreta: { type: Type.STRING, description: "Letra maiúscula correspondente ao gabarito (Ex: A, B, C, D ou E)" },
              materia: { type: Type.STRING, description: "Classificação curta da categoria" },
              explicacao: { type: Type.STRING, description: "Breve explicação/resolução comentada sobre por que a alternativa está correta" }
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

    const parsedQuestions = JSON.parse(textResult);

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
