import React, { useState } from 'react';
import { Smartphone, Laptop, Coffee, X, Check, Copy, Send } from 'lucide-react';
import { audio } from '../utils/audio';

interface ServiceItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  actionText: string;
  tag: string;
  description: string;
  url?: string;
  items: {
    name: string;
    detail: string;
    price?: string;
    url?: string;
  }[];
}

const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'recargas',
    title: 'RECARGAS',
    category: '📱 MOVIL & JUEGOS',
    icon: <Smartphone className="w-5 h-5" />,
    actionText: 'RECARGAR →',
    tag: 'INSTANTANEO',
    description: 'Recargas electrónicas de saldo y combos para todas las operadoras y videojuegos.',
    url: 'https://www.tecnoicymi.com/proyectos/recargasMoviles',
    items: [
      { name: 'Claro / Movistar / Tuenti', detail: 'Paquetes de datos, llamadas ilimitadas y saldo directo.', price: 'Desde $1.00', url: '' },
      { name: 'CNT Móvil & Fijo', detail: 'Recargas nacionales y planes prepago.', price: 'Desde $2.00', url: '' },
      { name: 'PlayStation / Xbox / Steam', detail: 'Tarjetas de regalo digitales para canjear saldo.', price: 'Códigos oficiales', url: '' },
    ],
  },
  {
    id: 'licencias',
    title: 'LICENCIAS',
    category: '💻 SOFTWARE & STREAMING',
    icon: <Laptop className="w-5 h-5" />,
    actionText: 'VER LICENCIAS →',
    tag: 'ORIGINAL',
    description: 'Licencias originales de por vida para Windows, Office y suscripciones digitales.',
    url: 'https://www.tecnoicymi.com/proyectos/licencias',
    items: [
      { name: 'Windows 11 / 10 Pro', detail: 'Licencia OEM/Retail digital permanente, soporte Microsoft.', price: '$12.00', url: '' },
      { name: 'Microsoft Office 365 / 2021', detail: 'Activación para PC/Mac, Word, Excel, PowerPoint y 1TB OneDrive.', price: '$18.00', url: '' },
      { name: 'Antivirus ESET / Kaspersky', detail: 'Protección integral contra malware y ransomware 1 año.', price: '$15.00', url: '' },
      { name: 'Spotify / Netflix / Disney+', detail: 'Cuentas y perfiles renovables con garantía completa.', price: 'Consultar promo', url: '' },
    ],
  },
  {
    id: 'cafe',
    title: 'INVITAME UN CAFE',
    category: '☕ COMUNIDAD TECNOICYMI',
    icon: <Coffee className="w-5 h-5" />,
    actionText: 'INVITAR CAFE →',
    tag: 'DONACION',
    description: 'Apoya el desarrollo de juegos retro minimalistas y proyectos libres de TECNOICYMI.',
    url: 'https://www.paypal.com/ncp/payment/2FS8SD7C4H8CE',
    items: [
      { name: 'Café Corto ☕', detail: 'Un impulso de cafeína para escribir más código limpio.', price: '$2.00', url: '' },
    ],
  },
];

