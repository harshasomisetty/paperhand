import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
import {
  instructionDepositLiquidity,
  instructionSwap,
} from "@/utils/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { decimalsVal, getExhibitProgramAndProvider } from "@/utils/constants";
import { BazaarData, SolInput, VoucherInput } from "@/components/MarketInputs";

const LiquidityCard = ({
  marketData,
  exhibitSymbol,
}: {
  marketData: MarketData;
  exhibitSymbol: string;
}) => {
  const [topInput, setTopInput] = useState<number>();
  const [bottomInput, setBottomInput] = useState<number>();

  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  async function executeAddLiq() {
    console.log("swapping");
    await instructionDepositLiquidity(
      wallet,
      publicKey,
      new PublicKey(exhibitAddress),
      Number(bottomInput),
      signTransaction,
      connection
    );
    // router.reload(window.location.pathname);
  }

  // TODO AVOID NEGATIVE VALUES
  function updateInputs(value, topInput) {
    let solInput, voucherInput;

    console.log("top input?", topInput.toString(), value);

    if (topInput == true) {
      solInput = Number(value.replace(/[a-z]/gi, "")) * LAMPORTS_PER_SOL;

      let marketPercent = solInput / marketData.marketSolBal;
      let amountOut = marketData.marketVoucherBal * marketPercent;

      setTopInput(value.replace(/[a-z]/gi, ""));
      setBottomInput(amountOut / decimalsVal);
    } else {
      voucherInput = Number(value.replace(/[a-z]/gi, "")) * decimalsVal;

      let marketPercent = voucherInput / marketData.marketVoucherBal;
      let amountIn = marketData.marketSolBal * marketPercent;

      setTopInput(amountIn / LAMPORTS_PER_SOL);
      setBottomInput(value.replace(/[a-z]/gi, ""));
    }
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Liquidity</h2>
        <div className="form-control">
          <SolInput userSol={marketData.userSolBal} />
          <input
            type="text"
            placeholder="From"
            className="input input-bordered"
            value={topInput}
            onChange={(e) => updateInputs(e.target.value, true)}
          />
        </div>

        <div className="form-control">
          <VoucherInput userVoucher={marketData.userVoucherBal} />
          <input
            type="text"
            placeholder="To"
            className="input input-bordered"
            value={bottomInput}
            onChange={(e) => updateInputs(e.target.value, false)}
          />
        </div>
        <div className="form-control">
          <button className="btn btn-primary" onClick={executeAddLiq}>
            Add Liquidity
          </button>
        </div>
        <BazaarData
          marketSol={marketData.marketSolBal}
          marketVoucher={marketData.marketVoucherBal}
          exhibitSymbol={exhibitSymbol}
        />
      </div>
    </div>
  );
};
export default LiquidityCard;
