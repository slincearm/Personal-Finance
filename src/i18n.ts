import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
const resources = {
  'zh-TW': {
    translation: {
      "app_title": "個人財務規劃 WebApp",
      "income": "每月收入",
      "fixed_expenses": "固定支出",
      "insurance_expenses": "保險支出",
      "disposable": "可支配",
      "investment": "投資",
      "travel": "旅遊",
      "living": "生活費",
      "add_item": "新增項目",
      "tw_stock": "台股",
      "us_stock": "美股",
      "percentage": "百分比",
      "name": "名稱",
      "amount": "金額",
      "delete": "刪除"
    }
  },
  en: {
    translation: {
      "app_title": "Personal Finance WebApp",
      "income": "Monthly Income",
      "fixed_expenses": "Fixed Expenses",
      "insurance_expenses": "Insurance Expenses",
      "disposable": "Disposable",
      "investment": "Investment",
      "travel": "Travel",
      "living": "Living Expenses",
      "add_item": "Add Item",
      "tw_stock": "TW Stocks",
      "us_stock": "US Stocks",
      "percentage": "Percentage",
      "name": "Name",
      "amount": "Amount",
      "delete": "Delete"
    }
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "zh-TW", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
