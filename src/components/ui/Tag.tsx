/**
 * Small pill badge used for optimization impact/status tags.
 */

import React from 'react'

export type TagVariant = 'high' | 'medium' | 'low' | 'caution' | 'admin' | 'applied'

const VARIANT_CLASSES: Record<TagVariant, string> = {
  high: 'bg-accent/[0.14] text-accent',
  medium: 'bg-info/[0.14] text-info',
  low: 'bg-muted/[0.14] text-muted',
  caution: 'bg-warn/[0.16] text-warn',
  admin: 'bg-danger/[0.14] text-danger',
  applied: 'bg-accent/[0.18] text-accent',
}

export const Tag: React.FC<{ variant: TagVariant; children: React.ReactNode }> = ({
  variant,
  children,
}) => (
  <span
    className={`text-[9.5px] font-extrabold px-[7px] py-0.5 rounded-full uppercase tracking-wide ${VARIANT_CLASSES[variant]}`}
  >
    {children}
  </span>
)

export default Tag
