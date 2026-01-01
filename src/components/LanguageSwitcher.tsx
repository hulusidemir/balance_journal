import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`p-2 rounded-md transition-colors ${
          i18n.language === 'en' ? 'bg-gray-700 ring-2 ring-green-500' : 'hover:bg-gray-700'
        }`}
        title="English"
      >
        <span className="text-2xl">🇬🇧</span>
      </button>
      <button
        onClick={() => changeLanguage('tr')}
        className={`p-2 rounded-md transition-colors ${
          i18n.language === 'tr' ? 'bg-gray-700 ring-2 ring-green-500' : 'hover:bg-gray-700'
        }`}
        title="Türkçe"
      >
        <span className="text-2xl">🇹🇷</span>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
