# Menos Ping

Otimizador de latência para jogos online. Aplicação de desktop (Windows) que deteta o jogo em
execução, mede a rota até ao servidor, aplica ajustes de rede e mostra o antes e o depois.

**Estado:** funcional, ainda sem instalador publicado. O código abaixo está escrito e a correr
em desenvolvimento; o que falta é empacotamento e testes em máquinas que não a minha.

---

## O que já faz

| Módulo | O que resolve |
|---|---|
| `GameDetector` | descobre que jogo está a correr e a que servidor está ligado |
| `GameRouteAnalyzer` | traça a rota até esse servidor e identifica onde o atraso aparece |
| `NetworkMonitor` | mede latência, variação e perda de pacotes de forma contínua |
| `RoutingOptimizer` · `DNSOptimizer` | aplicam os ajustes de encaminhamento e de resolução de nomes |
| `ComparisonRunner` | corre a mesma medição antes e depois, para o ganho ser um número e não uma sensação |
| `BackupManager` | guarda o estado anterior de tudo o que é alterado, e sabe repô-lo |
| `OptimizationEngine` | orquestra o que é aplicado, em que ordem, e o que fazer se um passo falhar |

Nove ecrãs: análise, otimizações, rotas, comparação, perfis, cópias de segurança, registo,
manual e sobre.

## Porque é que o `BackupManager` existe

Uma ferramenta que altera a configuração de rede de alguém e não sabe voltar atrás não é uma
otimização — é um risco. Cada alteração é registada com o valor anterior antes de ser aplicada,
e qualquer uma pode ser revertida individualmente ou toda de uma vez.

O mesmo princípio vale para o `ComparisonRunner`: sem medir os dois lados, "melhorou" é opinião.

## Sondas nativas, sem binários externos

`traceroute`, resolução de DNS, tabela de conexões e lista de processos são implementados
diretamente em `src/native/`, em vez de invocar utilitários do sistema e interpretar a saída
em texto. Sai mais trabalho, mas evita depender do formato de saída de ferramentas que mudam
entre versões do Windows e entre idiomas do sistema.

## Stack

Electron · React · TypeScript · Vite · Tailwind — ESLint e Prettier configurados,
testes em `src/services/__tests__`.

## Correr localmente

```bash
npm install
npm run dev      # Vite + Electron em modo de desenvolvimento
npm run build    # empacota
npm test         # testes dos serviços
```

## O que falta

- Instalador assinado e publicado (o `electron-builder` já está configurado)
- Cobertura de testes além de `DNSOptimizer` e `Logger`
- Validação em máquinas e ligações diferentes da minha

## Segurança

Nenhum ajuste toca em ficheiros do jogo nem em memória de processos — só em definições de rede
do sistema operativo, todas reversíveis. Nada é enviado para fora da máquina.

---

MIT · [Pedro Ramos](https://github.com/pdramos)
