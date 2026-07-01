/**
 * Real multi-record DNS lookups for the diagnostic Tools page.
 * Every field returned is a genuine resolver response (or a genuine error
 * code like ETIMEOUT/ENOTFOUND) - never fabricated.
 */

import dns from 'dns'

const resolver = dns.promises

export interface DNSLookupResult {
  domain: string
  records: {
    A?: string[]
    AAAA?: string[]
    MX?: { exchange: string; priority: number }[]
    NS?: string[]
    TXT?: string[][]
    CNAME?: string[]
  }
  errors: Record<string, string>
}

export async function performDNSLookup(domain: string): Promise<DNSLookupResult> {
  const records: DNSLookupResult['records'] = {}
  const errors: Record<string, string> = {}

  const tasks: Array<[keyof DNSLookupResult['records'], () => Promise<any>]> = [
    ['A', () => resolver.resolve4(domain)],
    ['AAAA', () => resolver.resolve6(domain)],
    ['MX', () => resolver.resolveMx(domain)],
    ['NS', () => resolver.resolveNs(domain)],
    ['TXT', () => resolver.resolveTxt(domain)],
    ['CNAME', () => resolver.resolveCname(domain)],
  ]

  for (const [type, fn] of tasks) {
    try {
      records[type] = await fn()
    } catch (error: any) {
      errors[type] = error.code || error.message || 'UNKNOWN_ERROR'
    }
  }

  return { domain, records, errors }
}
