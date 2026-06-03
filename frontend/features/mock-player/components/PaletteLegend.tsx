'use client';

/**
 * Mock Player — PaletteLegend
 *
 * Static compact key showing all five question states with icon + label.
 * Non-interactive — purely informational.
 *
 * ─── Accessibility ────────────────────────────────────────────────────────────
 *
 *   Each legend row uses a colour swatch + text label. The swatch is
 *   aria-hidden (decorative) so screen readers encounter only the label text.
 *   The containing <dl> (description list) pairs each icon with its meaning,
 *   which gives assistive technology the right semantic.
 *
 *   Color is never the only signal here either — each row includes a
 *   distinct icon or shape glyph, mirroring the QuestionTile WCAG requirement.
 */

import { useTranslations } from 'next-intl';
import { Check, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LegendItem {
  key: string;
  swatchCn: string;      // tile/swatch background + border
  icon: React.ReactNode; // visual glyph (aria-hidden in the tile)
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    key: 'state_not_visited',
    swatchCn: 'bg-slate-100 border-2 border-slate-300',
    icon: <span className="text-slate-400 text-xs leading-none select-none">□</span>,
  },
  {
    key: 'state_visited',
    swatchCn: 'bg-white border-2 border-amber-400',
    icon: <span className="text-amber-500 text-xs leading-none select-none">○</span>,
  },
  {
    key: 'state_answered',
    swatchCn: 'bg-emerald-500 border-2 border-emerald-600',
    icon: <Check className="w-3 h-3 text-white" />,
  },
  {
    key: 'state_marked',
    swatchCn: 'bg-violet-600 border-2 border-violet-700',
    icon: <Flag className="w-3 h-3 text-white" />,
  },
  {
    key: 'legend_state_answered_marked',
    swatchCn: 'bg-violet-600 border-2 border-violet-700',
    icon: (
      <span className="relative flex items-center">
        <Flag className="w-3 h-3 text-white" />
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500">
          <Check className="w-2 h-2 text-white" />
        </span>
      </span>
    ),
  },
];

export function PaletteLegend() {
  const t = useTranslations('player');

  return (
    <section aria-label={t('aria_palette_legend')} className="px-3 py-2">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            {/* Swatch */}
            <span
              className={cn(
                'shrink-0 flex items-center justify-center w-6 h-6 rounded',
                item.swatchCn,
              )}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            {/* Label */}
            <dt className="text-xs text-slate-600 leading-tight">{t(item.key)}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
