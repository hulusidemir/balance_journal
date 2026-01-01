export interface TradeCalculation {
  balance: number;
  leverage: number;
  entryPrice: number;
  direction: 'long' | 'short';
  targetProfitPercent: number; // e.g., 2 for 2%
}

export interface TradeResult {
  positionSize: number;
  targetProfitAmount: number;
  requiredMovePercent: number;
  exitPrice: number;
}

export const calculateTrade = (input: TradeCalculation): TradeResult => {
  const { balance, leverage, entryPrice, direction, targetProfitPercent } = input;
  
  const positionSize = balance * leverage;
  const targetProfitAmount = balance * (targetProfitPercent / 100);
  
  // Profit = PositionSize * (PriceChangePercent / 100)
  // TargetProfit = PositionSize * (RequiredMovePercent / 100)
  // RequiredMovePercent = (TargetProfit / PositionSize) * 100
  
  const requiredMovePercent = (targetProfitAmount / positionSize) * 100;
  
  let exitPrice = 0;
  if (direction === 'long') {
    exitPrice = entryPrice * (1 + requiredMovePercent / 100);
  } else {
    exitPrice = entryPrice * (1 - requiredMovePercent / 100);
  }
  
  return {
    positionSize,
    targetProfitAmount,
    requiredMovePercent,
    exitPrice
  };
};
