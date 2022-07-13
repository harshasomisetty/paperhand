import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
import { instructionSwap } from "@/utils/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { decimalsVal } from "@/utils/constants";
import { SolInput, VoucherInput } from "@/components/MarketInputs";

const SwapCard = ({ marketData }: { marketData: MarketData }) => {
  // console.log("swapcard data", marketData);
  const [fromSol, setFromSol] = useState(true);
  const [topInput, setTopInput] = useState<number>();
  const [bottomInput, setBottomInput] = useState<number>();

  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  function switchState() {
    setFromSol(!fromSol);
    let temp = topInput;
    setTopInput(bottomInput);
    setBottomInput(temp);
  }

  async function executeSwap() {
    console.log("swapping");
    await instructionSwap(
      wallet,
      publicKey,
      new PublicKey(exhibitAddress),
      Number(topInput),
      Number(bottomInput),
      !fromSol,
      signTransaction,
      connection
    );
    router.reload(window.location.pathname);
  }

  // TODO AVOID NEGATIVE VALUES
  function updateInputs(value, topInput) {
    let solInput, voucherInput;
    let K = marketData.marketVoucherBal * marketData.marketSolBal;

    console.log("top input?", topInput.toString());

    if (topInput == true && fromSol == true) {
      // update voucher res on user depositing sol
      solInput = Number(value.replace(/[a-z]/gi, "")) * LAMPORTS_PER_SOL;

      let marketDiff = marketData.marketSolBal + solInput;
      let Kdiff = K / marketDiff;
      let amountOut = marketData.marketVoucherBal - Kdiff;

      console.log("1", K, solInput, marketDiff, Kdiff, amountOut);

      setTopInput(value.replace(/[a-z]/gi, ""));
      setBottomInput((amountOut / decimalsVal) * 0.95);
    } else if (topInput == false && fromSol == true) {
      // update sol needed to get voucher

      voucherInput = Number(value.replace(/[a-z]/gi, "")) * decimalsVal;

      let marketDiff = marketData.marketVoucherBal - voucherInput;
      let Kdiff = K / marketDiff;
      let amountIn = (Kdiff - marketData.marketSolBal) / LAMPORTS_PER_SOL;

      console.log("2", K, voucherInput, marketDiff, Kdiff, amountIn);

      setTopInput(amountIn * 1.05);
      setBottomInput(value.replace(/[a-z]/gi, ""));
    } else if (topInput == true && fromSol == false) {
      //update sol res on user depoing voucher
      voucherInput = Number(value.replace(/[a-z]/gi, "")) * decimalsVal;

      let marketDiff = marketData.marketVoucherBal + voucherInput;
      let Kdiff = K / marketDiff;
      let amountOut = (marketData.marketSolBal - Kdiff) / LAMPORTS_PER_SOL;

      console.log("3", K, voucherInput, marketDiff, Kdiff, amountOut);

      setTopInput(value.replace(/[a-z]/gi, ""));
      setBottomInput(amountOut * 0.95);
    } else if (topInput == false && fromSol == false) {
      //update voucher needed to get sol

      solInput = Number(value.replace(/[a-z]/gi, "")) * LAMPORTS_PER_SOL;

      let marketDiff = marketData.marketSolBal - solInput;
      let Kdiff = K / marketDiff;
      let amountIn = Kdiff - marketData.marketVoucherBal;

      console.log("4", K, solInput, marketDiff, Kdiff, amountIn);

      setTopInput(amountIn * 1.05);
      setBottomInput(value.replace(/[a-z]/gi, ""));
    }
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Swap</h2>
        <div className="form-control">
          {fromSol ? (
            <SolInput userSol={marketData.userSolBal} />
          ) : (
            <VoucherInput userVoucher={marketData.userVoucherBal} />
          )}
          <input
            type="text"
            placeholder="From"
            className="input input-bordered"
            value={topInput}
            onChange={(e) => updateInputs(e.target.value, true)}
          />
        </div>

        <label className="swap swap-rotate text-9xl">
          <input type="checkbox" checked={fromSol} onChange={switchState} />
          <div className="swap-on">
            <HiChevronDoubleDown />
          </div>
          <div className="swap-off">
            <HiChevronDoubleDown />
          </div>
        </label>

        <div className="form-control">
          {!fromSol ? (
            <SolInput userSol={marketData.userSolBal} />
          ) : (
            <VoucherInput userVoucher={marketData.userVoucherBal} />
          )}
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
            Swap
          </button>
        </div>
      </div>
    </div>
  );
};
export default SwapCard;
