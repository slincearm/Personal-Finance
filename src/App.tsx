import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Globe } from 'lucide-react';
import { type ExpenseItem, type StockItem } from './types';
import { useLocalStorage } from './useLocalStorage';

// Utility for generating unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

function App() {
  const { t, i18n } = useTranslation();

  // Language toggle
  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'zh-TW' ? 'en' : 'zh-TW');
  };

  // State
  const [income, setIncome] = useLocalStorage<number>('finance-income', 50000);

  const [fixedExpenses, setFixedExpenses] = useLocalStorage<ExpenseItem[]>('finance-fixed', [
    { id: '1', name: '房租 / Rent', amount: 15000 }
  ]);

  const [insuranceExpenses, setInsuranceExpenses] = useLocalStorage<ExpenseItem[]>('finance-insurance', [
    { id: '1', name: '醫療險 / Health Ins.', amount: 2000 }
  ]);

  const [twStockPercent, setTwStockPercent] = useLocalStorage<number>('finance-tw-stock-pct', 70);
  const usStockPercent = 100 - twStockPercent; // Computed

  const [twStocks, setTwStocks] = useLocalStorage<StockItem[]>('finance-tw-stocks', []);
  const [usStocks, setUsStocks] = useLocalStorage<StockItem[]>('finance-us-stocks', []);

  // Calculation Logic
  const {
    fixedTotal,
    insuranceTotal,
    disposable,
    investment,
    travel,
    living,
    twStockAmount,
    usStockAmount
  } = useMemo(() => {
    const fixedTotal = fixedExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const insuranceTotal = insuranceExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);

    const disposable = Math.max(0, income - fixedTotal - insuranceTotal);

    const investment = Math.floor(disposable * 0.55);
    const travel = Math.floor(disposable * 0.10);
    const living = Math.floor(disposable * 0.35);

    const twStockAmount = Math.floor(investment * (twStockPercent / 100));
    const usStockAmount = investment - twStockAmount; // Ensures exact total

    return {
      fixedTotal,
      insuranceTotal,
      disposable,
      investment,
      travel,
      living,
      twStockAmount,
      usStockAmount
    };
  }, [income, fixedExpenses, insuranceExpenses, twStockPercent]);

  // Handlers
  const addExpense = (setter: React.Dispatch<React.SetStateAction<ExpenseItem[]>>) => {
    setter(prev => [...prev, { id: generateId(), name: '', amount: 0 }]);
  };

  const updateExpense = (
    setter: React.Dispatch<React.SetStateAction<ExpenseItem[]>>,
    id: string,
    field: keyof ExpenseItem,
    value: string | number
  ) => {
    setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeExpense = (setter: React.Dispatch<React.SetStateAction<ExpenseItem[]>>, id: string) => {
    setter(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-[100svh] w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            {t('app_title')}
          </h1>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200 dark:ring-slate-700"
          >
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">{i18n.language === 'zh-TW' ? 'EN' : '中文'}</span>
          </button>
        </header>

        {/* Top Cards: Income & Core Deductions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Income Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {t('income')}
            </h2>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
              <input
                type="number"
                value={income || ''}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-xl font-bold"
              />
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">{t('disposable')}</p>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                ${disposable.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Allocations Overview Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center gap-4">
            <AllocationRow label={t('investment')} amount={investment} percent="55%" color="blue" />
            <AllocationRow label={t('living')} amount={living} percent="35%" color="amber" />
            <AllocationRow label={t('travel')} amount={travel} percent="10%" color="purple" />
          </div>

        </div>

        {/* Expenses Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ExpenseCard
            title={t('fixed_expenses')}
            total={fixedTotal}
            items={fixedExpenses}
            setItems={setFixedExpenses}
            t={t}
            color="rose"
            addExpense={addExpense}
            updateExpense={updateExpense}
            removeExpense={removeExpense}
          />
          <ExpenseCard
            title={t('insurance_expenses')}
            total={insuranceTotal}
            items={insuranceExpenses}
            setItems={setInsuranceExpenses}
            t={t}
            color="rose"
            addExpense={addExpense}
            updateExpense={updateExpense}
            removeExpense={removeExpense}
          />
        </div>

        {/* Investment Details Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {t('investment')} Details
            </h2>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">${investment.toLocaleString()}</span>
          </div>

          {/* Allocation Slider */}
          <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-4">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-blue-600 dark:text-blue-400">{t('tw_stock')} {twStockPercent}%</span>
              <span className="text-indigo-600 dark:text-indigo-400">{t('us_stock')} {usStockPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={twStockPercent}
              onChange={(e) => setTwStockPercent(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StockCard
              title={t('tw_stock')}
              budget={twStockAmount}
              items={twStocks}
              setItems={setTwStocks}
              t={t}
              color="blue"
              addExpense={addExpense}
              updateExpense={updateExpense}
              removeExpense={removeExpense}
            />
            <StockCard
              title={t('us_stock')}
              budget={usStockAmount}
              items={usStocks}
              setItems={setUsStocks}
              t={t}
              color="indigo"
              addExpense={addExpense}
              updateExpense={updateExpense}
              removeExpense={removeExpense}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponents for cleaner code
function AllocationRow({ label, amount, percent, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colorMap[color]}`}>{percent}</span>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-lg font-bold">${amount.toLocaleString()}</span>
    </div>
  );
}

function ExpenseCard({ title, total, items, setItems, t, color, addExpense, updateExpense, removeExpense }: any) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-${color}-500`}></span>
          {title}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
            ${total.toLocaleString()}
          </span>
          <button
            onClick={() => addExpense(setItems)}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-slate-700 dark:hover:bg-rose-900/30 transition-colors"
            title={t('add_item')}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input
              type="text"
              placeholder={t('name')}
              value={item.name}
              onChange={(e) => updateExpense(setItems, item.id, 'name', e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-rose-500 outline-none text-sm transition-all"
            />
            <input
              type="number"
              placeholder={t('amount')}
              value={item.amount || ''}
              onChange={(e) => updateExpense(setItems, item.id, 'amount', Number(e.target.value))}
              className="w-24 md:w-32 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-rose-500 outline-none text-sm transition-all text-right"
            />
            <button
              onClick={() => removeExpense(setItems, item.id)}
              className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              title={t('delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-center text-slate-400 py-4 italic border border-dashed rounded-lg border-slate-200 dark:border-slate-700">No items</p>
        )}
      </div>
    </div>
  );
}

function StockCard({ title, budget, items, setItems, t, color, addExpense, updateExpense, removeExpense }: any) {
  const currentTotal = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  const remaining = budget - currentTotal;

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">{title}</h3>
        <button
          onClick={() => addExpense(setItems)}
          className={`p-1 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:text-${color}-500 transition-colors`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input
              type="text"
              placeholder={t('name')}
              value={item.name}
              onChange={(e) => updateExpense(setItems, item.id, 'name', e.target.value)}
              className={`flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-${color}-500 outline-none text-sm transition-all`}
            />
            <input
              type="number"
              placeholder={t('amount')}
              value={item.amount || ''}
              onChange={(e) => updateExpense(setItems, item.id, 'amount', Number(e.target.value))}
              className={`w-20 md:w-28 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-${color}-500 outline-none text-sm transition-all text-right`}
            />
            <button
              onClick={() => removeExpense(setItems, item.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-center text-slate-400 py-3 italic">No individual stocks configured</p>
        )}
      </div>

      <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-200 dark:border-slate-700">
        <span className="text-slate-500 dark:text-slate-400">Total Allocated: ${currentTotal.toLocaleString()}</span>
        <span className={`font-medium ${remaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          Rem: ${remaining.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default App;
