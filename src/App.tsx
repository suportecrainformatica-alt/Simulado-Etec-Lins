import React, { useState, useMemo } from "react";
import { 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  Award, 
  RefreshCw, 
  UploadCloud, 
  Sparkles, 
  History, 
  BookOpen, 
  HelpCircle, 
  Trash2, 
  ArrowRight, 
  BarChart3, 
  Settings2,
  Check,
  AlertTriangle,
  Info,
  ChevronRight,
  FileJson,
  RotateCcw,
  BookMarked,
  Hourglass,
  Lightbulb,
  ShieldAlert,
  Key,
  FileUp,
  Loader2,
  ExternalLink,
  Clock,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Questao, HistoricoSimulado } from "./types";
import { bancoDeQuestoesPadrao, presetProvas } from "./data";

export default function App() {
  // --- STATE INITIALIZATION WITH LAZY LOAD ---
  const [bancoQuestoes, setBancoQuestoes] = useState<Questao[]>(() => {
    try {
      const salvo = localStorage.getItem("etec_banco_questoes");
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Erro ao ler banco de questões inicial do local storage", e);
    }
    return bancoDeQuestoesPadrao;
  });

  const [historico, setHistorico] = useState<HistoricoSimulado[]>(() => {
    try {
      const salvo = localStorage.getItem("etec_historico_desempenho");
      if (salvo) {
        return JSON.parse(salvo);
      }
    } catch (e) {
      console.error("Erro ao ler historico do local storage", e);
    }
    return [];
  });

  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [provaEntregue, setProvaEntregue] = useState(false);
  const [respostasEnviadasEstudo, setRespostasEnviadasEstudo] = useState<boolean>(false);
  const [filtroMateria, setFiltroMateria] = useState<string>("Todas");
  
  // Modos de Estudo:
  // - "simulado": Gabarito só aparece após entregar a prova.
  // - "estudo": Mostra se está certo/errado e a explicação após clicar para enviar todas as respostas.
  const [modoEstudo, setModoEstudo] = useState<boolean>(false);

  // Professor Panel state
  const [inputNovaProva, setInputNovaProva] = useState("");
  const [errorNovaProva, setErrorNovaProva] = useState<string | null>(null);
  const [sucessoNovaProva, setSucessoNovaProva] = useState(false);

  // AI & Administrative PDF Upload states
  const [profSubTab, setProfSubTab] = useState<"ia" | "manual">("ia");
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [arquivoProva, setArquivoProva] = useState<File | null>(null);
  const [arquivoGabarito, setArquivoGabarito] = useState<File | null>(null);
  const [isDragOverProva, setIsDragOverProva] = useState(false);
  const [isDragOverGabarito, setIsDragOverGabarito] = useState(false);
  const [isProcessingIA, setIsProcessingIA] = useState(false);
  const [msgIA, setMsgIA] = useState("");
  const [errorIA, setErrorIA] = useState<string | null>(null);
  const [sucessoIA, setSucessoIA] = useState(false);

  // Nome da Prova Ativa
  const [provaAtivaNome, setProvaAtivaNome] = useState<string>(() => {
    return localStorage.getItem("etec_prova_ativa_nome") || "Vestibulinho ETEC - Caderno Base Geral";
  });

  // Lista de Provas Salvas / Histórico de Gabaritos & Simulados
  const [provasSalvas, setProvasSalvas] = useState<{ id: string; label: string; questoes: Questao[]; ano: string; isPreset?: boolean }[]>(() => {
    try {
      const salvo = localStorage.getItem("etec_provas_salvas_list");
      if (salvo) {
        return JSON.parse(salvo);
      }
    } catch (e) {
      console.error("Erro ao ler lista de provas salvas", e);
    }
    return [
      {
        id: "padrao",
        label: "Vestibulinho ETEC - Caderno Base Geral",
        questoes: [],
        ano: "Geral",
        isPreset: true
      },
      {
        id: "2026S1",
        label: "Vestibulinho ETEC - 1º Semestre 2026",
        questoes: [],
        ano: "2026",
        isPreset: true
      },
      {
        id: "2026S2",
        label: "Vestibulinho ETEC - 2º Semestre 2026",
        questoes: [],
        ano: "2026",
        isPreset: true
      },
      {
        id: "2024S1",
        label: "Vestibulinho ETEC - 1º Semestre 2024",
        questoes: [],
        ano: "2024",
        isPreset: true
      }
    ];
  });

  // Nome do semestre selecionado no painel de importação (ou auto)
  const [semestreSelectImport, setSemestreSelectImport] = useState<string>("auto");

  // Tabs
  // "simulado" (Tela Principal) | "historico" (Estatísticas do Aluno) | "professor" (Inserir Provas)
  const [currentTab, setCurrentTab] = useState<"simulado" | "historico" | "professor">("simulado");

  // --- FILTERED QUESTIONS ---
  const questoesFiltradas = useMemo(() => {
    if (filtroMateria === "Todas") {
      return bancoQuestoes;
    }
    return bancoQuestoes.filter((q) => q.materia === filtroMateria);
  }, [bancoQuestoes, filtroMateria]);

  // materias que existem na prova atual
  const materiasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    bancoQuestoes.forEach((q) => {
      if (q.materia) set.add(q.materia);
    });
    return Array.from(set);
  }, [bancoQuestoes]);

  // --- ACTIONS & HANDLERS ---

  const handleSelecionarAlternativa = (numeroQuestao: number, letra: string) => {
    if (provaEntregue && !modoEstudo) return; // não muda após entregar
    if (modoEstudo && respostasEnviadasEstudo) return; // não muda após enviar em modo estudo
    setRespostas((prev) => ({
      ...prev,
      [numeroQuestao]: letra,
    }));
  };

  const handleEntregarProva = () => {
    if (questoesFiltradas.length === 0) return;

    let pontuacao = 0;
    const materiaDesempenho: { [materia: string]: { total: number; acertos: number } } = {};

    questoesFiltradas.forEach((questao) => {
      const respUsuario = respostas[questao.numero];
      const respCorreta = questao.respostaCorreta;
      const mat = questao.materia || "Geral";

      if (!materiaDesempenho[mat]) {
        materiaDesempenho[mat] = { total: 0, acertos: 0 };
      }
      materiaDesempenho[mat].total += 1;

      if (respUsuario === respCorreta) {
        pontuacao++;
        materiaDesempenho[mat].acertos += 1;
      }
    });

    const percentual = (pontuacao / questoesFiltradas.length) * 105 / 1.05; // safe normal
    const finalPercentValue = Math.min(Math.round((pontuacao / questoesFiltradas.length) * 100), 100);
    setProvaEntregue(true);

    // Salvar no histórico
    const novoItem: HistoricoSimulado = {
      id: "sim_" + Date.now(),
      data: new Date().toLocaleString("pt-BR"),
      pontuacao,
      total: questoesFiltradas.length,
      percentual: finalPercentValue,
      materiaDesempenho,
    };

    const novoHistorico = [novoItem, ...historico].slice(0, 30); // guardar últimos 30 simulados
    setHistorico(novoHistorico);
    localStorage.setItem("etec_historico_desempenho", JSON.stringify(novoHistorico));

    // Scroll para o resultado no topo de forma fluida
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRefazerSimulado = () => {
    setRespostas({});
    setProvaEntregue(false);
    setRespostasEnviadasEstudo(false);
  };

  const handleRestaurarQuestoesPadrao = () => {
    if (window.confirm("Deseja realmente restaurar as questões padrão do vestibulinho ETEC? Isso limpará a prova atual.")) {
      setBancoQuestoes(bancoDeQuestoesPadrao);
      localStorage.setItem("etec_banco_questoes", JSON.stringify(bancoDeQuestoesPadrao));
      setRespostas({});
      setProvaEntregue(false);
      setRespostasEnviadasEstudo(false);
      setFiltroMateria("Todas");
    }
  };

  const handleLimparHistorico = () => {
    if (window.confirm("Deseja realmente apagar todo o seu histórico de notas e simulados realizados?")) {
      setHistorico([]);
      localStorage.removeItem("etec_historico_desempenho");
    }
  };

  const handleCarregarProvaSalva = (id: string) => {
    let novasQuestoes: Questao[] = [];
    let nome = "";
    
    if (id === "padrao") {
      novasQuestoes = bancoDeQuestoesPadrao;
      nome = "Vestibulinho ETEC - Caderno Base Geral";
    } else if (id === "2026S1") {
      try {
        novasQuestoes = JSON.parse(presetProvas.prova2026S1);
        nome = "Vestibulinho ETEC - 1º Semestre 2026";
      } catch (e) {
        console.error("Erro ao carregar pré-configurado 2026S1", e);
      }
    } else if (id === "2026S2") {
      try {
        novasQuestoes = JSON.parse(presetProvas.prova2026S2);
        nome = "Vestibulinho ETEC - 2º Semestre 2026";
      } catch (e) {
        console.error("Erro ao carregar pré-configurado 2026S2", e);
      }
    } else if (id === "2024S1") {
      try {
        novasQuestoes = JSON.parse(presetProvas.prova2024S1);
        nome = "Vestibulinho ETEC - 1º Semestre 2024";
      } catch (e) {
        console.error("Erro ao carregar pré-configurado 2024S1", e);
      }
    } else {
      const match = provasSalvas.find(p => p.id === id);
      if (match) {
        novasQuestoes = match.questoes;
        nome = match.label;
      }
    }

    if (novasQuestoes && novasQuestoes.length > 0) {
      setBancoQuestoes(novasQuestoes);
      localStorage.setItem("etec_banco_questoes", JSON.stringify(novasQuestoes));
      setProvaAtivaNome(nome);
      localStorage.setItem("etec_prova_ativa_nome", nome);
      setRespostas({});
      setProvaEntregue(false);
      setRespostasEnviadasEstudo(false);
      setFiltroMateria("Todas");
    }
  };

  const handleExcluirProvaSalva = (id: string) => {
    if (window.confirm("Deseja realmente excluir essa prova importada de sua biblioteca?")) {
      const filtrado = provasSalvas.filter(p => p.id !== id);
      setProvasSalvas(filtrado);
      localStorage.setItem("etec_provas_salvas_list", JSON.stringify(filtrado));
      
      // Se era a prova ativa, retorna para a padrão
      const match = provasSalvas.find(p => p.id === id);
      if (match && provaAtivaNome === match.label) {
        setBancoQuestoes(bancoDeQuestoesPadrao);
        localStorage.setItem("etec_banco_questoes", JSON.stringify(bancoDeQuestoesPadrao));
        setProvaAtivaNome("Vestibulinho ETEC - Caderno Base Geral");
        localStorage.setItem("etec_prova_ativa_nome", "Vestibulinho ETEC - Caderno Base Geral");
        setRespostas({});
        setProvaEntregue(false);
        setRespostasEnviadasEstudo(false);
        setFiltroMateria("Todas");
      }
    }
  };

  const handleCarregarPreset = (chave: keyof typeof presetProvas) => {
    setInputNovaProva(presetProvas[chave]);
    setErrorNovaProva(null);
  };

  const handleCarregarNovaProva = (jsonString: string) => {
    setErrorNovaProva(null);
    setSucessoNovaProva(false);

    try {
      if (!jsonString.trim()) {
        setErrorNovaProva("Por favor, preencha o campo de texto JSON com a nova prova.");
        return;
      }

      const novoArrayDeQuestoes = JSON.parse(jsonString);

      if (!Array.isArray(novoArrayDeQuestoes)) {
        setErrorNovaProva("O formato fornecido não é válido. O JSON deve ser uma lista (Array) de objetos.");
        return;
      }

      if (novoArrayDeQuestoes.length === 0) {
        setErrorNovaProva("A lista de questões está vazia.");
        return;
      }

      // Validar campos de cada questão
      for (let i = 0; i < novoArrayDeQuestoes.length; i++) {
        const q = novoArrayDeQuestoes[i];
        const numQuestao = i + 1;

        if (typeof q.numero !== "number") {
          q.numero = numQuestao; // auto corrigindo se ausente
        }

        if (!q.enunciado || typeof q.enunciado !== "string") {
          setErrorNovaProva(`Questão ${numQuestao} inválida: Necessita do campo 'enunciado' contendo texto.`);
          return;
        }

        if (!q.alternativas || typeof q.alternativas !== "object") {
          setErrorNovaProva(`Questão ${numQuestao} inválida: Necessita do campo 'alternativas' como objeto.`);
          return;
        }

        const keys = Object.keys(q.alternativas);
        if (keys.length < 2) {
          setErrorNovaProva(`Questão ${numQuestao} inválida: Deve ter ao menos 2 alternativas em 'alternativas'.`);
          return;
        }

        if (!q.respostaCorreta || typeof q.respostaCorreta !== "string") {
          setErrorNovaProva(`Questão ${numQuestao} inválida: Necessita definir a 'respostaCorreta' (Ex: "A").`);
          return;
        }

        q.respostaCorreta = q.respostaCorreta.toUpperCase().trim();
        if (!q.alternativas[q.respostaCorreta]) {
          setErrorNovaProva(`Questão ${numQuestao} inválida: A 'respostaCorreta' ("${q.respostaCorreta}") informada não existe em 'alternativas'. Opções disponíveis: ${keys.join(", ")}`);
          return;
        }
      }

      setBancoQuestoes(novoArrayDeQuestoes);
      localStorage.setItem("etec_banco_questoes", JSON.stringify(novoArrayDeQuestoes));
      
      setSucessoNovaProva(true);
      setInputNovaProva("");
      setRespostas({});
      setProvaEntregue(false);
      setRespostasEnviadasEstudo(false);
      setFiltroMateria("Todas");
      
      setTimeout(() => {
        setCurrentTab("simulado");
        setSucessoNovaProva(false);
      }, 1500);

    } catch (erro: any) {
      setErrorNovaProva(`Erro de sintaxe no JSON: ${erro.message}. Verifique o uso de aspas duplas e vírgulas.`);
    }
  };

  const handleImportarIA = async () => {
    setErrorIA(null);
    setSucessoIA(false);

    if (!senhaAdmin.trim()) {
      setErrorIA("Por favor, digite a senha de administrador.");
      return;
    }

    if (!arquivoProva) {
      setErrorIA("O arquivo da prova (PDF ou texto) é obrigatório.");
      return;
    }

    setIsProcessingIA(true);

    try {
      // Step 1: encode exam file
      setMsgIA("Codificando arquivo da prova...");
      const examData = await readFileAsBase64(arquivoProva);
      
      let gabaritoData = null;
      if (arquivoGabarito) {
        setMsgIA("Codificando arquivo do gabarito...");
        gabaritoData = await readFileAsBase64(arquivoGabarito);
      }

      setMsgIA("Conectando ao modelo de Inteligência Artificial para extração completa (média de 60 questões)...");
      const resp = await fetch("/api/import-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPassword: senhaAdmin,
          examFile: {
            name: arquivoProva.name,
            mimeType: arquivoProva.type || "application/pdf",
            data: examData
          },
          gabaritoFile: arquivoGabarito ? {
            name: arquivoGabarito.name,
            mimeType: arquivoGabarito.type || "application/pdf",
            data: gabaritoData
          } : null
        })
      });

      const resData = await resp.json();

      if (!resp.ok) {
        throw new Error(resData.error || "Erro desconhecido ao processar documento.");
      }

      // Detecção inteligente de ano e semestre para gerar atalhos/links
      let labelDetectado = "Vestibulinho ETEC - Importada";
      let anoDetectado = "2026";
      
      const fileLower = arquivoProva.name.toLowerCase();
      if (fileLower.includes("2024") || fileLower.includes("24")) {
        labelDetectado = "Vestibulinho ETEC - Semestre 2024";
        anoDetectado = "2024";
      } else if (fileLower.includes("2026") || fileLower.includes("26")) {
        labelDetectado = "Vestibulinho ETEC - Semestre 2026";
        anoDetectado = "2026";
      } else {
        labelDetectado = `Vestibulinho ETEC - ${arquivoProva.name.replace(/\.[^/.]+$/, "")}`;
        const matchYear = arquivoProva.name.match(/(20\d{2})/);
        if (matchYear) {
          anoDetectado = matchYear[1];
        }
      }

      // Sobrescrita se selecionado expressamente
      if (semestreSelectImport !== "auto") {
        if (semestreSelectImport === "2026_1") {
          labelDetectado = "Vestibulinho ETEC - 1º Semestre 2026";
          anoDetectado = "2026";
        } else if (semestreSelectImport === "2026_2") {
          labelDetectado = "Vestibulinho ETEC - 2º Semestre 2026";
          anoDetectado = "2026";
        } else if (semestreSelectImport === "2024_1") {
          labelDetectado = "Vestibulinho ETEC - 1º Semestre 2024";
          anoDetectado = "2024";
        } else if (semestreSelectImport === "2024_2") {
          labelDetectado = "Vestibulinho ETEC - 2º Semestre 2024";
          anoDetectado = "2024";
        }
      }

      const novaProva = {
        id: "usr_" + Date.now(),
        label: labelDetectado,
        questoes: resData.questions,
        ano: anoDetectado
      };

      const novasSalvas = [novaProva, ...provasSalvas.filter(p => p.label !== labelDetectado)];
      setProvasSalvas(novasSalvas);
      localStorage.setItem("etec_provas_salvas_list", JSON.stringify(novasSalvas));

      setMsgIA(`Prova "${labelDetectado}" processada com sucesso e adicionada aos seus links rápidos!`);
      setBancoQuestoes(resData.questions);
      localStorage.setItem("etec_banco_questoes", JSON.stringify(resData.questions));
      setProvaAtivaNome(labelDetectado);
      localStorage.setItem("etec_prova_ativa_nome", labelDetectado);
      setSucessoIA(true);
      
      // Reset inputs
      setArquivoProva(null);
      setArquivoGabarito(null);
      setRespostas({});
      setProvaEntregue(false);
      setRespostasEnviadasEstudo(false);
      setFiltroMateria("Todas");

      setTimeout(() => {
        setCurrentTab("simulado");
        setSucessoIA(false);
        setIsProcessingIA(false);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setErrorIA(err.message || "Erro de conexão com o servidor. Verifique o tamanho do arquivo ou o status do servidor.");
      setIsProcessingIA(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Falha ao converter arquivo para base64."));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  // --- STYLED PERFORMANCE BADGE ---
  const getBadgeComponent = (percentual: number) => {
    if (percentual >= 80) {
      return {
        label: "Excelente! Altas chances de aprovação",
        color: "bg-emerald-500/10 text-emerald-800 border-emerald-250/30",
        bgIcon: "bg-emerald-500",
        textMsg: "Você está dominando o conteúdo do vestibulinho ETEC!",
      };
    } else if (percentual >= 60) {
      return {
        label: "Bom desempenho! Continue firme",
        color: "bg-indigo-500/10 text-indigo-850 border-indigo-250/30",
        bgIcon: "bg-indigo-500",
        textMsg: "Belo resultado. Focar nos seus pontos fracos garantirá sua vaga!",
      };
    } else if (percentual >= 45) {
      return {
        label: "Desempenho Médio. Reforce os estudos",
        color: "bg-amber-500/10 text-amber-850 border-amber-250/30",
        bgIcon: "bg-amber-500",
        textMsg: "Você acertou quase metade. Revise as questões incorretas e tente novamente.",
      };
    } else {
      return {
        label: "Abaixo da média. Vamos focar mais!",
        color: "bg-rose-500/10 text-rose-850 border-rose-250/30",
        bgIcon: "bg-rose-500",
        textMsg: "Análise as explicações teóricas fornecidas pelas questões para fixar o conteúdo.",
      };
    }
  };

  const estatísticasHistoricas = useMemo(() => {
    if (historico.length === 0) return { mediaGlobal: 0, totalFeitos: 0, melhorNota: 0 };
    const soma = historico.reduce((acc, h) => acc + h.percentual, 0);
    const melhor = Math.max(...historico.map((h) => h.percentual));
    return {
      mediaGlobal: Math.round(soma / historico.length),
      totalFeitos: historico.length,
      melhorNota: Math.round(melhor),
    };
  }, [historico]);

  const totalQuestõesFeitas = Object.keys(respostas).length;
  const totalQuestoesAtuais = questoesFiltradas.length;
  const percentualRespondido = totalQuestoesAtuais > 0 ? Math.round((totalQuestõesFeitas / totalQuestoesAtuais) * 100) : 0;

  const questoesNaoRespondidas = useMemo(() => {
    return questoesFiltradas.filter((q) => !respostas[q.numero]);
  }, [questoesFiltradas, respostas]);
  const quantasFaltam = questoesNaoRespondidas.length;

  return (
    <div id="app_root" className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-5">
        
        {/* HEADER SECTION (BENTO ROW TILE) */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white rounded-2xl p-6 shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white p-3 md:p-3.5 rounded-xl font-display font-black text-xl tracking-tight leading-none shadow-md shadow-indigo-150">
              ETEC
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight text-slate-900">
                Simulado de Estudo e Avaliação
              </h1>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider font-display">
                Vestibulinho 2026 • Ferramenta de Estudos e Auto-Avaliação
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 flex items-center gap-1.5 shadow-3xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sessão de Estudo Ativa
            </div>
            {provaEntregue && (
              <button 
                onClick={handleRefazerSimulado}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reiniciar
              </button>
            )}
          </div>
        </header>

        {/* NAVEGAÇÃO ENTRE ABAS PRINCIPAIS - TABS */}
        <div className="grid grid-cols-3 bg-white p-1 rounded-2xl shadow-sm border border-slate-200 gap-1 overflow-hidden">
          <button
            id="tab-simulado"
            onClick={() => setCurrentTab("simulado")}
            className={`py-3.5 px-2.5 rounded-xl font-display font-bold text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentTab === "simulado"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>Caderno de Provas</span>
          </button>

          <button
            id="tab-historico"
            onClick={() => setCurrentTab("historico")}
            className={`py-3.5 px-2.5 rounded-xl font-display font-bold text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentTab === "historico"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            <span>Estatísticas & Notas</span>
          </button>

          <button
            id="tab-professor"
            onClick={() => setCurrentTab("professor")}
            className={`py-3.5 px-2.5 rounded-xl font-display font-bold text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentTab === "professor"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            <span>Área do Professor</span>
          </button>
        </div>

        {/* MAIN BENTO GRID LAYOUT */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: SIMULADO */}
          {currentTab === "simulado" && (
            <motion.div
              key="simulado-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5"
            >
              {/* SIDEBAR ESQUERDA: PROGRESSO, SCORE GERAL & DICA (COLS: 3) */}
              <div className="lg:col-span-3 flex flex-col gap-5">
                
                {/* TILES 1: PROGRESS TRACKING */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display">
                      Progresso
                    </h2>
                    <span className="text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                      {totalQuestõesFeitas} de {totalQuestoesAtuais}
                    </span>
                  </div>

                  {totalQuestoesAtuais > 0 ? (
                    <div>
                      {/* Grid de bolinhas interativas da prova */}
                      <div className="grid grid-cols-5 gap-2">
                        {questoesFiltradas.map((q, index) => {
                          const num = q.numero;
                          const userAns = respostas[num];
                          const marked = userAns !== undefined;
                          const showRes = modoEstudo ? marked : provaEntregue;
                          const correct = userAns === q.respostaCorreta;

                          let tileStyle = "bg-slate-100 hover:bg-slate-250 text-slate-500 border border-slate-200/40";
                          if (showRes) {
                            tileStyle = correct 
                              ? "bg-emerald-500 text-white shadow-xs" 
                              : "bg-rose-500 text-white shadow-xs";
                          } else if (marked) {
                            tileStyle = "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-150";
                          }

                          return (
                            <button
                              key={num}
                              onClick={() => {
                                const elem = document.getElementById(`card-questao-${num}`);
                                if (elem) {
                                  elem.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                              }}
                              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${tileStyle}`}
                              title={`Ir para questão ${num}`}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legenda do Progresso */}
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-[10px] text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded bg-indigo-650 shrink-0"></span>
                          <span>Marcar Alternativa</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-300 shrink-0"></span>
                          <span>Pendente / Não Respondido</span>
                        </div>
                        {(provaEntregue || modoEstudo) && (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0"></span>
                              <span>Resposta Correta</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded bg-rose-500 shrink-0"></span>
                              <span>Resposta Incorreta</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-slate-400 font-medium">
                      Nenhuma questão disponível.
                    </div>
                  )}

                  {/* Barra de Progresso Real */}
                  {totalQuestoesAtuais > 0 && (
                    <div className="mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Marcado</span>
                        <span>{percentualRespondido}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${percentualRespondido}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TILES 2: PONTUAÇÃO ATUAL EM VERDE (BENTO HIGH CONTRAST) */}
                {historico.length > 0 && (
                  <div className="bg-emerald-550 text-white rounded-2xl p-5 flex flex-col justify-between shadow-md shadow-emerald-50 mt-0.5">
                    <h2 className="text-[10px] font-bold uppercase opacity-85 tracking-widest font-display">
                      Média Acumulada
                    </h2>
                    <div className="my-3">
                      <div className="text-4xl font-extrabold font-display leading-none">
                        {estatísticasHistoricas.mediaGlobal}%
                      </div>
                      <p className="text-xs mt-1.5 opacity-90 font-medium">
                        Rendimento médio nos simulados
                      </p>
                    </div>
                    
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div 
                        className="bg-white h-full rounded-full transition-all duration-500" 
                        style={{ width: `${estatísticasHistoricas.mediaGlobal}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[9px] opacity-75 font-mono mt-3">
                      <span>Provas: {historico.length}</span>
                      <span>Melhor: {estatísticasHistoricas.melhorNota}%</span>
                    </div>
                  </div>
                )}

                {/* TILES 3: DICA DO ESPECILISTA DINAMICA (AMBER BENTO) */}
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 bg-amber-200/50 rounded-lg flex items-center justify-center text-amber-800 mb-3 shrink-0">
                      <Lightbulb className="h-4.5 w-4.5 text-amber-700" />
                    </div>
                    <h3 className="font-bold text-amber-900 text-sm font-display">Dica de Especialista ETEC</h3>
                    <p className="text-xs text-amber-800 leading-relaxed mt-2 font-normal">
                      {filtroMateria === "Matemática" ? (
                        "O vestibulinho ETEC cobra muita interpretação de problemas aritméticos do dia a dia, como descontos, frações ordinárias e áreas geométricas básicas."
                      ) : filtroMateria === "Português" ? (
                        "Foque em figuras de linguagem, metáforas, pronomes de tratamento e as relações lógicas de conjunções coordenadas e subordinadas."
                      ) : filtroMateria === "Ciências da Natureza" ? (
                        "Revise ecologia (poluição do ar, efeito estufa natural vs antrópico) e a organização funcional dos reinos animais."
                      ) : filtroMateria === "Geografia" ? (
                        "Assuntos de escala demográfica e climatologia, como chuvas ácidas ou inversão térmica são recorrentes. Preste atenção no enunciado!"
                      ) : (
                        "Leia atentamente as questões de interpretação de texto, charges de jornalismo e infográficos técnicos. Elas correspondem a quase 40% da nota média global!"
                      )}
                    </p>
                  </div>
                  <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-4">
                    ETEC • DICA GERAL
                  </div>
                </div>

              </div>

              {/* CORE DO ESTUDO: FILTROS, CONTAINER DE QUESTÕES & ENVIOS (COLS: 9) */}
              <div className="lg:col-span-9 flex flex-col gap-5">
                
                {/* SEÇÃO 1: CENTRAL DE PROVAS ANTERIORES & GABARITOS (BENTO CARD INCLUSIVO) */}
                <div id="central-provas-anteriores" className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 md:p-6 border border-slate-800 shadow-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-indigo-900/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="p-1 px-2 bg-indigo-500/30 text-indigo-300 font-bold rounded-lg text-[10px] tracking-wider uppercase">
                          Exclusivo ETEC
                        </span>
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold font-display tracking-tight flex items-center gap-2">
                        <BookMarked className="h-5 w-5 text-indigo-400 shrink-0" />
                        Central de Provas & Gabaritos Anteriores
                      </h3>
                      <p className="text-xs text-indigo-200 mt-1 max-w-xl leading-relaxed">
                        Selecione as provas históricas oficiais do Vestibulinho ETEC para simular imediatamente com o gabarito inteligente ou baixar os PDFs oficiais.
                      </p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 px-4 shrink-0 text-left">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Caderno Ativo
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-400 block mt-0.5 truncate max-w-[220px]">
                        {provaAtivaNome}
                      </span>
                      <span className="text-[10px] text-indigo-305 font-semibold block mt-1">
                        ({bancoQuestoes.length} questões carregadas)
                      </span>
                    </div>
                  </div>

                  {/* LISTA DE PROVAS DISPONÍVEIS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {provasSalvas.map((prova) => {
                      const isActive = provaAtivaNome === prova.label || (prova.id === "padrao" && provaAtivaNome === "Vestibulinho ETEC - Caderno Base Geral");
                      return (
                        <div 
                          key={prova.id} 
                          className={`rounded-xl p-4 transition-all flex flex-col justify-between border ${
                            isActive 
                              ? "bg-slate-800/90 border-indigo-500 shadow-sm shadow-indigo-950/20" 
                              : "bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700/80"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold font-display text-slate-100 leading-snug">
                                {prova.label}
                              </span>
                              {isActive ? (
                                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider font-mono shrink-0">
                                  Ativo
                                </span>
                              ) : (
                                <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono shrink-0">
                                  {prova.ano}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                              {prova.id === "padrao" 
                                ? "Caderno padrão integrado de vestibulinho ETEC." 
                                : `Resolução comentada e gabarito unificado.`}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 items-center">
                            <button
                              onClick={() => handleCarregarProvaSalva(prova.id)}
                              className={`text-[10px] font-extrabold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                isActive 
                                  ? "bg-emerald-600 text-white cursor-default" 
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                              }`}
                              disabled={isActive}
                            >
                              <RefreshCw className={`h-3 w-3 ${isActive ? "" : "animate-spin-slow"}`} />
                              {isActive ? "Simulado Ativo" : "Simular Prova"}
                            </button>



                            {/* Links Oficiais para Prova & Gabarito PDF */}
                            <a 
                              href="https://www.vestibulinhoetec.com.br/provas-gabaritos/" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg border border-slate-700 transition-all flex items-center gap-1"
                              title="Acessar PDFs Oficiais e Gabaritos ETEC"
                            >
                              <ExternalLink className="h-3 w-3" />
                              PDF Oficial
                            </a>

                            {/* Se for uma prova importada pelo usuário, habilita exclusão */}
                            {!prova.isPreset && (
                              <button
                                onClick={() => handleExcluirProvaSalva(prova.id)}
                                className="ml-auto text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1.5 rounded-lg transition-all cursor-pointer"
                                title="Excluir prova importada"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CARD C: FILTROS DE ESTUDO & TIPO SELEÇÃO (BENTO) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        Caderno de Exercícios Inteligente
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Altere os temas e o estilo do teste dinamicamente.
                      </p>
                    </div>

                    {/* SELECTOR DE MODO DE ESTUDO */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/55 select-none self-start">
                      <button
                        onClick={() => {
                          setModoEstudo(false);
                          handleRefazerSimulado();
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          !modoEstudo 
                            ? "bg-white text-indigo-700 shadow-xs" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Modo Simulado
                      </button>
                      <button
                        onClick={() => {
                          setModoEstudo(true);
                          handleRefazerSimulado();
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          modoEstudo 
                            ? "bg-white text-indigo-700 shadow-xs" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Modo Estudo
                      </button>
                    </div>
                  </div>

                  {/* SELETOR DE MATÉRIAS */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1">Filtro:</span>
                    <button
                      onClick={() => {
                        setFiltroMateria("Todas");
                        setRespostas({});
                        setProvaEntregue(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        filtroMateria === "Todas"
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                          : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                      }`}
                    >
                      Todas ({bancoQuestoes.length})
                    </button>

                    {materiasDisponiveis.map((materia) => {
                      const count = bancoQuestoes.filter((q) => q.materia === materia).length;
                      return (
                        <button
                          key={materia}
                          onClick={() => {
                            setFiltroMateria(materia);
                            setRespostas({});
                            setProvaEntregue(false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            filtroMateria === materia
                              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                              : "bg-slate-150 hover:bg-slate-200/80 text-slate-700"
                          }`}
                        >
                          {materia} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PAINEL DE RESULTADO DE AVALIAÇÃO DO SIMULADO */}
                {provaEntregue && !modoEstudo && (
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
                  >
                    <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-gradient-to-tr from-indigo-50 to-indigo-100 rounded-full opacity-30 -z-0"></div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-5 relative z-10 text-center md:text-left">
                      {(() => {
                        const totalq = questoesFiltradas.length;
                        const correctCount = mapAcertos(questoesFiltradas, respostas);
                        const perc = totalq > 0 ? Math.round((correctCount / totalq) * 100) : 0;
                        const cfg = getBadgeComponent(perc);

                        return (
                          <>
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-full shrink-0 inline-flex">
                              <Award className={`h-14 w-14 text-white p-2.5 rounded-full shadow-inner ${cfg.bgIcon}`} />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 font-display">
                                Avaliação Realizada!
                              </h3>
                              <p className="text-xs text-slate-550 mt-1 max-w-md">
                                {cfg.textMsg} Navegue pelas questões destacadas para visualizar o gabarito comentado por questão.
                              </p>
                              
                              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* BIG CARD METRIS */}
                    <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 border border-slate-150 rounded-xl min-w-[130px] shrink-0 font-display relative z-10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Resultado</span>
                      <span className="text-4xl font-extrabold font-mono text-slate-900">
                        {mapAcertos(questoesFiltradas, respostas)}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">de {questoesFiltradas.length} acertos</span>
                      <div className="text-xs font-bold text-indigo-600 mt-2 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">
                        {questoesFiltradas.length > 0 ? Math.round((mapAcertos(questoesFiltradas, respostas) / questoesFiltradas.length) * 100) : 0}%
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* PAINEL INFORMATIVO / EDUCACIONAL DO MODO DE ESTUDO */}
                {modoEstudo && !respostasEnviadasEstudo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 shadow-3xs text-amber-900 col-span-full"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100/80 text-amber-700 rounded-xl shrink-0 mt-0.5">
                        <Lightbulb className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-extrabold font-display leading-tight flex items-center gap-1.5 text-amber-955">
                          💡 Como funciona o Modo Estudo Inteligente?
                        </h3>
                        <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
                          Neste modo, o gabarito oficial com as explicações detalhadas de <strong>como chegar ao resultado</strong> fica bloqueado temporariamente até que todas as questões do caderno ativo sejam resolvidas por você.
                        </p>

                        <div className="mt-4 bg-white/80 rounded-xl p-3.5 border border-amber-200/50 text-xs shadow-3xs">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Situação atual e instruções de resolução:
                          </div>
                          
                          {quantasFaltam > 0 ? (
                            <div className="mt-2 space-y-1.5 text-slate-755">
                              <p>
                                Ainda resta(m) <strong className="text-indigo-700 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded">{quantasFaltam} questão(ões)</strong> para responder no caderno ativo.
                              </p>
                              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                                👉 <strong>Instrução / Como Resolver:</strong> Selecione sua alternativa para as seguintes questões restantes:{" "}
                                <span className="font-bold font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                                  {questoesNaoRespondidas.map((q) => q.numero).join(", ")}
                                </span>
                                .
                              </p>
                            </div>
                          ) : (
                            <div className="mt-2 space-y-1.5 text-emerald-850">
                              <p className="text-emerald-900 font-bold flex items-center gap-1">
                                <Check className="h-4 w-4 text-emerald-600" />
                                Parabéns! Todas as {questoesFiltradas.length} questões foram preenchidas.
                              </p>
                              <p className="text-[11px] text-emerald-700 font-medium">
                                👉 <strong>Próximo passo:</strong> Clique no botão no final da página (ou no botão abaixo) para <strong>Enviar Respostas</strong> e liberar o gabarito com resoluções comentadas.
                              </p>
                              <button
                                onClick={() => {
                                  setRespostasEnviadasEstudo(true);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="mt-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                                Enviar Respostas e Liberar Gabarito Comentado
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {modoEstudo && respostasEnviadasEstudo && (
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-50 border border-emerald-200 p-5 md:p-6 rounded-2xl shadow-3xs flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden text-emerald-900 col-span-full"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 px-2 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px] tracking-wider uppercase font-mono">
                          Sucesso
                        </div>
                        <span className="text-[11px] text-emerald-750 font-bold">Gabarito & Explicações Liberados!</span>
                      </div>
                      <h3 className="text-base font-extrabold font-display leading-tight text-emerald-950 flex items-center gap-1.5">
                        <Sparkles className="h-5 w-5 text-emerald-600" />
                        Gabarito de Estudos Liberado
                      </h3>
                      <p className="text-xs text-emerald-800 mt-1.5 leading-relaxed max-w-xl">
                        Você preencheu todas as {questoesFiltradas.length} questões. Analise as explicações de <strong>como chegar ao resultado</strong> no final de cada questão abaixo para fixar os tópicos do Vestibulinho ETEC!
                      </p>
                      
                      <div className="mt-4 flex flex-wrap items-center gap-2 font-display">
                        <button
                          onClick={() => {
                            setRespostasEnviadasEstudo(false);
                            handleRefazerSimulado();
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-3xs flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Limpar e Recomeçar
                        </button>
                      </div>
                    </div>

                    {/* BIG CARD METRIC */}
                    <div className="flex flex-col items-center justify-center text-center p-4 bg-white border border-emerald-150 rounded-xl min-w-[130px] shrink-0 font-display">
                      <span className="text-[10px] font-bold text-emerald-655 uppercase tracking-wider block mb-1 font-mono">Resultado</span>
                      <span className="text-4xl font-extrabold font-mono text-emerald-600">
                        {mapAcertos(questoesFiltradas, respostas)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">de {questoesFiltradas.length} acertos</span>
                      <div className="text-xs font-bold text-emerald-700 mt-2 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                        {questoesFiltradas.length > 0 ? Math.round((mapAcertos(questoesFiltradas, respostas) / questoesFiltradas.length) * 100) : 0}%
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* LISTAGEM PRINCIPAL DE QUESTÕES DO CADERNO */}
                {questoesFiltradas.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-3xs">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-900 font-display">Nenhum caderno de questões</h3>
                    <p className="text-xs text-slate-550 mt-2 max-w-sm mx-auto">
                      Não há itens disponíveis para "{filtroMateria}". Acesse a aba Área do Professor para carregar novos arquivos de prova.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {questoesFiltradas.map((questao, qIndex) => {
                      const userChoice = respostas[questao.numero];
                      const isCorrectChoice = userChoice === questao.respostaCorreta;
                      const hasGraded = modoEstudo ? respostasEnviadasEstudo : provaEntregue;

                      return (
                        <div
                          id={`card-questao-${questao.numero}`}
                          key={questao.numero}
                          className={`bg-white rounded-2xl border p-5 md:p-6 transition-all shadow-3xs relative ${
                            hasGraded
                              ? isCorrectChoice
                                ? "border-emerald-200/90 bg-emerald-50/5"
                                : "border-rose-200/90 bg-rose-50/5"
                              : "border-slate-200 hover:border-slate-350"
                          }`}
                        >
                          {/* TAG DE MATERIA & NUMERAÇÃO */}
                          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap text-xs">
                            <div className="flex items-center gap-2">
                              <span className="p-1 px-2 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg font-mono text-[10px] font-extrabold uppercase">
                                Questão {qIndex + 1}
                              </span>
                              {questao.materia && (
                                <span className="p-1 px-2.5 bg-slate-100 hover:bg-slate-150 text-slate-655 rounded-lg text-[10px] font-bold transition-all">
                                  {questao.materia}
                                </span>
                              )}
                            </div>

                            {/* ESTADOS DE CORREÇÃO EM BENTO BADGE */}
                            {hasGraded && (
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md ${
                                isCorrectChoice 
                                  ? "bg-emerald-100 text-emerald-800" 
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {isCorrectChoice ? (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    Confirmado Correto
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                    Resposta Incorreta
                                  </>
                                )}
                              </span>
                            )}
                          </div>

                          {/* TEXTO DO ENUNCIADO */}
                          <div className="text-slate-900 text-sm md:text-base leading-relaxed tracking-tight font-normal whitespace-pre-wrap mb-5">
                            {questao.enunciado}
                          </div>

                          {/* ALTERNATIVAS DO TESTE */}
                          <div className="space-y-2.5">
                            {Object.entries(questao.alternativas).map(([letra, textoOption]) => {
                              const selectedThis = userChoice === letra;
                              const correctAnsThis = letra === questao.respostaCorreta;

                              let btnColor = "border-slate-200 bg-slate-50 hover:bg-slate-100/90 hover:border-slate-300 text-slate-700";
                              let checkMarker = null;

                              if (hasGraded) {
                                if (correctAnsThis) {
                                  btnColor = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-2 ring-emerald-500/10";
                                  checkMarker = <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 ml-auto" />;
                                } else if (selectedThis) {
                                  btnColor = "border-rose-400 bg-rose-50 text-rose-900 cursor-not-allowed font-medium ring-1 ring-rose-550/20";
                                  checkMarker = <XCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 ml-auto" />;
                                } else {
                                  btnColor = "border-slate-200 bg-slate-50 text-slate-400 opacity-55 cursor-not-allowed";
                                }
                              } else if (selectedThis) {
                                btnColor = "border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-505/10 font-semibold";
                              }

                              return (
                                <button
                                  key={letra}
                                  type="button"
                                  onClick={() => handleSelecionarAlternativa(questao.numero, letra)}
                                  disabled={hasGraded}
                                  className={`w-full min-h-[44px] px-4 py-3 text-left rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-3 transition-all duration-150 group cursor-pointer ${btnColor}`}
                                >
                                  <span className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 border ${
                                    selectedThis
                                      ? "bg-slate-900 text-white border-transparent"
                                      : "bg-white text-slate-500 border-slate-250 group-hover:border-slate-350"
                                  }`}>
                                    {letra}
                                  </span>
                                  <span className="flex-1 pr-1 md:pr-4 line-snug font-medium text-xs sm:text-sm">{textoOption}</span>
                                  {checkMarker}
                                </button>
                              );
                            })}
                          </div>

                          {/* EXPLICAÇÃO DO CADERNO (APARECE INLINE SÓ QUANDO REVELADA COMENTADA) */}
                          {hasGraded && questao.explicacao && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mt-5 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs md:text-sm text-slate-700 animate-fade-in"
                            >
                              <div className="font-extrabold text-indigo-900 flex items-center gap-1.5 mb-2 font-display text-xs uppercase tracking-wider">
                                <Lightbulb className="h-4 w-4 text-amber-500 animate-pulse" />
                                Resolução Passo a Passo (Como Chegar ao Resultado):
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap text-slate-700 bg-white p-3.5 rounded-xl border border-indigo-50 font-medium">
                                {questao.explicacao}
                              </p>
                              <div className="mt-2.5 text-xs text-slate-550 font-bold flex items-center gap-1.5">
                                <span className="h-5 w-5 bg-emerald-100 text-emerald-850 text-[10px] rounded-md flex items-center justify-center font-mono font-black border border-emerald-250">
                                  {questao.respostaCorreta}
                                </span>
                                Resposta Correta: Alternativa {questao.respostaCorreta}
                              </div>
                            </motion.div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}


                {/* BOTÃO DE ENTREGA DE PROVA DE ALTA PERFORMANCE */}
                {!provaEntregue && !modoEstudo && questoesFiltradas.length > 0 && (
                  <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm font-display">Pronto para finalizar o Exame?</h3>
                      <p className="text-xs text-slate-550 mt-0.5">
                        Registraremos suas {totalQuestõesFeitas} respostas no histórico e computaremos seu boletim geral.
                      </p>
                    </div>

                    <button
                      onClick={handleEntregarProva}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold font-display text-xs sm:text-sm py-3.5 px-6 rounded-xl transition-all shadow-md shadow-indigo-150 flex items-center justify-center gap-2 cursor-pointer self-stretch sm:self-auto"
                    >
                      <Check className="h-4 w-4 shrink-0" />
                      Entregar Prova e Ver Pontuação
                    </button>
                  </div>
                )}

                {/* REINICIAR OPÇÕES APENAS NO MODO ESTUDO */}
                {modoEstudo && questoesFiltradas.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleRefazerSimulado}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Apagar Minhas Alternativas
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}

          {/* TAB 2: HISTÓRICO */}
          {currentTab === "historico" && (
            <motion.div
              key="historico-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-5"
            >
              {/* CARD ESQUERDO: METRIC CARD RAPIDOS (COLS: 4) */}
              <div className="md:col-span-4 flex flex-col gap-5">
                
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-display mb-4">
                    Resumo Consolidado
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/30">
                      <span className="text-[10px] text-slate-400 block font-semibold">Mérito Acumulado</span>
                      <span className="text-3xl font-extrabold font-mono text-emerald-400">{estatísticasHistoricas.mediaGlobal}%</span>
                    </div>

                    <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/30">
                      <span className="text-[10px] text-slate-400 block font-semibold">Melhor Aproveitamento</span>
                      <span className="text-3xl font-extrabold font-mono text-indigo-400">{estatísticasHistoricas.melhorNota}%</span>
                    </div>

                    <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/30">
                      <span className="text-[10px] text-slate-400 block font-semibold">Simulados Completos</span>
                      <span className="text-3xl font-extrabold font-mono text-white">{estatísticasHistoricas.totalFeitos}</span>
                    </div>
                  </div>
                </div>

                {/* INFORMATIVE CADERNO INFO */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-3xs text-xs text-slate-600 space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1 font-display">
                    <BookMarked className="h-4 w-4 text-indigo-600" />
                    Como funciona as notas?
                  </h4>
                  <p className="leading-relaxed">
                    Sempre que você marca alternativas nos Cadernos de Prova e clica em <b>"Entregar Prova"</b>, nós catalogamos a análise percentual exata do seu desempenho.
                  </p>
                  <p className="leading-relaxed">
                    Você pode refazer novos testes, carregar questões antigas na Área do Professor e limpar as métricas a qualquer momento pelo botão de lixeira.
                  </p>
                </div>

              </div>

              {/* LISTAGEM DOS ACERTOS DAS PROVAS REALIZADAS (COLS: 8) */}
              <div className="md:col-span-8 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4 flex-wrap">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-1.5">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      Meus Simulados Realizados
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lista detalhada das avaliações que você executou.
                    </p>
                  </div>

                  {historico.length > 0 && (
                    <button
                      onClick={handleLimparHistorico}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Limpar Histórico
                    </button>
                  )}
                </div>

                {historico.length === 0 ? (
                  <div className="text-center py-16 flex-1 flex flex-col items-center justify-center">
                    <History className="h-10 w-10 text-slate-300 mb-2.5" />
                    <h3 className="text-sm font-bold text-slate-900 font-display">Nenhuma avaliação no histórico</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Navegue pelo Caderno de Práticas, marque as respostas e clique em entregar para preencher seus gráficos.
                    </p>
                    <button
                      onClick={() => setCurrentTab("simulado")}
                      className="mt-4 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Voltar ao simulado
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {historico.map((item, idx) => {
                      const badgeCfg = getBadgeComponent(item.percentual);
                      return (
                        <div
                          key={item.id || idx}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl p-4 shadow-3xs transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-sm text-slate-900">
                                {item.pontuacao} de {item.total} acertos
                              </span>
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md font-mono">
                                {item.percentual.toFixed(0)}%
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                              Finalizado em {item.data}
                            </span>

                            {/* Desempenho por matéria */}
                            {item.materiaDesempenho && (
                              <div className="flex flex-wrap gap-1 mt-2.5">
                                {Object.entries(item.materiaDesempenho).map(([m, data]) => {
                                  const statsMat = data as { total: number; acertos: number };
                                  return (
                                    <span key={m} className="text-[9px] bg-white border border-slate-205 text-slate-550 rounded px-1.5 py-0.5 font-semibold">
                                      {m}: {statsMat.acertos}/{statsMat.total}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className={`self-start sm:self-center text-[10px] font-extrabold py-1.5 px-3 rounded-lg border ${badgeCfg.color}`}>
                            {badgeCfg.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: ÁREA DO PROFESSOR (BENTO EDITOR & MODELO) */}
          {currentTab === "professor" && (
            <motion.div
              key="professor-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5"
            >
              {/* SIDEBAR PROFESSOR: INSTRUÇÕES E PRESETS (COLS: 4) */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                
                <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-display mb-3">
                    Configurações do Caderno
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Insira novas questões customizadas preenchendo o código JSON no campo de texto ao lado.
                  </p>

                  <div className="p-3 bg-slate-800/50 border border-slate-700/40 rounded-xl space-y-2 text-[11px] text-slate-350 leading-relaxed mb-4">
                    <span className="font-bold text-white block mb-1">Passos recomendados:</span>
                    <p>1. Selecione um dos modelos listados para entender as propriedades padrão.</p>
                    <p>2. Preencha as chaves: enunciado, alternativas A, B, C, D, E e a resposta correta correspondente.</p>
                    <p>3. Clique em "Atualizar Banco" para aplicar.</p>
                  </div>

                  <button
                    onClick={handleRestaurarQuestoesPadrao}
                    className="mt-auto w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restaurar Questões Base
                  </button>
                </div>

                {/* PRESETS DE INSTANCIAÇÃO RAPIDA */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-slate-950 font-display text-xs uppercase tracking-wider mb-2">
                    Preparações Prontas:
                  </h4>
                  
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleCarregarPreset("exemploFacil")}
                      className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 text-left transition-colors cursor-pointer"
                    >
                      <FileJson className="h-4 w-4 text-slate-500 shrink-0" />
                      <div>
                        <span>Exemplo Curto (2 Questões)</span>
                        <span className="block text-[10px] font-medium text-slate-400 mt-0.5">Foco rápido de teste</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCarregarPreset("miniCiencias")}
                      className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 text-left transition-colors cursor-pointer"
                    >
                      <FileJson className="h-4 w-4 text-slate-500 shrink-0" />
                      <div>
                        <span>Caderno Curto de Ciências</span>
                        <span className="block text-[10px] font-medium text-slate-400 mt-0.5">Ambiente e Cartografia</span>
                      </div>
                    </button>
                  </div>
                </div>

              </div>

              {/* CORE EDITOR & IA FILE IMPORT CONTROLLER (COLS: 8) */}
              <div className="lg:col-span-8 bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col gap-5">
                
                {/* SUB-TAB BAR */}
                <div className="flex border-b border-slate-150 pb-1">
                  <button
                    type="button"
                    onClick={() => setProfSubTab("ia")}
                    className={`pb-3 px-4 font-display text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all relative cursor-pointer ${
                      profSubTab === "ia" ? "text-indigo-650 font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-indigo-650" />
                    Bento IA: Importar Prova & Gabarito (PDF)
                    {profSubTab === "ia" && (
                      <motion.div
                        layoutId="activeSubTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-650"
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfSubTab("manual")}
                    className={`pb-3 px-4 font-display text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all relative cursor-pointer ${
                      profSubTab === "manual" ? "text-indigo-650 font-extrabold" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileJson className="h-4 w-4 shrink-0 text-slate-500" />
                    Editor Manual JSON
                    {profSubTab === "manual" && (
                      <motion.div
                        layoutId="activeSubTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-650"
                      />
                    )}
                  </button>
                </div>

                {/* Sub Tab IA Content */}
                {profSubTab === "ia" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm font-display flex items-center gap-1">
                        Gerador Modular de Questões por IA
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Arraste e solte o arquivo da prova do Vestibulinho ETEC (PDF ou Texto) e, opcionalmente, o arquivo de gabarito. Nossa IA lerá todo o conteúdo, extrairá em média 50 a 60 questões, associará os pesos e preencherá as explicações.
                      </p>
                    </div>

                    {/* ADMIN PASSWORD BLOCK */}
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 shadow-3xs">
                      <div className="flex items-center gap-2 text-slate-700 shrink-0">
                        <div className="p-1.5 bg-slate-200/60 rounded-lg">
                          <Key className="h-4 w-4 text-slate-500" />
                        </div>
                        <span className="text-xs font-bold leading-none">Chave Admin:</span>
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="password"
                          value={senhaAdmin}
                          onChange={(e) => setSenhaAdmin(e.target.value)}
                          placeholder="Digite a senha administrativa (por padrão: admin123)"
                          className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* SELEÇÃO DO SEMESTRE / ANO DA PROVA */}
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 shadow-3xs">
                      <div className="flex items-center gap-2 text-slate-700 shrink-0">
                        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                          <Clock className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold leading-none">Semestre/Ano do Arquivo:</span>
                      </div>
                      <div className="flex-1">
                        <select
                          value={semestreSelectImport}
                          onChange={(e) => setSemestreSelectImport(e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="auto">🌟 Auto-detectar pelo nome do arquivo (Recomendado)</option>
                          <option value="2026_1">1º Semestre de 2026 (Vestibulinho 2026.1)</option>
                          <option value="2026_2">2º Semestre de 2026 (Vestibulinho 2026.2)</option>
                          <option value="2024_1">1º Semestre de 2024 (Vestibulinho 2024.1)</option>
                          <option value="2024_2">2º Semestre de 2024 (Vestibulinho 2024.2)</option>
                        </select>
                      </div>
                    </div>

                    {/* TWO DOUBLE DRAG & DROP FILE SECTIONS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* FILE 1: THE EXAM PROOF */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                          1. Arquivo do Vestibulinho / Prova <span className="text-rose-500">*</span>
                        </span>

                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragOverProva(true); }}
                          onDragLeave={() => setIsDragOverProva(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOverProva(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              setArquivoProva(e.dataTransfer.files[0]);
                            }
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] bg-slate-50/45 ${
                            isDragOverProva 
                              ? "border-indigo-500 bg-indigo-50/20" 
                              : arquivoProva 
                                ? "border-emerald-500 bg-emerald-50/5" 
                                : "border-slate-250 hover:border-slate-350 hover:bg-slate-50/80"
                          }`}
                          onClick={() => document.getElementById("file-exam-input")?.click()}
                        >
                          <input
                            id="file-exam-input"
                            type="file"
                            accept=".pdf,.txt,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setArquivoProva(e.target.files[0]);
                              }
                            }}
                          />
                          {arquivoProva ? (
                            <div className="space-y-2">
                              <div className="p-2 bg-emerald-100 rounded-full inline-flex">
                                <Check className="h-5 w-5 text-emerald-600 font-extrabold" />
                              </div>
                              <p className="text-xs font-bold text-slate-800 max-w-[200px] truncate mx-auto" title={arquivoProva.name}>
                                {arquivoProva.name}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400">
                                {(arquivoProva.size / 1024).toFixed(1)} KB • {arquivoProva.type || "Texto / PDF"}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setArquivoProva(null);
                                }}
                                className="text-[10px] text-rose-500 hover:text-rose-600 bg-rose-50 border border-rose-150 rounded px-2 py-0.5 font-bold cursor-pointer"
                              >
                                Remover
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <FileUp className="h-7 w-7 text-slate-400 mx-auto" />
                              <p className="text-xs font-bold text-slate-700">Arrastar & Soltar Prova</p>
                              <p className="text-[10px] font-semibold text-slate-400">ou clique para selecionar</p>
                              <span className="text-[9px] px-1.5 py-0.5 bg-slate-150 rounded text-slate-500 font-semibold uppercase">PDF, TXT</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* FILE 2: THE ANSWER KEY (GABARITO) */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          2. Gabarito Oficial (Opcional)
                        </span>

                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragOverGabarito(true); }}
                          onDragLeave={() => setIsDragOverGabarito(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOverGabarito(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              setArquivoGabarito(e.dataTransfer.files[0]);
                            }
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] bg-slate-50/45 ${
                            isDragOverGabarito 
                              ? "border-indigo-500 bg-indigo-50/20" 
                              : arquivoGabarito 
                                ? "border-emerald-500 bg-emerald-50/5" 
                                : "border-slate-250 hover:border-slate-350 hover:bg-slate-50/80"
                          }`}
                          onClick={() => document.getElementById("file-answer-input")?.click()}
                        >
                          <input
                            id="file-answer-input"
                            type="file"
                            accept=".pdf,.txt,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setArquivoGabarito(e.target.files[0]);
                              }
                            }}
                          />
                          {arquivoGabarito ? (
                            <div className="space-y-2">
                              <div className="p-2 bg-emerald-100 rounded-full inline-flex">
                                <Check className="h-5 w-5 text-emerald-600 font-extrabold" />
                              </div>
                              <p className="text-xs font-bold text-slate-800 max-w-[200px] truncate mx-auto" title={arquivoGabarito.name}>
                                {arquivoGabarito.name}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400">
                                {(arquivoGabarito.size / 1024).toFixed(1)} KB • {arquivoGabarito.type || "Texto / PDF"}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setArquivoGabarito(null);
                                }}
                                className="text-[10px] text-rose-500 hover:text-rose-600 bg-rose-50 border border-rose-150 rounded px-2 py-0.5 font-bold cursor-pointer"
                              >
                                Remover
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <FileUp className="h-7 w-7 text-slate-400 mx-auto" />
                              <p className="text-xs font-bold text-slate-700">Arrastar & Soltar Gabarito</p>
                              <p className="text-[10px] font-semibold text-slate-400">ou clique para selecionar</p>
                              <span className="text-[9px] px-1.5 py-0.5 bg-slate-150 rounded text-slate-500 font-semibold uppercase">Opcional PDF/TXT</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* STATUS DE PROGRESSO IA */}
                    {isProcessingIA && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-slate-900 text-white rounded-xl flex flex-col gap-3 shadow-md border border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-5 w-5 text-indigo-400 animate-spin shrink-0" />
                          <span className="text-xs font-bold text-slate-200">Processando com Inteligência Artificial...</span>
                        </div>
                        <p className="text-[11px] text-indigo-300 font-mono italic leading-relaxed">
                          "{msgIA}"
                        </p>
                        {/* Loading pulse bar */}
                        <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            className="bg-indigo-500 h-full rounded-full"
                            animate={{
                              width: ["10%", "30%", "65%", "90%", "92%"],
                            }}
                            transition={{
                              duration: 15,
                              ease: "easeInOut",
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-medium text-slate-400 block leading-tight">
                          Nota: O processamento de exames de 60 questões pelo modelo multimodal leva em torno de 15 a 45 segundos. Por favor, aguarde.
                        </span>
                      </motion.div>
                    )}

                    {/* FEEDBACK MENSAGEM */}
                    {errorIA && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2"
                      >
                        <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{errorIA}</span>
                      </motion.div>
                    )}

                    {sucessoIA && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-650 shrink-0" />
                        <span>Sincronização completa! Nova prova de {bancoQuestoes.length} questões carregada.</span>
                      </motion.div>
                    )}

                    {/* BIG BUTTON RUN IA */}
                    {!isProcessingIA && (
                      <button
                        onClick={handleImportarIA}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold font-display text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-150 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="h-4.5 w-4.5 text-amber-300 animate-pulse fill-amber-300/30" />
                        Processar e Integrar Prova com IA ✨
                      </button>
                    )}

                  </div>
                )}

                {/* Sub Tab Manual JSON Content */}
                {profSubTab === "manual" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm font-display">Editor JSON do Professor</h3>
                      <p className="text-xs text-slate-550 mt-0.5 leading-relaxed">
                        Insira o banco de dados das questões respeitando as vírgulas e as aspas.
                      </p>
                    </div>

                    <div>
                      <textarea
                        id="input-nova-prova"
                        value={inputNovaProva}
                        onChange={(e) => setInputNovaProva(e.target.value)}
                        placeholder='Exemplo:
  [
    {
      "numero": 1,
      "enunciado": "A fumaça preta que sai das chaminés...",
      "alternativas": {
        "A": "Texto da alternativa A",
        "B": "Texto da alternativa B",
        "C": "Texto da alternativa C",
        "D": "Texto da alternativa D",
        "E": "Texto da alternativa E"
      },
      "respostaCorreta": "D",
      "materia": "Ciências da Natureza",
      "explicacao": "A queima incompleta libera fuligem e CO2."
    }
  ]'
                        className="w-full h-80 px-3.5 py-3 bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 block shadow-inner leading-relaxed"
                      />
                    </div>

                    {/* Feedback Box de erro e sucesso */}
                    {errorNovaProva && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{errorNovaProva}</span>
                      </motion.div>
                    )}

                    {sucessoNovaProva && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-650 shrink-0" />
                        <span>Nova prova integrada! Preparando simulador...</span>
                      </motion.div>
                    )}

                    <button
                      onClick={() => handleCarregarNovaProva(inputNovaProva)}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold font-display text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-150 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UploadCloud className="h-4 w-4 shrink-0" />
                      Carregar e atualizar caderno de estudos
                    </button>
                  </div>
                )}

              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* FOOTER INFORMATIVO GERAL */}
        <footer className="mt-12 border-t border-slate-200/80 pt-8 text-center text-xs text-slate-500">
          <p className="max-w-md mx-auto leading-relaxed">
            Plataforma de estudos com layout Bento Grid, projetada para fixação escolar no vestibulinho ETEC.
          </p>
          <p className="mt-2.5 font-bold text-slate-400 uppercase tracking-widest font-display text-[10px]">
            ETEC Vestibulinho • Domine o Conhecimento
          </p>
        </footer>

      </div>
    </div>
  );
}

// --- HELPER METHODS ---
function mapAcertos(questoes: Questao[], respostas: Record<number, string>): number {
  let count = 0;
  questoes.forEach((q) => {
    if (respostas[q.numero] === q.respostaCorreta) {
      count++;
    }
  });
  return count;
}
