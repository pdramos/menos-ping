/**
 * About page ("Sobre") - branding, safety note, and app preferences
 * (UI + telemetry), which the FC26 Optimizer doesn't split into a separate
 * Settings page either.
 */

import React, { useEffect, useState } from 'react'

export const About: React.FC = () => {
  const [version, setVersion] = useState('—')
  const [uiSettings, setUISettingsState] = useState({
    theme: 'dark' as 'dark' | 'light',
    alwaysOnTop: false,
    minimizeToTray: true,
    autoStart: false,
  })
  const [telemetry, setTelemetryState] = useState({
    enabled: false,
    crashReporting: false,
    performanceData: false,
  })

  useEffect(() => {
    window.app.getVersion().then(setVersion)
    window.app.config.getUISettings().then(setUISettingsState)
    window.app.config.getTelemetrySettings().then(setTelemetryState)
  }, [])

  const handleUISettingChange = async (key: string, value: unknown) => {
    const updated = { ...uiSettings, [key]: value }
    setUISettingsState(updated)
    await window.app.config.setUISettings(updated)
  }

  const handleTelemetryChange = async (key: string, value: unknown) => {
    const updated = { ...telemetry, [key]: value }
    setTelemetryState(updated)
    await window.app.config.setTelemetrySettings(updated)
  }

  return (
    <section className="animate-view-fade">
      <div className="mb-[18px]">
        <h1 className="text-[22px] tracking-wide">Sobre & Preferências</h1>
      </div>

      <div className="bg-panel border border-border rounded-2xl max-w-[640px] mx-auto text-center p-[18px_20px]">
        <div className="max-w-[260px] mx-auto mb-4 flex flex-col items-center py-3.5 px-1.5 border border-border rounded-2xl bg-[radial-gradient(120px_60px_at_50%_0%,rgba(245,197,66,0.12),transparent)]">
          <span className="text-xs tracking-[6px] text-muted">PEDRO</span>
          <span className="text-[22px] font-black tracking-[4px] bg-gradient-to-r from-gold via-white to-gold bg-clip-text text-transparent">
            RAMOS
          </span>
        </div>
        <h2 className="text-xl">Menos Ping</h2>
        <p className="text-muted mt-1">Otimizador profissional de latência para jogos online.</p>
        <div className="flex items-center justify-center gap-3 my-[18px] flex-wrap">
          <span>
            Versão <b className="text-white">{version}</b>
          </span>
        </div>

        <div className="text-left bg-accent/[0.06] border border-accent/30 rounded-2xl p-4 px-5 mt-3.5">
          <h4 className="text-accent mb-2.5 text-sm">🛡️ Garantia de segurança — 0% risco de ban</h4>
          <ul className="flex flex-col gap-1.5">
            {[
              'Só usa definições oficiais de rede do Windows/Linux/macOS.',
              'Nunca acede à memória de nenhum jogo, nem injeta código, DLLs, hooks ou drivers.',
              'Nunca interage com qualquer anti-cheat.',
              'Tudo é reversível com um clique, com backups automáticos antes de cada mudança.',
            ].map((line) => (
              <li key={line} className="text-[13px] pl-[18px] relative">
                <span className="absolute left-1 text-accent">•</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto mt-4 space-y-4">
        <div className="bg-panel border border-border rounded-2xl p-5">
          <h3 className="text-lg font-bold mb-3.5">Interface</h3>
          <div className="space-y-3">
            <SettingToggle
              label="Sempre Visível"
              description="Mantém a janela acima das outras aplicações"
              value={uiSettings.alwaysOnTop}
              onChange={(value) => handleUISettingChange('alwaysOnTop', value)}
            />
            <SettingToggle
              label="Minimizar para a Bandeja"
              description="Minimiza para a bandeja do sistema em vez da barra de tarefas"
              value={uiSettings.minimizeToTray}
              onChange={(value) => handleUISettingChange('minimizeToTray', value)}
            />
            <SettingToggle
              label="Iniciar com o Sistema"
              description="Inicia o Menos Ping automaticamente ao ligar o computador"
              value={uiSettings.autoStart}
              onChange={(value) => handleUISettingChange('autoStart', value)}
            />
          </div>
        </div>

        <div className="bg-panel border border-border rounded-2xl p-5">
          <h3 className="text-lg font-bold mb-2">Telemetria & Privacidade</h3>
          <p className="text-sm text-muted mb-3.5">
            Ajuda a melhorar o Menos Ping partilhando dados de uso anónimos. Nenhum dado pessoal
            ou de jogo é recolhido.
          </p>
          <div className="space-y-3">
            <SettingToggle
              label="Ativar Telemetria"
              description="Partilhar estatísticas de uso anónimas"
              value={telemetry.enabled}
              onChange={(value) => handleTelemetryChange('enabled', value)}
            />
            <SettingToggle
              label="Relatório de Falhas"
              description="Reportar falhas automaticamente para ajudar a corrigir problemas"
              value={telemetry.crashReporting}
              onChange={(value) => handleTelemetryChange('crashReporting', value)}
            />
            <SettingToggle
              label="Dados de Performance"
              description="Partilhar métricas de performance (latência, resultados de otimização)"
              value={telemetry.performanceData}
              onChange={(value) => handleTelemetryChange('performanceData', value)}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

const SettingToggle: React.FC<{
  label: string
  description?: string
  value: boolean
  onChange: (value: boolean) => void
}> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between p-3.5 bg-panel-2 rounded-[9px]">
    <div className="text-left">
      <div className="font-medium">{label}</div>
      {description && <div className="text-sm text-muted">{description}</div>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 rounded-full transition ${value ? 'bg-accent' : 'bg-[#26344c]'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition mt-1 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
)

export default About
