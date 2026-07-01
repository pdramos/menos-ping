/**
 * Navigation types shared between AppContainer and Sidebar
 */

export type PageName =
  | 'analysis'
  | 'optimizations'
  | 'compare'
  | 'profiles'
  | 'backups'
  | 'manual'
  | 'logs'
  | 'about'

export interface NavItem {
  id: PageName
  label: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'analysis', label: 'Análise', icon: '📊' },
  { id: 'optimizations', label: 'Otimizações', icon: '⚡' },
  { id: 'compare', label: 'Comparar', icon: '🆚' },
  { id: 'profiles', label: 'Perfis', icon: '🎛️' },
  { id: 'backups', label: 'Backups', icon: '💾' },
  { id: 'manual', label: 'Manuais', icon: '📌' },
  { id: 'logs', label: 'Logs', icon: '📝' },
  { id: 'about', label: 'Sobre', icon: '⚙️' },
]
