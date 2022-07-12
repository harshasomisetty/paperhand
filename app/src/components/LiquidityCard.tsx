import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
import { instructionSwap } from "@/utils/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { decimalsVal, getExhibitProgramAndProvider } from "@/utils/constants";
import { BazaarData, SolInput, VoucherInput } from "@/components/MarketInputs";

const LiquidityCard = ({ MarketData }) => {
  const [topInput, setTopInput] = useState<number>();
  const [bottomInput, setBottomInput] = useState<number>();

  async function executeSwap() {
    console.log("swapping");
    await instructionSwap(
      wallet,
      publicKey,
      new PublicKey(exhibitAddress),
      Number(topInput),
      Number(bottomInput),
      fromSol,
      signTransaction,
      connection
    );
    router.reload(window.location.pathname);
  }

  // TODO AVOID NEGATIVE VALUES
  function updateInputs(value, topInput) {
    let solInput, voucherInput;
    let K = MarketData.marketVoucherBal * MarketData.marketSolBal;

    console.log("top input?", topInput.toString(), value);

    if (topInput == true) {
      solInput = Number(value.replace(/[a-z]/gi, "")) * LAMPORTS_PER_SOL;

      let marketPercent = solInput / MarketData.marketSolBal;
      let amountOut = MarketData.marketVoucherBal * marketPercent;

      setTopInput(value.replace(/[a-z]/gi, ""));
      setBottomInput(amountOut / decimalsVal);
    } else {
      voucherInput = Number(value.replace(/[a-z]/gi, "")) * decimalsVal;

      let marketPercent = voucherInput / MarketData.marketVoucherBal;
      let amountIn = MarketData.marketSolBal * marketPercent;

      setTopInput(amountIn / LAMPORTS_PER_SOL);
      setBottomInput(value.replace(/[a-z]/gi, ""));
    }
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Liquidity</h2>
        <div className="form-control">
          <SolInput />
          <input
            type="text"
            placeholder="From"
            className="input input-bordered"
            value={topInput}
            onChange={(e) => updateInputs(e.target.value, true)}
          />
        </div>

        <div className="form-control">
          <VoucherInput />
          <input
            type="text"
            placeholder="To"
            className="input input-bordered"
            value={bottomInput}
            onChange={(e) => updateInputs(e.target.value, false)}
          />
        </div>
        <div className="form-control">
          <button className="btn btn-primary" onClick={executeSwap}>
            Add Liquidity
          </button>
        </div>
        <BazaarData />
      </div>
    </div>
  );
};
export default LiquidityCard;
