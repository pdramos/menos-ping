/**
 * Default configuration for Menos Ping
 */

import type {
  NetworkOptimizationSettings,
  DNSOptimizationSettings,
  RoutingOptimizationSettings,
  OptimizationProfile,
} from '@types/index'

// ============================================================================
// Application Configuration
// ============================================================================

export const APP_CONFIG = {
  name: 'Menos Ping',
  version: '0.1.0',
  author: 'Gaming Network Optimization Team',
  repository: 'https://github.com/pepevapovapo/menos-ping',
  supportEmail: 'support@menospingapp.com',
  checkForUpdatesOnStartup: true,
  updateCheckInterval: 3600000, // 1 hour
  enableTelemetry: true,
  telemetryEndpoint: 'https://telemetry.menospingapp.com',
  crashReportingEnabled: true,
}

// ============================================================================
// Network Monitoring Configuration
// ============================================================================

export const NETWORK_MONITOR_CONFIG = {
  // Ping/latency monitoring
  pingInterval: 1000, // milliseconds
  pingTimeout: 5000,
  pingCount: 4,
  pingProtocol: 'icmp' as const, // or 'tcp', 'udp'
  pingTargets: [
    '8.8.8.8', // Google DNS
    '1.1.1.1', // Cloudflare DNS
    '208.67.222.222', // OpenDNS
  ],

  // Jitter calculation
  jitterSampleSize: 60, // samples
  jitterThreshold: 30, // milliseconds

  // Packet loss detection
  enablePacketLossDetection: true,
  packetLossSampleSize: 100,

  // Route tracing
  enableRouteTracing: true,
  routeTraceInterval: 300000, // 5 minutes
  maxHops: 30,

  // Storage
  maxHistorySize: 10000, // data points
  historyRetention: 86400000, // 24 hours
}

// ============================================================================
// Default Network Optimization Settings
// ============================================================================

export const DEFAULT_NETWORK_OPTIMIZATION: NetworkOptimizationSettings = {
  tcp_buffer_size: 1048576, // 1MB
  udp_buffer_size: 524288, // 512KB
  tcp_nodelay: true,
  enable_congestion_control: true,
  congestion_algorithm: 'bbr',
  mtu_size: 1500,
  window_scaling: true,
  selective_ack: true,
}

// ============================================================================
// Default DNS Optimization Settings
// ============================================================================

export const DEFAULT_DNS_OPTIMIZATION: DNSOptimizationSettings = {
  enable_caching: true,
  cache_size: 10000, // entries
  cache_ttl: 300, // 5 minutes
  preferred_dns_servers: [
    '8.8.8.8',
    '8.8.4.4', // Google DNS (with backup)
    '1.1.1.1', // Cloudflare (fallback)
  ],
  enable_dns_over_https: true,
  validate_responses: true,
  failover_enabled: true,
}

// ============================================================================
// Default Routing Optimization Settings
// ============================================================================

export const DEFAULT_ROUTING_OPTIMIZATION: RoutingOptimizationSettings = {
  enable_auto_optimization: true,
  use_best_route: true,
  analyze_isp_peering: true,
  enable_connection_pooling: true,
  timeout_seconds: 30,
}

// ============================================================================
// Default Optimization Profile
// ============================================================================

export const DEFAULT_OPTIMIZATION_PROFILE: OptimizationProfile = {
  id: 'default',
  name: 'Default Optimization',
  description: 'Default optimization profile for gaming',
  enabled: true,
  network_settings: DEFAULT_NETWORK_OPTIMIZATION,
  dns_settings: DEFAULT_DNS_OPTIMIZATION,
  routing_settings: DEFAULT_ROUTING_OPTIMIZATION,
  apply_to_all_games: true,
  target_games: [],
}

// ============================================================================
// Game Detection Configuration
// ============================================================================

