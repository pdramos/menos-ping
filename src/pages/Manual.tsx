/**
 * Manual recommendations page ("Manuais") - high-impact tips that can't be
 * applied automatically (router, ISP, hardware) but genuinely help latency.
 */

import React from 'react'

interface ManualGroup {
  title: string
  tips: string[]
}

const GROUPS: ManualGroup[] = [
  {
    title: '🔌 Ligação Física',
    tips: [
      'Usa cabo Ethernet em vez de Wi-Fi sempre que possível - o Wi-Fi introduz jitter que nenhuma otimização de software resolve.',
      'Se tiveres de usar Wi-Fi, prefere a banda de 5GHz/6GHz em vez de 2.4GHz - menos interferência de vizinhos.',
      'Evita extensores/repetidores Wi-Fi entre o router e o PC - cada salto extra soma latência.',
    ],
  },
  {
    title: '📡 Router',
    tips: [
      'Ativa QoS (Quality of Service) no router e dá prioridade ao dispositivo/porta que usas para jogar.',
      'Reinicia o router periodicamente - firmwares acumulam estado e degradam com o tempo.',
      'Atualiza o firmware do router - correções de bugs de rede são frequentes.',
      'Coloca o router num local aberto, longe de paredes espessas e de outros aparelhos eletrónicos.',
    ],
  },
  {
    title: '💻 Sistema',
    tips: [
      'Fecha downloads, torrents, backups na cloud (OneDrive/Google Drive) e atualizações em segundo plano antes de jogar.',
      'Atualiza os drivers da placa de rede - drivers desatualizados são uma causa comum de picos de latência.',
      'Desativa o Windows Update durante sessões de jogo (podes reativar depois).',
      'Se outras pessoas em casa fazem streaming/downloads pesados, isso consome a tua largura de banda mesmo com boa otimização de software.',
    ],
  },
  {
    title: '🌍 ISP / Ligação',
    tips: [
      'Testa a que distância (em saltos) estás dos servidores do jogo com a ferramenta de Traceroute nesta app.',
      'Se o teu ISP oferece planos "gaming"/fibra dedicada, normalmente têm melhor peering com os servidores de jogos.',
      'Contacta o teu ISP se veres perda de pacotes consistente num salto específico da rota - pode ser um problema do lado deles.',
    ],
  },
]

export const Manual: React.FC = () => {
  return (
    <section className="animate-view-fade">
      <div className="mb-[18px]">
        <h1 className="text-[22px] tracking-wide">Recomendações Manuais</h1>
      </div>
      <p className="text-muted text-[13.5px] mb-5">
        Otimizações de alto impacto que precisam de ser feitas manualmente (router, ISP,
        hardware). Nenhuma envolve risco de ban - são apenas boas práticas de rede.
      </p>

      <div className="flex flex-col gap-4">
        {GROUPS.map((group) => (
          <div key={group.title} className="bg-panel border border-border rounded-2xl p-4 px-5">
            <h3 className="text-[15px] mb-2.5">{group.title}</h3>
            <ul className="flex flex-col gap-1.5">
              {group.tips.map((tip, i) => (
                <li key={i} className="text-[13px] pl-[22px] relative leading-relaxed">
                  <span className="absolute left-0 text-accent font-black">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Manual
