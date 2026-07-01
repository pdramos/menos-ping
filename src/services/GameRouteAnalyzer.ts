/**
 * Analyses the REAL network route between this machine and the game servers
 * you're actually connected to. This is the honest, infrastructure-free core
 * of a "GPN": it can't reroute your traffic through a private backbone (that
 * needs paid relay servers worldwide), but it CAN tell you exactly where the
 * latency/packet-loss on your current route comes from - which is what
 * decides whether rerouting would even help.
 *
 * Every number comes from a real traceroute and a real IP-to-ASN lookup
 * (Team Cymru's public DNS service). Nothing here is simulated.
 *
 * Main process only (shells out, uses dns).
 */

import dns from 'dns'
import type {
  GameRouteHop,
  GameRouteReport,
  GameServerRoute,
  RouteVerdict,
} from '@types/index'
import { getLogger } from '@services/Logger'
import { runTraceroute } from '@native/traceroute'
import { listActiveConnections, isPublicRemote } from '@native/connections'
import GameDetector from '@services/GameDetector'

const logger = getLogger('GameRouteAnalyzer')
const resolver = dns.promises

// A traceroute is slow (~10-30s), so cap how many servers we trace per scan.
const MAX_SERVERS_PER_SCAN = 4

class GameRouteAnalyzer {
  private latest: GameRouteReport | null = null
  private listeners: Set<(report: GameRouteReport) => void> = new Set()

  constructor(private gameDetector: GameDetector) {}

  getLatest(): GameRouteReport | null {
    return this.latest
  }