export const GAME_DETECTION_CONFIG = {
  // Process monitoring
  monitorInterval: 1000, // milliseconds
  networkActivityThreshold: 10000, // bytes per second

  // Game profiles directory
  profilesDir: '~/.menospingapp/profiles',
  autoLearnNewGames: true,

  // Supported games (will be expanded)
  supportedGames: [
    {
      name: 'Valorant',
      executables: ['valorant.exe', 'vprotect.exe'],
      protocol_hints: ['udp'],
    },
    {
      name: 'CS2',
      executables: ['cs2.exe'],
      protocol_hints: ['udp'],
    },
    {
      name: 'Fortnite',
      executables: ['FortniteClient-Win64-Shipping.exe'],
      protocol_hints: ['udp'],
    },
    {
      name: 'Dota 2',
      executables: ['dota2.exe'],
      protocol_hints: ['udp', 'tcp'],
    },
    {
      name: 'League of Legends',
      executables: ['LeagueClientUx.exe', 'LeagueClient.exe'],
      protocol_hints: ['udp', 'tcp'],
    },
  ],
}

// ============================================================================
// UI/UX Configuration
// ============================================================================

export const UI_CONFIG = {
  // Dashboard refresh rate
  dashboardRefreshInterval: 1000, // milliseconds
  graphUpdateInterval: 5000, // milliseconds

  // Chart settings
  chartHistoryLength: 300, // 5 minutes of data
  chartPointSize: 4,
  chartLineWidth: 2,

  // Notifications
  enableNotifications: true,
  notificationDuration: 5000, // milliseconds
  lowLatencyThreshold: 50, // ms (green)
  mediumLatencyThreshold: 100, // ms (yellow)
  highLatencyThreshold: 150, // ms (red)
}

// ============================================================================
// Logging Configuration
// ============================================================================

export const LOGGING_CONFIG = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  maxFileSize: 10485760, // 10MB
  maxFiles: 10,
  logsDir: '~/.menospingapp/logs',
  enableConsoleOutput: process.env.NODE_ENV === 'development',
  enableFileOutput: true,
}

// ============================================================================
// Performance Configuration
// ============================================================================

export const PERFORMANCE_CONFIG = {
  // Memory targets
  maxMemoryUsage: 104857600, // 100MB
  gcInterval: 300000, // 5 minutes

  // CPU targets
  maxCpuUsage: 5, // percent

  // Latency impact targets
  maxLatencyImpact: 1, // milliseconds
}

// ============================================================================
// Security Configuration
// ============================================================================

export const SECURITY_CONFIG = {
  // Update verification
  signedUpdatesRequired: true,
  updateServerUrl: 'https://updates.menospingapp.com',
  publicKeyFingerprint: 'SHA256:placeholder', // Will be replaced with actual key

  // Privilege escalation
  enableUAC: true, // Windows
  requireSudo: true, // Linux/macOS

  // Data privacy
  enableCrashReporting: false, // Opt-in only
  enableAnonymousTelemetry: false, // Opt-in only
  dataRetentionDays: 30,
}

// ============================================================================
// API Endpoints
// ============================================================================

export const API_ENDPOINTS = {
  updates: 'https://api.menospingapp.com/v1/updates',
  telemetry: 'https://telemetry.menospingapp.com/v1/events',
  crashReports: 'https://crashes.menospingapp.com/v1/reports',
  feedbackForm: 'https://api.menospingapp.com/v1/feedback',
}

// ============================================================================
// External Services Configuration
// ============================================================================

export const EXTERNAL_SERVICES = {
  // DNS services for DNS optimization
  dnsServers: {
    google: ['8.8.8.8', '8.8.4.4'],
    cloudflare: ['1.1.1.1', '1.0.0.1'],
    opendns: ['208.67.222.222', '208.67.220.220'],
    quad9: ['9.9.9.9', '149.112.112.112'],
  },

  // Latency testing endpoints
  latencyTestHosts: [
    'google.com',
    'cloudflare.com',
    'amazon.com',
    'microsoft.com',
    'github.com',
  ],

  // ISP peering information (public databases)
  ispPeeringApi: 'https://api.asn.cymru.com/v1',
}

export default {
  APP_CONFIG,
  NETWORK_MONITOR_CONFIG,
  DEFAULT_NETWORK_OPTIMIZATION,
  DEFAULT_DNS_OPTIMIZATION,
  DEFAULT_ROUTING_OPTIMIZATION,
  DEFAULT_OPTIMIZATION_PROFILE,
  GAME_DETECTION_CONFIG,
  UI_CONFIG,
  LOGGING_CONFIG,
  PERFORMANCE_CONFIG,
  SECURITY_CONFIG,
  API_ENDPOINTS,
  EXTERNAL_SERVICES,
}
