import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, Trash2, Globe, Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

  // UI State
  const [isDisposableOpen, setIsDisposableOpen] = useLocalStorage<boolean>('finance-disposable-open', true);
  const [isInvestmentOpen, setIsInvestmentOpen] = useLocalStorage<boolean>('finance-investment-open', true);
  const [isExpensesOpen, setIsExpensesOpen] = useLocalStorage<boolean>('finance-expenses-open', true);
  const [isTransferOpen, setIsTransferOpen] = useLocalStorage<boolean>('finance-transfer-open', true);

  // Lock state
  const [isLocked, setIsLocked] = useLocalStorage<boolean>('finance-locked', false);

  // Transfers state
  const [isFixedTransfer, setIsFixedTransfer] = useLocalStorage<boolean>('finance-fixed-transfer', false);
  const [isInsuranceTransfer, setIsInsuranceTransfer] = useLocalStorage<boolean>('finance-insurance-transfer', false);

  // State
  const [income, setIncome] = useLocalStorage<number>('finance-income', 50000);

  const [fixedExpenses, setFixedExpenses] = useLocalStorage<ExpenseItem[]>('finance-fixed', [
    { id: '1', name: '房租 / Rent', amount: 15000 }
  ]);

  const [insuranceExpenses, setInsuranceExpenses] = useLocalStorage<ExpenseItem[]>('finance-insurance', [
    { id: '1', name: '醫療險 / Health Ins.', amount: 2000 }
  ]);

  const [creditLoan, setCreditLoan] = useLocalStorage<number>('finance-credit-loan', 0);
  const [isInvestHalf, setIsInvestHalf] = useLocalStorage<boolean>('finance-invest-half', false);

  const [twStockPercent, setTwStockPercent] = useLocalStorage<number>('finance-tw-stock-pct', 70);
  const usStockPercent = 100 - twStockPercent; // Computed

  const [investmentPercent, setInvestmentPercent] = useLocalStorage<number>('finance-investment-pct', 55);
  const [livingPercent, setLivingPercent] = useLocalStorage<number>('finance-living-pct', 35);
  const [travelPercent, setTravelPercent] = useLocalStorage<number>('finance-travel-pct', 10);

  const [twStocks, setTwStocks] = useLocalStorage<StockItem[]>('finance-tw-stocks', []);
  const [usStocks, setUsStocks] = useLocalStorage<StockItem[]>('finance-us-stocks', []);

  // Modal State for editing percentages
  const [editingPercent, setEditingPercent] = useState<{ id: string, name: string, value: number, setter: (val: number) => void } | null>(null);

  // Calculation Logic
  const {
    fixedTotal,
    insuranceTotal,
    disposable,
    investmentGross,
    investmentNet,
    travel,
    living,
    twStockAmount,
    usStockAmount,
    transfers,
    transferTotal
  } = useMemo(() => {
    const fixedTotal = fixedExpenses.reduce((sum, item) => sum + Math.floor(Number(item.amount) || 0), 0);
    const insuranceTotal = insuranceExpenses.reduce((sum, item) => sum + Math.floor(Number(item.amount) || 0), 0);

    const disposable = Math.max(0, Math.floor(Number(income) || 0) - fixedTotal - insuranceTotal);

    const investmentGross = Math.floor(disposable * (investmentPercent / 100));
    const investmentNet = Math.max(0, investmentGross - Math.floor(Number(creditLoan) || 0));
    const travel = Math.floor(disposable * (travelPercent / 100));
    const living = Math.floor(disposable * (livingPercent / 100));

    const twStockAmount = Math.floor(investmentNet * ((twStockPercent || 0) / 100));
    const usStockAmount = investmentNet - twStockAmount; // Ensures exact total

    // Transfer calculations
    const transfersList: { id: string, name: string, amount: number }[] = [];
    if (creditLoan > 0) transfersList.push({ id: 'credit', name: t('credit_loan'), amount: creditLoan });
    if (twStockAmount > 0) transfersList.push({ id: 'tw_stock', name: t('tw_stock'), amount: twStockAmount });
    if (usStockAmount > 0) transfersList.push({ id: 'us_stock', name: t('us_stock'), amount: usStockAmount });
    if (travel > 0) transfersList.push({ id: 'travel', name: t('travel'), amount: travel });

    if (isFixedTransfer) {
      if (fixedTotal > 0) transfersList.push({ id: 'fixed-total', name: t('fixed_expenses'), amount: fixedTotal });
    } else {
      fixedExpenses.filter(item => item.isTransfer).forEach(item => {
        if (item.amount > 0) transfersList.push({ id: `fixed-${item.id}`, name: item.name || 'Unnamed', amount: item.amount });
      });
    }

    if (isInsuranceTransfer) {
      if (insuranceTotal > 0) transfersList.push({ id: 'insurance-total', name: t('insurance_expenses'), amount: insuranceTotal });
    } else {
      insuranceExpenses.filter(item => item.isTransfer).forEach(item => {
        if (item.amount > 0) transfersList.push({ id: `ins-${item.id}`, name: item.name || 'Unnamed', amount: item.amount });
      });
    }

    const transferTotal = transfersList.reduce((sum, item) => sum + item.amount, 0);

    return {
      fixedTotal,
      insuranceTotal,
      disposable,
      investmentGross,
      investmentNet,
      travel,
      living,
      twStockAmount,
      usStockAmount,
      transfers: transfersList,
      transferTotal
    };
  }, [income, fixedExpenses, insuranceExpenses, twStockPercent, creditLoan, investmentPercent, livingPercent, travelPercent, isFixedTransfer, isInsuranceTransfer, t]);

  // Handlers
  const addExpense = <T extends { id: string, name: string, amount: number, percent?: number }>(setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    setter((prev) => [...prev, { id: generateId(), name: '', amount: 0, percent: 0 } as unknown as T]);
  };

  const updateExpense = <T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: string,
    field: keyof T,
    value: string | number | boolean
  ) => {
    setter((prev) => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeExpense = <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string) => {
    setter((prev) => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-[100svh] w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            {t('app_title')}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200 dark:ring-slate-700 font-medium text-sm ${isLocked
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              title={isLocked ? t('locked') : t('unlocked')}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:shadow-md transition-shadow ring-1 ring-slate-200 dark:ring-slate-700"
            >
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">{i18n.language === 'zh-TW' ? '中文' : 'EN'}</span>
            </button>
          </div>
        </header>

        {/* Top Section: Income */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {t('income')}
          </h2>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={income || ''}
              onChange={(e) => setIncome(Number(e.target.value))}
              readOnly={false} // Income is always editable per requirement
              className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-xl font-bold"
            />
          </div>
        </div>

        {/* Transfers Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div
            className="flex justify-between items-center mb-4 cursor-pointer group select-none"
            onClick={() => setIsTransferOpen(!isTransferOpen)}
          >
            <h2 className="text-xl font-bold flex items-center gap-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              {t('transfers')}
              {isTransferOpen ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </h2>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              ${transferTotal.toLocaleString()}
            </span>
          </div>

          <div className={`transition-all duration-300 overflow-hidden ${isTransferOpen ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700/80">
              {transfers.map((item, index) => (
                <div key={item.id} className={`flex items-center justify-between p-3 transition-colors ${index % 2 === 0 ? 'bg-indigo-50/60 dark:bg-slate-700/60' : 'bg-transparent dark:bg-transparent'}`}>
                  <span className="font-medium text-slate-600 dark:text-slate-300 ml-1">{item.name}</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mr-1">${item.amount.toLocaleString()}</span>
                </div>
              ))}
              {transfers.length === 0 && (
                <p className="text-sm text-center text-slate-400 py-4 italic bg-slate-50 dark:bg-slate-900/50">No transfers</p>
              )}
            </div>
          </div>
        </div>

        {/* Disposable & Allocations Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div
            className="flex justify-between items-center cursor-pointer group select-none mb-0"
            onClick={() => setIsDisposableOpen(!isDisposableOpen)}
          >
            <h2 className="text-xl font-bold flex items-center gap-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              {t('disposable')}
              {isDisposableOpen ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </h2>
            <span className="text-xl font-bold text-teal-600 dark:text-teal-400">${disposable.toLocaleString()}</span>
          </div>

          <div className={`transition-all duration-300 overflow-hidden ${isDisposableOpen ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col gap-2">
              <AllocationRow label={t('investment')} amount={investmentGross} percent={investmentPercent} color="blue" isLocked={isLocked} onClick={() => setEditingPercent({ id: 'investment', name: t('investment'), value: investmentPercent, setter: setInvestmentPercent })} />
              <AllocationRow label={t('living')} amount={living} percent={livingPercent} color="amber" isLocked={isLocked} onClick={() => setEditingPercent({ id: 'living', name: t('living'), value: livingPercent, setter: setLivingPercent })} />
              <AllocationRow label={t('travel')} amount={travel} percent={travelPercent} color="purple" isLocked={isLocked} onClick={() => setEditingPercent({ id: 'travel', name: t('travel'), value: travelPercent, setter: setTravelPercent })} />
            </div>
          </div>
        </div>

        {/* Investment Details Section (Moved below Income) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">

          {/* Main Title Row (Gross Investment) */}
          <div
            className="flex justify-between items-center mb-4 cursor-pointer group select-none"
            onClick={() => setIsInvestmentOpen(!isInvestmentOpen)}
          >
            <h2 className="text-xl font-bold flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {t('investment')}
              {isInvestmentOpen ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </h2>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">${investmentGross.toLocaleString()}</span>
          </div>

          <div className={`transition-all duration-300 overflow-hidden ${isInvestmentOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>

            {/* Credit Loan Edit Row */}
            <div className="flex justify-between items-center p-3 mb-3 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('credit_loan')}</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 text-sm font-medium">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={creditLoan || ''}
                  onChange={(e) => setCreditLoan(Number(e.target.value))}
                  readOnly={isLocked}
                  className={`w-[120px] md:w-[150px] pl-6 pr-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg border-none ring-1 ring-rose-200 dark:ring-rose-800/50 focus:ring-2 focus:ring-rose-400 outline-none transition-all text-right text-sm font-semibold text-rose-600 dark:text-rose-400 ${isLocked ? 'opacity-80 pointer-events-none' : ''}`}
                />
              </div>
            </div>



            {/* Usable Stock Amount (Net Investment) */}
            <div className="flex justify-between items-center p-4 mb-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
              <h3 className="text-base font-bold text-blue-800 dark:text-blue-300">
                {t('usable_stock_amount')}
              </h3>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${investmentNet.toLocaleString()}
              </span>
            </div>

            {/* Allocation Slider */}
            <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-4">
              <div className="flex justify-between text-sm font-medium mb-3">
                <span className="text-blue-600 dark:text-blue-400">{t('tw_stock')} {twStockPercent}%</span>
                <span className="text-indigo-600 dark:text-indigo-400">{t('us_stock')} {usStockPercent}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTwStockPercent(Math.max(0, twStockPercent - 1))}
                  disabled={isLocked || twStockPercent === 0}
                  className={`p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0 ${(isLocked || twStockPercent === 0) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-500'}`}
                  title="Decrease 1%"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={twStockPercent}
                  onChange={(e) => setTwStockPercent(Number(e.target.value))}
                  disabled={isLocked}
                  className={`flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-500 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}
                />

                <button
                  onClick={() => setTwStockPercent(Math.min(100, twStockPercent + 1))}
                  disabled={isLocked || twStockPercent === 100}
                  className={`p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0 ${(isLocked || twStockPercent === 100) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-500'}`}
                  title="Increase 1%"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StockCard
                title={t('tw_stock')}
                budget={twStockAmount}
                items={twStocks}
                setItems={setTwStocks}
                t={t}
                color="blue"
                isLocked={isLocked}
                addExpense={addExpense}
                updateExpense={updateExpense}
                removeExpense={removeExpense}
                isInvestHalf={isInvestHalf}
                setIsInvestHalf={setIsInvestHalf}
              />
              <StockCard
                title={t('us_stock')}
                budget={usStockAmount}
                items={usStocks}
                setItems={setUsStocks}
                t={t}
                color="indigo"
                isLocked={isLocked}
                addExpense={addExpense}
                updateExpense={updateExpense}
                removeExpense={removeExpense}
              />
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div
            className="flex justify-between items-center mb-4 cursor-pointer group select-none"
            onClick={() => setIsExpensesOpen(!isExpensesOpen)}
          >
            <h2 className="text-xl font-bold flex items-center gap-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              {t('expenses', '支出')}
              {isExpensesOpen ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </h2>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
              ${(fixedTotal + insuranceTotal).toLocaleString()}
            </span>
          </div>

          <div className={`transition-all duration-300 overflow-hidden ${isExpensesOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ExpenseCard
                id="fixed"
                title={t('fixed_expenses')}
                total={fixedTotal}
                items={fixedExpenses}
                setItems={setFixedExpenses}
                t={t}
                color="rose"
                isLocked={isLocked}
                addExpense={addExpense}
                updateExpense={updateExpense}
                removeExpense={removeExpense}
                isCardTransfer={isFixedTransfer}
                setIsCardTransfer={setIsFixedTransfer}
              />
              <ExpenseCard
                id="insurance"
                title={t('insurance_expenses')}
                total={insuranceTotal}
                items={insuranceExpenses}
                setItems={setInsuranceExpenses}
                t={t}
                color="rose"
                isLocked={isLocked}
                addExpense={addExpense}
                updateExpense={updateExpense}
                removeExpense={removeExpense}
                isCardTransfer={isInsuranceTransfer}
                setIsCardTransfer={setIsInsuranceTransfer}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Editing Percent Modal */}
      {editingPercent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setEditingPercent(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-center mb-6 text-slate-800 dark:text-slate-100">
                {t('edit', '編輯')} {editingPercent.name}
              </h3>

              <div className="flex items-center justify-center gap-6 mb-8">
                <button
                  onClick={() => setEditingPercent({ ...editingPercent, value: Math.max(0, editingPercent.value - 1) })}
                  className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 dark:bg-slate-700 dark:hover:bg-rose-900/50 transition-colors active:scale-95"
                >
                  <Minus className="w-6 h-6" />
                </button>

                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editingPercent.value === 0 ? '' : editingPercent.value}
                    onChange={(e) => setEditingPercent({ ...editingPercent, value: Number(e.target.value) })}
                    className="w-24 text-center text-4xl font-black bg-transparent border-none outline-none focus:ring-0 text-blue-600 dark:text-blue-400 p-0"
                  />
                  <span className="absolute -right-5 top-1 text-xl font-bold text-slate-400">%</span>
                </div>

                <button
                  onClick={() => setEditingPercent({ ...editingPercent, value: Math.min(100, editingPercent.value + 1) })}
                  className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 dark:bg-slate-700 dark:hover:bg-emerald-900/50 transition-colors active:scale-95"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingPercent(null)}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors active:scale-95"
                >
                  {t('cancel', '取消')}
                </button>
                <button
                  onClick={() => {
                    editingPercent.setter(editingPercent.value);
                    setEditingPercent(null);
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold tracking-wide text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-md shadow-blue-500/20 transition-colors active:scale-95"
                >
                  {t('confirm', '確認')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponents for cleaner code
interface AllocationRowProps {
  label: string;
  amount: number;
  percent: number | string;
  color: 'blue' | 'amber' | 'purple';
  onClick?: () => void;
  isLocked?: boolean;
}

function AllocationRow({ label, amount, percent, color, onClick, isLocked }: AllocationRowProps) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 transition-colors ${!isLocked ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98]' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
      onClick={!isLocked ? onClick : undefined}
    >
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colorMap[color]} flex items-center gap-1`}>
          {percent}%
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-lg font-bold">${amount.toLocaleString()}</span>
    </div>
  );
}

interface ExpenseCardProps {
  id: string;
  title: string;
  total: number;
  items: ExpenseItem[];
  setItems: React.Dispatch<React.SetStateAction<ExpenseItem[]>>;
  t: (key: string, options?: Record<string, unknown>) => string;
  color: 'rose' | 'emerald' | 'blue' | 'amber' | 'purple' | 'indigo';
  isLocked: boolean;
  addExpense: (setter: React.Dispatch<React.SetStateAction<ExpenseItem[]>>) => void;
  updateExpense: <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string, field: keyof T, value: string | number | boolean) => void;
  removeExpense: <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string) => void;
  isCardTransfer?: boolean;
  setIsCardTransfer?: (val: boolean) => void;
}

function ExpenseCard({ id, title, total, items, setItems, t, color, isLocked, addExpense, updateExpense, removeExpense, isCardTransfer, setIsCardTransfer }: ExpenseCardProps) {
  const [isOpen, setIsOpen] = useLocalStorage<boolean>(`finance-expense-open-${id}`, true);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
      <div
        className="flex justify-between items-center cursor-pointer group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-lg font-semibold flex items-center gap-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full bg-${color}-500`}></span>
            {setIsCardTransfer !== undefined && !isLocked && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCardTransfer(!isCardTransfer);
                }}
                className={`w-6 h-6 flex flex-shrink-0 items-center justify-center rounded text-xs font-bold transition-colors cursor-pointer border ${isCardTransfer ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 grayscale'}`}
                title={t('transfer_toggle')}
              >
                T
              </div>
            )}
            {title}
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
            ${total.toLocaleString()}
          </span>
          {!isLocked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isOpen) setIsOpen(true);
                addExpense(setItems);
              }}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-slate-700 dark:hover:bg-rose-900/30 transition-colors"
              title={t('add_item')}
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className={`transition-all duration-300 overflow-hidden ${isOpen ? 'mt-4 max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-3 pb-1">
          {items.map((item: ExpenseItem) => (
            <div key={item.id} className="flex items-center gap-2 group">
              {!isLocked && (
                <button
                  onClick={() => updateExpense(setItems, item.id, 'isTransfer', !item.isTransfer)}
                  disabled={isCardTransfer}
                  className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-colors border ${item.isTransfer ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'} ${isCardTransfer ? 'opacity-40 grayscale cursor-not-allowed' : (!item.isTransfer ? 'grayscale' : '')}`}
                  title={t('transfer_toggle')}
                >
                  T
                </button>
              )}
              <input
                type="text"
                placeholder={t('name')}
                value={item.name}
                onChange={(e) => updateExpense(setItems, item.id, 'name', e.target.value)}
                readOnly={isLocked}
                className={`flex-1 min-w-[100px] px-2 sm:px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-none ring-1 ring-slate-200 dark:ring-slate-700 ${!isLocked && 'focus:ring-2 focus:ring-rose-500'} outline-none text-sm transition-all ${isLocked ? 'opacity-80 pointer-events-none' : ''}`}
              />
              <input
                type="number"
                inputMode="decimal"
                placeholder={t('amount')}
                value={item.amount || ''}
                onChange={(e) => updateExpense(setItems, item.id, 'amount', Number(e.target.value))}
                readOnly={isLocked}
                className={`w-[60px] sm:w-[90px] md:w-32 flex-shrink-0 px-2 sm:px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-none ring-1 ring-slate-200 dark:ring-slate-700 ${!isLocked && 'focus:ring-2 focus:ring-rose-500'} outline-none text-sm transition-all text-right ${isLocked ? 'opacity-80 pointer-events-none' : ''}`}
              />
              {!isLocked && (
                <button
                  onClick={() => removeExpense(setItems, item.id)}
                  className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                  title={t('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-center text-slate-400 py-4 italic border border-dashed rounded-lg border-slate-200 dark:border-slate-700">No items</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableStockItemProps {
  item: StockItem;
  t: (key: string, options?: Record<string, unknown>) => string;
  color: 'rose' | 'emerald' | 'blue' | 'amber' | 'purple' | 'indigo';
  isLocked: boolean;
  updateExpense: <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string, field: keyof T, value: string | number | boolean) => void;
  removeExpense: <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string) => void;
  setItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  effectiveBudget: number;
}

function SortableStockItem({ item, t, color, isLocked, updateExpense, removeExpense, setItems, effectiveBudget }: SortableStockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const calculatedAmount = Math.floor(effectiveBudget * ((item.percent || 0) / 100));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 group p-2 bg-white dark:bg-slate-800 rounded-xl border ${isDragging ? `shadow-lg border-${color}-400 dark:border-${color}-500 scale-[1.02] ring-2 ring-${color}-400/20` : 'border-slate-200 dark:border-slate-700 shadow-sm transition-shadow hover:shadow-md'} touch-none focus:outline-none`}
    >
      <input
        type="text"
        placeholder={t('name')}
        value={item.name}
        onChange={(e) => updateExpense(setItems, item.id, 'name', e.target.value)}
        readOnly={isLocked}
        className={`flex-1 min-w-0 bg-transparent border-none font-medium placeholder-slate-400 outline-none transition-all text-slate-700 dark:text-slate-200 text-sm ${isLocked ? 'pointer-events-none' : `focus:text-${color}-600 dark:focus:text-${color}-400`}`}
      />

      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={item.percent === 0 ? '' : item.percent}
          onChange={(e) => updateExpense(setItems, item.id, 'percent', Number(e.target.value))}
          readOnly={isLocked}
          className={`w-10 md:w-12 bg-transparent border-none outline-none text-right font-semibold text-slate-700 dark:text-slate-200 text-sm ${isLocked ? 'pointer-events-none' : `focus:text-${color}-600 dark:focus:text-${color}-400`}`}
        />
        <span className="text-slate-500 text-xs md:text-sm font-medium">%</span>
      </div>

      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 min-w-[5rem] md:min-w-[6rem] justify-end">
        <span className="text-slate-400 text-xs md:text-sm font-medium">$</span>
        <span className="font-bold text-slate-700 dark:text-slate-200 truncate text-xs md:text-sm">{calculatedAmount.toLocaleString()}</span>
      </div>

      {!isLocked && (
        <button
          onClick={() => removeExpense(setItems, item.id)}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 shrink-0"
          title={t('delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface StockCardProps {
  title: string;
  budget: number;
  items: StockItem[];
  setItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
  t: (key: string, options?: Record<string, unknown>) => string;
  color: 'rose' | 'emerald' | 'blue' | 'amber' | 'purple' | 'indigo';
  isLocked: boolean;
  addExpense: (setter: React.Dispatch<React.SetStateAction<StockItem[]>>) => void;
  updateExpense: <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string, field: keyof T, value: string | number | boolean) => void;
  removeExpense: <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: string) => void;
  isInvestHalf?: boolean;
  setIsInvestHalf?: (val: boolean) => void;
}

function StockCard({ title, budget, items, setItems, t, color, isLocked, addExpense, updateExpense, removeExpense, isInvestHalf, setIsInvestHalf }: StockCardProps) {
  const effectiveBudget = isInvestHalf ? Math.floor(budget / 2) : budget;

  const currentTotal = items.reduce((sum: number, item: StockItem) => sum + Math.floor(effectiveBudget * ((item.percent || 0) / 100)), 0);
  const totalPercent = items.reduce((sum: number, item: StockItem) => sum + (item.percent || 0), 0);
  const remaining = effectiveBudget - currentTotal;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: { active: { id: string | number }, over: { id: string | number } | null }) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setItems((itemsList: StockItem[]) => {
        const oldIndex = itemsList.findIndex((it: StockItem) => it.id === active.id);
        const newIndex = itemsList.findIndex((it: StockItem) => it.id === over.id);
        return arrayMove(itemsList, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 h-full flex flex-col">
      <div className="flex items-center mb-4 gap-2">
        <h3 className="font-semibold">{title}</h3>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-200/50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg text-xs sm:text-sm">
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">Total:</span>
            <span className={`font-semibold ${totalPercent > 100 ? 'text-red-500' : totalPercent === 100 ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>{totalPercent}%</span>
            <span className={`font-semibold ${remaining < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
              ${currentTotal.toLocaleString()}
            </span>
          </div>
          {!isLocked && (
            <button
              onClick={() => addExpense(setItems)}
              className={`p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:text-${color}-500 transition-colors border border-slate-200 dark:border-slate-700 shrink-0`}
              title={t('add_item')}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {setIsInvestHalf && (
        <div className="mb-4">
          <label className={`inline-flex items-center gap-1.5 p-1.5 px-2.5 rounded-md border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors shadow-sm ${isInvestHalf ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/50' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'} ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
            <input
              type="checkbox"
              checked={isInvestHalf}
              onChange={(e) => setIsInvestHalf(e.target.checked)}
              disabled={isLocked}
              className="w-3.5 h-3.5 rounded text-blue-500 rounded-sm focus:ring-blue-500 accent-blue-500"
            />
            <span className={`text-xs font-semibold ${isInvestHalf ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-500'}`}>先投入一半</span>
          </label>
        </div>
      )}

      <div className="space-y-3 mb-4 flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((it: StockItem) => it.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item: StockItem) => (
              <SortableStockItem
                key={item.id}
                item={item}
                t={t}
                color={color}
                isLocked={isLocked}
                updateExpense={updateExpense}
                removeExpense={removeExpense}
                setItems={setItems}
                effectiveBudget={effectiveBudget}
              />
            ))}
          </SortableContext>
        </DndContext>
        {items.length === 0 && (
          <p className="text-sm text-center text-slate-400 py-6 italic border border-dashed rounded-xl border-slate-200 dark:border-slate-700">No individual stocks configured</p>
        )}
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400">Rem</span>
          <span className={`font-semibold ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            ${remaining.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