  onReportChanged(listener: (report: GameRouteReport) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setReport(report: GameRouteReport): void {
    this.latest = report
    this.listeners.forEach((l) => l(report))
  }

  /** Auto-detect the servers running games are connected to, then trace each. */
  async scan(): Promise<GameRouteReport> {
    this.setReport({ generatedAt: Date.now(), status: 'detecting', routes: [] })

    try {
      const games = this.gameDetector.getDetectedGames()
      const pidToGame = new Map<number, string>()
      for (const g of games) pidToGame.set(g.pid, g.profile.name)

      const connections = await listActiveConnections()

      // Keep only public remote endpoints belonging to a detected game process.
      const serverToGame = new Map<string, string | null>()
      for (const conn of connections) {
        if (!isPublicRemote(conn.remoteAddress)) continue
        const gameName = pidToGame.get(conn.pid) ?? null
        if (games.length > 0 && gameName === null) continue // tie to detected games when we have them
        if (!serverToGame.has(conn.remoteAddress)) {
          serverToGame.set(conn.remoteAddress, gameName)
        }
      }

      if (games.length === 0) {
        this.setReport({
          generatedAt: Date.now(),
          status: 'no_games',
          routes: [],
          message:
            'Nenhum jogo em execução foi detetado. Abre o jogo e volta a analisar, ou usa a análise manual abaixo com o IP/host do servidor.',
        })
        return this.latest!
      }

      if (serverToGame.size === 0) {
        this.setReport({
          generatedAt: Date.now(),
          status: 'no_servers',
          routes: [],
          message:
            'Jogo detetado, mas não foi possível identificar automaticamente o servidor (jogos por UDP muitas vezes não expõem o destino ao sistema). Usa a análise manual com o IP/host do servidor.',
        })
        return this.latest!
      }

      const servers = Array.from(serverToGame.entries()).slice(0, MAX_SERVERS_PER_SCAN)
      const routes: GameServerRoute[] = []

      this.setReport({ generatedAt: Date.now(), status: 'tracing', routes: [] })

      for (const [server, gameName] of servers) {
        const route = await this.analyzeServer(server, gameName)
        routes.push(route)
        this.setReport({ generatedAt: Date.now(), status: 'tracing', routes: [...routes] })
      }

      this.setReport({ generatedAt: Date.now(), status: 'done', routes })
      return this.latest!
    } catch (error) {
      logger.error('Route scan failed', error)
      this.setReport({
        generatedAt: Date.now(),
        status: 'failed',
        routes: [],
        message: String(error),
      })
      return this.latest!
    }
  }

  /** Analyse a single host the user typed in manually. */
  async analyzeHost(host: string): Promise<GameRouteReport> {
    this.setReport({ generatedAt: Date.now(), status: 'tracing', routes: [] })
    try {
      const route = await this.analyzeServer(host, null)
      this.setReport({ generatedAt: Date.now(), status: 'done', routes: [route] })
      return this.latest!
    } catch (error) {
      logger.error(`Manual route analysis failed for ${host}`, error)
      this.setReport({ generatedAt: Date.now(), status: 'failed', routes: [], message: String(error) })
      return this.latest!
    }
  }

  private async analyzeServer(server: string, gameName: string | null): Promise<GameServerRoute> {
    const trace = await runTraceroute(server)

    const hops: GameRouteHop[] = trace.hops.map((hop) => {
      const valid = hop.samplesMs.filter((s): s is number => s !== null)
      const latency = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
      const loss = ((hop.samplesMs.length - valid.length) / hop.samplesMs.length) * 100
      return {
        hop: hop.hop,
        address: hop.address,
        hostname: hop.hostname,
        latencyMs: latency,
        packetLossPercent: loss,
        isBottleneck: false,
      }
    })

    const responding = hops.filter((h) => h.address !== null && h.latencyMs > 0)
    const totalLatency = responding.length ? responding[responding.length - 1].latencyMs : 0
    const worstHopLatency = responding.length ? Math.max(...responding.map((h) => h.latencyMs)) : 0
    const avgLoss = hops.length ? hops.reduce((s, h) => s + h.packetLossPercent, 0) / hops.length : 0

    // Bottleneck = the responding hop that adds the most latency vs the
    // previous responding hop (the jump), OR the hop with the worst real loss.
    const bottleneck = this.findBottleneck(hops)
    if (bottleneck) bottleneck.isBottleneck = true

    const asnInfo = await this.resolveAsn(server)
    const { verdict, verdictDetail } = this.judge(trace.error, totalLatency, avgLoss, hops, bottleneck)

    return {
      serverAddress: server,
      gameName,
      asn: asnInfo?.asn ?? null,
      country: asnInfo?.country ?? null,
      hops,
      hopCount: hops.length,
      totalLatencyMs: totalLatency,
      worstHopLatencyMs: worstHopLatency,
      avgPacketLossPercent: avgLoss,
      verdict,
      verdictDetail,
    }
  }

  private findBottleneck(hops: GameRouteHop[]): GameRouteHop | null {
    const responding = hops.filter((h) => h.address !== null && h.latencyMs > 0)
    if (responding.length === 0) return null

    // Prefer a hop with genuinely high packet loss (mid-route loss is the
    // clearest sign of a bad peering point).
    const lossy = responding.filter((h) => h.packetLossPercent >= 20)
    if (lossy.length > 0) {
      return lossy.reduce((worst, h) => (h.packetLossPercent > worst.packetLossPercent ? h : worst))
    }

    // Otherwise, the biggest single latency jump between consecutive hops.
    let biggestJump = 0
    let bottleneck: GameRouteHop | null = null
    for (let i = 1; i < responding.length; i++) {
      const jump = responding[i].latencyMs - responding[i - 1].latencyMs
      if (jump > biggestJump) {
        biggestJump = jump
        bottleneck = responding[i]
      }
    }
    // Only call it a bottleneck if the jump is meaningfully large.
    return biggestJump >= 30 ? bottleneck : null
  }

  private judge(
    error: string | undefined,
    totalLatency: number,
    avgLoss: number,
    hops: GameRouteHop[],
    bottleneck: GameRouteHop | null
  ): { verdict: RouteVerdict; verdictDetail: string } {
    if (error || hops.length === 0) {
      return {
        verdict: 'unknown',
        verdictDetail:
          error === 'traceroute/tracert is not installed on this system'
            ? 'Traceroute indisponível neste sistema.'
            : 'Não foi possível traçar a rota até este servidor.',
      }
    }

    const hasHeavyLoss = avgLoss > 5 || hops.some((h) => h.packetLossPercent >= 20)

    if (hasHeavyLoss || totalLatency > 200) {
      const where = bottleneck
        ? ` O gargalo está no salto ${bottleneck.hop} (${bottleneck.address}).`
        : ''
      return {
        verdict: 'problematic',
        verdictDetail:
          `Rota com problemas: ${totalLatency.toFixed(0)}ms e ${avgLoss.toFixed(1)}% de perda média.${where}` +
          ' Aqui um relay/GPN com melhor peering PODERIA ajudar.',
      }
    }

    if (totalLatency > 80 || avgLoss > 1 || bottleneck) {
      const where = bottleneck ? ` Maior salto de latência no salto ${bottleneck.hop} (${bottleneck.address}).` : ''
      return {
        verdict: 'suboptimal',
        verdictDetail: `Rota razoável: ${totalLatency.toFixed(0)}ms de latência.${where}`,
      }
    }

    return {
      verdict: 'healthy',
      verdictDetail:
        `Rota saudável: ${totalLatency.toFixed(0)}ms até ao servidor, sem perda significativa.` +
        ' A tua ligação já está bem encaminhada - um GPN daria pouco ou nenhum ganho.',
    }
  }

  private async resolveAsn(ip: string): Promise<{ asn: string; country: string } | null> {
    // IPv4 only for the Cymru reverse lookup.
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return null
    try {
      const reversed = ip.split('.').reverse().join('.')
      const txt = await resolver.resolveTxt(`${reversed}.origin.asn.cymru.com`)
      const raw = txt[0]?.[0]
      if (!raw) return null
      // "ASN | prefix | country | registry | date"
      const [asn, , country] = raw.split('|').map((s) => s.trim())
      return { asn: `AS${asn}`, country }
    } catch {
      return null
    }
  }
}

export default GameRouteAnalyzer
