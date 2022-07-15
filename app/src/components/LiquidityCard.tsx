import { useState } from "react";

import { MarketData } from "@/utils/interfaces";

import DepositLiquidity from "@/components/DepositLiquidity";
import WithdrawLiquidity from "@/components/WithdrawLiquidity";

const LiquidityCard = ({
  marketData,
  exhibitSymbol,
}: {
  marketData: MarketData;
  exhibitSymbol: string;
}) => {
  const [depositLiq, setDepositLiq] = useState<boolean>(false);

  // TODO AVOID NEGATIVE VALUES
  return (
    <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Liquidity</h2>

        <div className="flex flex-row w-full justify-evenly">
          <button
            className={`btn btn-success ${!depositLiq && "opacity-50"}`}
            onClick={() => {
              setDepositLiq(!depositLiq);
            }}
          >
            Deposit
          </button>
          <button
            className={`btn btn-error ${depositLiq && "opacity-50"}`}
            onClick={() => {
              setDepositLiq(!depositLiq);
            }}
          >
            Withdraw
          </button>
        </div>
        {depositLiq ? (
          <DepositLiquidity
            marketData={marketData}
            exhibitSymbol={exhibitSymbol}
          />
        ) : (
          <WithdrawLiquidity
            marketData={marketData}
            exhibitSymbol={exhibitSymbol}
          />
        )}
      </div>
    </div>
  );
};
export default LiquidityCard;
