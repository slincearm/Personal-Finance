export interface ExpenseItem {
    id: string;
    name: string;
    amount: number;
    isTransfer?: boolean;
}

export interface StockItem {
    id: string;
    name: string;
    amount: number;
    percent?: number;
}
