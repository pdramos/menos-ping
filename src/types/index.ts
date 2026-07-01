/**
 * Core type definitions for Menos Ping application
 */

// ============================================================================
// Network Metrics
// ============================================================================

export interface LatencyMetrics {
  ping: number // milliseconds
  min: number
  max: number
  average: number
  stddev: number
  sample_count: number
  timestamp: number
}

export interface JitterMetrics {
  value: number // milliseconds
  trend: 'stable' | 'increasing' | 'decreasing'
  threshold_exceeded: boolean
}

export interface PacketLossMetrics {
  percentage: number // 0-100
  packets_sent: number
  packets_lost: number
  consecutive_losses: number
}

export interface ConnectionQuality {
  score: number // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  latency: LatencyMetrics
  jitter: JitterMetrics
  packet_loss: PacketLossMetrics
  last_update: number
}

// ============================================================================
// Route Information
// ============================================================================

export interface RouteHop {
  hop_number: number
  ip_address: string
  hostname?: string
  latency: number
  packet_loss: number
}

export interface RouteInfo {
  destination: string
  hops: RouteHop[]
  total_latency: number
  stability: number // 0-100
  timestamp: number
}

// ============================================================================
// Game Information
// ============================================================================

export interface GameProfile {
  id: string
  name: string
  executable_path: string
  process_name: string
  enabled: boolean
  optimizations: GameOptimizations
  protocol_hints?: string[] // e.g., ['udp', 'tcp', 'quic']
  priority: number // 1-10, higher = more important
}

export interface GameOptimizations {
  enable_network_priority: boolean
  enable_buffer_optimization: boolean
  enable_dns_optimization: boolean
  enable_route_optimization: boolean
  custom_settings?: Record<string, unknown>
}

export interface DetectedGame {
  profile: GameProfile
  pid: number
  memory_usage: number
  cpu_usage: number
  start_time: number
  network_activity: {
    sent_bytes: number
    received_bytes: number
  }
}

// ============================================================================
// Optimization Settings
// ============================================================================

export interface NetworkOptimizationSettings {
  tcp_buffer_size?: number
  udp_buffer_size?: number
  tcp_nodelay: boolean
  enable_congestion_control: boolean
  congestion_algorithm?: string
  mtu_size?: number
  window_scaling: boolean
  selective_ack: boolean
}

export interface DNSOptimizationSettings {
  enable_caching: boolean
  cache_size: number
  cache_ttl: number
  preferred_dns_servers: string[]
  enable_dns_over_https: boolean
  validate_responses: boolean
  failover_enabled: boolean
}

export interface RoutingOptimizationSettings {
  enable_auto_optimization: boolean
  use_best_route: boolean
  analyze_isp_peering: boolean
  enable_connection_pooling: boolean
  timeout_seconds: number
}

export interface OptimizationProfile {
  id: string
  name: string
  description?: string
  enabled: boolean
  network_settings: NetworkOptimizationSettings
  dns_settings: DNSOptimizationSettings
  routing_settings: RoutingOptimizationSettings
  apply_to_all_games: boolean
  target_games?: string[] // game profile IDs
}

// ============================================================================
// System Information
// ============================================================================

export interface SystemInfo {
  os: 'windows' | 'linux' | 'macos'
  os_version: string
  architecture: 'x64' | 'arm64'
  cpu_cores: number
  total_memory: number
  available_memory: number
}

export interface NetworkInterface {
  name: string
  type: 'ethernet' | 'wifi' | 'vpn' | 'other'
  ip_address?: string
  ipv6_address?: string
  mac_address?: string
  speed?: number // Mbps
  status: 'connected' | 'disconnected'
}

export interface NetworkStatus {
  interfaces: NetworkInterface[]
  primary_interface: NetworkInterface
  dns_servers: string[]
  default_gateway?: string
  connected: boolean
  connection_type: 'ethernet' | 'wifi' | 'vpn' | 'unknown'
  signal_strength?: number // 0-100 for wireless
}

// ============================================================================
// Diagnostics & Logging
// ============================================================================

export interface LogEntry {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  module: string
  message: string
  data?: unknown
}

export interface DiagnosticReport {
  generated_at: number
  system_info: SystemInfo
  network_status: NetworkStatus
  active_optimizations: string[]
  recent_logs: LogEntry[]
  performance_metrics: {
    memory_usage: number
    cpu_usage: number
    uptime: number
  }
}

// ============================================================================
// Update Information
// ============================================================================

export interface UpdateInfo {
  version: string
  release_date: number
  changelog: string
  download_url: string
  file_size: number
  checksum: string
  type: 'patch' | 'minor' | 'major'
  critical: boolean
}

export interface UpdateStatus {
  checking: boolean
  available: boolean
  update_info?: UpdateInfo
  progress: number // 0-100
  status: 'idle' | 'checking' | 'downloading' | 'installing' | 'installed' | 'failed'
  error?: string
}

// ============================================================================
// Application State
// ============================================================================

export interface ApplicationState {
  initialized: boolean
  running: boolean
  current_game?: DetectedGame
  network_status: NetworkStatus
  connection_quality: ConnectionQuality
  active_profile?: OptimizationProfile
  recent_routes: RouteInfo[]
  system_info: SystemInfo
  update_status: UpdateStatus
}

// ============================================================================
// Event Types
// ============================================================================

export type AppEvent =
  | { type: 'game_detected'; payload: DetectedGame }
  | { type: 'game_closed'; payload: string } // game id
  | { type: 'network_changed'; payload: NetworkStatus }
  | { type: 'quality_changed'; payload: ConnectionQuality }
  | { type: 'optimization_applied'; payload: OptimizationProfile }
  | { type: 'route_analyzed'; payload: RouteInfo }
  | { type: 'error'; payload: { module: string; message: string } }
  | { type: 'update_available'; payload: UpdateInfo }