export const ServicesSection: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ServiceItem | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleServiceClick = (service: ServiceItem) => {
    audio.playBeep(600, 0.05, 'square', 0.1);
    if (service.url && service.url.trim() !== '') {
      if (service.url.startsWith('mailto:')) {
        window.location.href = service.url;
      } else {
        window.open(service.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    setActiveModal(service);
  };

  const handleCloseModal = () => {
    audio.playBeep(350, 0.05, 'triangle', 0.1);
    setActiveModal(null);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    audio.playBeep(880, 0.08, 'sine', 0.15);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleItemAction = (service: ServiceItem, item: { name: string; detail: string; price?: string; url?: string }) => {
    audio.playBeep(700, 0.05, 'square', 0.1);
    if (item.url && item.url.trim() !== '') {
      if (item.url.startsWith('mailto:')) {
        window.location.href = item.url;
      } else {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    openWhatsApp(service.title, item.name);
  };

  const openWhatsApp = (serviceTitle: string, itemDetail?: string) => {
    const text = encodeURIComponent(
      `¡Hola TECNOICYMI! Vengo desde el juego Boxeo🥊 y deseo consultar sobre: ${serviceTitle}${itemDetail ? ` (${itemDetail})` : ''}.`
    );
    window.open(`https://wa.me/593982541923?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <section id="services" className="w-full max-w-4xl mx-auto px-4 py-8 border-t-2 border-[#535353] border-dashed">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-sm sm:text-base font-pixel text-[#222222] tracking-wider mb-2">
          ▼ DESCUBRE TECNOICYMI ▼
        </h2>
        <p className="text-xs font-pixel text-[#777777]">
          SERVICIOS DIGITALES & SOLUCIONES TECNOLOGICAS
        </p>
      </div>

      {/* Minimalist 3-Option Video Game Menu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SERVICES_DATA.map((service) => (
          <button
            key={service.id}
            onClick={() => handleServiceClick(service)}
            className="group text-left p-4 bg-transparent border-2 border-[#535353] hover:bg-[#535353] hover:text-[#f7f7f7] transition-colors flex flex-col justify-between cursor-pointer active:translate-y-0.5"
          >
            <div>
              <div className="flex items-center justify-between mb-3 text-xs font-pixel">
                <span className="text-xs opacity-75">{service.category}</span>
                <span className="text-[10px] px-1 py-0.5 border border-current">
                  {service.tag}
                </span>
              </div>
              <div className="text-base font-pixel mb-2 flex items-center gap-2">
                <span>{service.title}</span>
              </div>
              <p className="text-xs font-pixel leading-relaxed opacity-80 mb-4 line-clamp-2">
                {service.description}
              </p>
            </div>

            <div className="text-xs font-pixel font-bold flex items-center justify-between pt-2 border-t border-current">
              <span>{service.actionText}</span>
              <span className="text-sm transform group-hover:translate-x-1 transition-transform">
                ▶
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Minimalist Interactive Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-[#f7f7f7] text-[#222222] border-4 border-[#222222] p-5 sm:p-6 shadow-[8px_8px_0px_0px_#222222] relative animate-in fade-in zoom-in-95 duration-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-[#222222] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-pixel font-bold">
                  {activeModal.title}
                </span>
                <span className="text-[10px] font-pixel px-1.5 py-0.5 bg-[#222222] text-[#f7f7f7]">
                  {activeModal.tag}
                </span>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 border border-[#222222] hover:bg-[#222222] hover:text-[#f7f7f7] transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-pixel text-[#535353] mb-4">
              {activeModal.description}
            </p>

            {/* Catalog Items */}
            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-1">
              {activeModal.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-[#535353] hover:border-[#222222] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex-1">
                    <div className="text-xs font-pixel font-bold text-[#222222]">
                      {item.name}
                    </div>
                    <div className="text-[11px] font-pixel text-[#666666] mt-1">
                      {item.detail}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {item.price && (
                      <span className="text-xs font-pixel font-bold px-1.5 py-0.5 bg-[#f0f0f0] border border-[#ccc]">
                        {item.price}
                      </span>
                    )}
                    <button
                      onClick={() => handleItemAction(activeModal, item)}
                      className="text-[10px] font-pixel px-2.5 py-1.5 bg-[#222222] text-[#f7f7f7] hover:bg-[#444] transition-colors flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <span>{item.url ? 'ABRIR' : 'PEDIR'}</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact / Action footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t-2 border-[#222222]">
              <div className="text-[11px] font-pixel text-[#535353]">
                📩 Atención directa: <span className="font-bold text-[#222]">tecnoicymi.ec@gmail.com</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => openWhatsApp(activeModal.title)}
                  className="flex-1 sm:flex-none text-[10px] font-pixel px-3 py-2 bg-[#222222] text-[#f7f7f7] hover:bg-[#444] transition-colors flex items-center justify-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>WHATSAPP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
