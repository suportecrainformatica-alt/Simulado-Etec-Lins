export interface Questao {
  numero: number;
  enunciado: string;
  alternativas: {
    [key: string]: string;
  };
  respostaCorreta: string;
  materia?: string;
  explicacao?: string;
}

export interface HistoricoSimulado {
  id: string;
  data: string;
  pontuacao: number;
  total: number;
  percentual: number;
  materiaDesempenho?: { [materia: string]: { total: number; acertos: number } };
}
