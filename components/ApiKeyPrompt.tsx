import React from 'react';
import { openApiKeySelection } from '../services/geminiService';

interface ApiKeyPromptProps {
  onKeySelected: () => void;
}

export const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onKeySelected }) => {
  const handleSelectKey = async () => {
    await openApiKeySelection();
    // Assuming success immediately after interaction logic as per guidance to avoid race conditions
    onKeySelected();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#222222] border border-[#333333] rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="mb-6 bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl text-indigo-300">
          🔑
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Требуется доступ</h2>
        <p className="text-slate-400 mb-6">
          Для использования модели <strong>Nano Banana Pro</strong> (Gemini 3 Pro Image) необходимо выбрать API ключ с привязанным платежным аккаунтом.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={handleSelectKey}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-900/50"
          >
            Выбрать API ключ
          </button>
          
          <div className="text-xs text-slate-500">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-indigo-400 underline"
            >
              Информация о биллинге
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};