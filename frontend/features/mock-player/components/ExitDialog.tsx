'use client';

/**
 * Mock Player — ExitDialog
 *
 * Prompts the student with a confirmation dialog before leaving the test.
 * Warns that the timer is server-authoritative and will continue counting down.
 *
 * Uses @radix-ui/react-dialog for complete keyboard trap, accessibility,
 * and backdrop overlay styling.
 */

import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ExitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ExitDialog({ isOpen, onOpenChange, onConfirm }: ExitDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations('player');

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150" />

        {/* Dialog Content */}
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50',
            '-translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)] max-w-sm',
            'bg-white rounded-2xl shadow-2xl border border-slate-100 p-6',
            'focus:outline-none',
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            cancelRef.current?.focus(); // Focus on Cancel button first for safety
          }}
        >
          <Dialog.Title className="text-lg font-bold text-slate-800">
            {t('exit_dialog_title')}
          </Dialog.Title>

          <Dialog.Description className="mt-2 text-sm text-slate-500">
            {t('exit_dialog_desc')}
          </Dialog.Description>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {/* Cancel (Safe choice, auto-focused) */}
            <Dialog.Close asChild>
              <button
                ref={cancelRef}
                type="button"
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700',
                  'hover:bg-slate-50 transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                )}
              >
                {t('exit_cancel')}
              </button>
            </Dialog.Close>

            {/* Confirm exit */}
            <button
              type="button"
              onClick={onConfirm}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white',
                'hover:bg-red-500 active:bg-red-700 transition-colors duration-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500',
              )}
            >
              {t('exit_confirm')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
