/**
 * Toggle switch matching the FC26 Optimizer emerald-glow switch style.
 */

import React from 'react'

export const Switch: React.FC<{
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}> = ({ checked, onChange, disabled }) => (
  <label className="relative inline-flex w-[42px] h-6 shrink-0 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="peer opacity-0 w-0 h-0"
    />
    <span
      className={`absolute inset-0 rounded-full transition ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${checked ? 'bg-gradient-to-br from-accent to-accent-2' : 'bg-[#26344c]'}
      before:content-[''] before:absolute before:w-[18px] before:h-[18px] before:left-[3px] before:top-[3px] before:bg-white before:rounded-full before:transition-transform
      ${checked ? 'before:translate-x-[18px]' : ''}`}
    />
  </label>
)

export default Switch
