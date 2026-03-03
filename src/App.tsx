import { useMemo } from 'react';
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
  const [isInvestmentOpen, setIsInvestmentOpen] = useLocalStorage<boolean>('finance-investment-open', true);

  // Lock state
  const [isLocked, setIsLocked] = useLocalStorage<boolean>('finance-locked', false);

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

  const [twStocks, setTwStocks] = useLocalStorage<StockItem[]>('finance-tw-stocks', []);
  const [usStocks, setUsStocks] = useLocalStorage<StockItem[]>('finance-us-stocks', []);

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
    usStockAmount
  } = useMemo(() => {
    const fixedTotal = fixedExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const insuranceTotal = insuranceExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);

    const disposable = Math.max(0, income - fixedTotal - insuranceTotal);

    const investmentGross = Math.floor(disposable * 0.55);
    const investmentNet = Math.max(0, investmentGross - creditLoan);
    const travel = Math.floor(disposable * 0.10);
    const living = Math.floor(disposable * 0.35);

    const twStockAmount = Math.floor(investmentNet * (twStockPercent / 100));
    const usStockAmount = investmentNet - twStockAmount; // Ensures exact total

    return {
      fixedTotal,
      insuranceTotal,
      disposable,
      investmentGross,
      investmentNet,
      travel,
      living,
      twStockAmount,
      usStockAmount
    };
  }, [income, fixedExpenses, insuranceExpenses, twStockPercent, creditLoan]);

  // Handlers
  const addExpense = (setter: any) => {
    setter((prev: any[]) => [...prev, { id: generateId(), name: '', amount: 0, percent: 0 }]);
  };

  const updateExpense = (
    setter: any,
    id: string,
    field: string,
    value: string | number
  ) => {
    setter((prev: any[]) => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeExpense = (setter: any, id: string) => {
    setter((prev: any[]) => prev.filter(item => item.id !== id));
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

        {/* Top Section: Income & Allocations */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {t('income')}
          </h2>
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input
              type="number"
              value={income || ''}
              onChange={(e) => setIncome(Number(e.target.value))}
              readOnly={false} // Income is always editable per requirement
              className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-xl font-bold"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Disposable Income (Smaller) */}
            <div className="md:w-[35%] p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800/30 flex flex-col justify-center">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">{t('disposable')}</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 truncate">
                ${disposable.toLocaleString()}
              </p>
            </div>

            {/* Allocations Overview (Larger) */}
            <div className="md:w-[65%] flex flex-col justify-center gap-2">
              <AllocationRow label={t('investment')} amount={investmentNet} percent="55%" color="blue" />
              <AllocationRow label={t('living')} amount={living} percent="35%" color="amber" />
              <AllocationRow label={t('travel')} amount={travel} percent="10%" color="purple" />
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
          />
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

function ExpenseCard({ id, title, total, items, setItems, t, color, isLocked, addExpense, updateExpense, removeExpense }: any) {
  const [isOpen, setIsOpen] = useLocalStorage<boolean>(`finance-expense-open-${id}`, true);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
      <div
        className="flex justify-between items-center cursor-pointer group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-lg font-semibold flex items-center gap-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
          <span className={`w-2 h-2 rounded-full bg-${color}-500`}></span>
          {title}
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
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 group">
              <input
                type="text"
                placeholder={t('name')}
                value={item.name}
                onChange={(e) => updateExpense(setItems, item.id, 'name', e.target.value)}
                readOnly={isLocked}
                className={`flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-none ring-1 ring-slate-200 dark:ring-slate-700 ${!isLocked && 'focus:ring-2 focus:ring-rose-500'} outline-none text-sm transition-all ${isLocked ? 'opacity-80 pointer-events-none' : ''}`}
              />
              <input
                type="number"
                placeholder={t('amount')}
                value={item.amount || ''}
                onChange={(e) => updateExpense(setItems, item.id, 'amount', Number(e.target.value))}
                readOnly={isLocked}
                className={`w-24 md:w-32 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-none ring-1 ring-slate-200 dark:ring-slate-700 ${!isLocked && 'focus:ring-2 focus:ring-rose-500'} outline-none text-sm transition-all text-right ${isLocked ? 'opacity-80 pointer-events-none' : ''}`}
              />
              {!isLocked && (
                <button
                  onClick={() => removeExpense(setItems, item.id)}
                  className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
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

function SortableStockItem({ item, t, color, isLocked, updateExpense, removeExpense, setItems, effectiveBudget }: any) {
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

function StockCard({ title, budget, items, setItems, t, color, isLocked, addExpense, updateExpense, removeExpense, isInvestHalf, setIsInvestHalf }: any) {
  const effectiveBudget = isInvestHalf ? Math.floor(budget / 2) : budget;

  const currentTotal = items.reduce((sum: number, item: any) => sum + Math.floor(effectiveBudget * ((item.percent || 0) / 100)), 0);
  const totalPercent = items.reduce((sum: number, item: any) => sum + (item.percent || 0), 0);
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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setItems((itemsList: any[]) => {
        const oldIndex = itemsList.findIndex((it: any) => it.id === active.id);
        const newIndex = itemsList.findIndex((it: any) => it.id === over.id);
        return arrayMove(itemsList, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">{title}</h3>
        {!isLocked && (
          <button
            onClick={() => addExpense(setItems)}
            className={`p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:text-${color}-500 transition-colors border border-slate-200 dark:border-slate-700`}
            title={t('add_item')}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
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
            items={items.map((it: any) => it.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item: any) => (
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

      <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400">Total Allocated</span>
          <div className="flex items-center gap-3">
            <span className={`font-semibold ${totalPercent > 100 ? 'text-red-500' : totalPercent === 100 ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>{totalPercent}%</span>
            <span className={`font-semibold ${remaining < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
              ${currentTotal.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-200 dark:border-slate-700 border-dashed">
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
