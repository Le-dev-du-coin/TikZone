"use client";

import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export default function WhatsAppSupportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const phoneNumber = "+22399281899";
  const waUrl = "https://wa.me/22399281899?text=Bonjour%20TikZone%2C%20j%27ai%20besoin%20d%27assistance%20technique";

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 print:hidden font-sans">
      {/* Popover Bubble */}
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl w-72 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Support TikZone</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
            Un problème de connexion, de VPN ou besoin d'assistance pour configurer votre routeur MikroTik ?
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Discuter sur WhatsApp</span>
          </a>
          <div className="mt-2 text-center">
            <span className="text-[11px] text-slate-400 font-mono">{phoneNumber}</span>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white py-3 px-4 rounded-full shadow-lg shadow-emerald-500/30 transition-all duration-200 focus:outline-hidden focus:ring-4 focus:ring-emerald-400/30 cursor-pointer"
        aria-label="Contacter le support WhatsApp TikZone"
      >
        <MessageCircle className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110" />
        <span className="text-xs font-bold whitespace-nowrap hidden sm:inline-block">
          Support WhatsApp
        </span>
        {/* Pulsing notification dot */}
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600 border-2 border-white dark:border-slate-950"></span>
        </span>
      </button>
    </div>
  );
}
