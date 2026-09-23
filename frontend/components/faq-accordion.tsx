"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type FaqItem = {
  question: string;
  answer: string;
};

export default function FaqAccordion({ items, title = "Preguntas frecuentes" }: { items: FaqItem[]; title?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null); // Closed by default

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full py-16 bg-transparent relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#14183e] font-serif-title text-center mb-12">
          {title}
        </h2>

        <div className="space-y-4 divide-y divide-slate-200/80">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="pt-4 first:pt-0">
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="w-full py-4 flex items-center justify-between text-left group focus:outline-none"
                >
                  <span className="text-base sm:text-lg font-bold text-[#14183e] group-hover:text-[#df6951] transition-colors pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#14183e] transition-transform duration-300 shrink-0 ${
                      isOpen ? "rotate-180 text-[#df6951]" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="pb-6 text-slate-600 text-sm sm:text-base leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
