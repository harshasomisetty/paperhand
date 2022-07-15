import { useState } from "react";

import { MarketData, UserData } from "@/utils/interfaces";
import DepositLiquidity from "@/components/DepositLiquidity";
import WithdrawLiquidity from "@/components/WithdrawLiquidity";
import { BazaarData } from "./MarketInputs";

const LiquidityCard = ({
  userData,
  marketData,
  exhibitSymbol,
}: {
  userData: UserData;
  marketData: MarketData;
  exhibitSymbol: string;
}) => {
  const [depositLiq, setDepositLiq] = useState<boolean>(true);

  return (
    <div className="card flex flex-col space-y-2 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
      <div className="card-body">
        <h2 className="card-title mb-4">Liquidity</h2>

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
        <div className="p-2"></div>
        {depositLiq ? (
          <DepositLiquidity
            userData={userData}
            marketData={marketData}
            exhibitSymbol={exhibitSymbol}
          />
        ) : (
          <WithdrawLiquidity
            userData={userData}
            marketData={marketData}
            exhibitSymbol={exhibitSymbol}
          />
        )}
        <div className="p-2"></div>
        <BazaarData marketData={marketData} exhibitSymbol={exhibitSymbol} />
      </div>
    </div>
  );
};
export default LiquidityCard;
