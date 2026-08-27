/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BoxingGame } from './components/BoxingGame';
import { ServicesSection } from './components/ServicesSection';

export default function App() {
  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#535353] flex flex-col justify-between selection:bg-[#535353] selection:text-[#f7f7f7]">
      {/* Top Main Arena */}
      <main className="w-full flex-1 flex flex-col items-center pt-2 pb-6">
        <BoxingGame />
        <ServicesSection />
      </main>

      {/* Minimal Pixel Footer */}
      <footer className="w-full max-w-4xl mx-auto px-4 py-4 text-center border-t border-[#e0e0e0] text-[10px] font-pixel text-[#888888]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TECNOICYMI © {new Date().getFullYear()} — EXPERIENCIA PIXEL</span>
          <span className="opacity-75">SIN INTERNET, SOLO BOXEO 🥊</span>
        </div>
      </footer>
    </div>
  );
}
