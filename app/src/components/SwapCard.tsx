import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
const UserSolHeader = ({ UserSolBal }) => {
  // console.log("sol header", UserSolBal);
  return (
    <div className="">
      <p>Sol </p>
      <p>Balance: {UserSolBal / LAMPORTS_PER_SOL}</p>
    </div>
  );
};
const UserVoucherHeader = ({ UserVoucherBal }) => {
  // console.log("voucher header", UserVoucherBal);
  return (
    <div className="">
      <p>Voucher</p>
      <p>Balance: {UserVoucherBal}</p>
    </div>
  );
};
const SwapCard = ({ MarketData }) => {
  // console.log("swapcard data", MarketData);
  const [fromSol, setFromSol] = useState(false);
  const [topInput, setTopInput] = useState<number>();
  const [bottomInput, setBottomInput] = useState<number>();

  function switchState() {
    setFromSol(!fromSol);
    let temp = topInput;
    setTopInput(bottomInput);
    setBottomInput(temp);
  }

  // TODO AVOID NEGATIVE VALUES
  function updateInputs(value, topInput) {
    let solInput, voucherInput;
    let K = MarketData.marketVoucherBal * MarketData.marketSolBal;

    console.log("top input?", topInput.toString());

    if (topInput == true && fromSol == true) {
      // update voucher res on user depositing sol
      solInput = Number(value.replace(/[a-z]/gi, "")) * LAMPORTS_PER_SOL;

      let marketDiff = MarketData.marketSolBal + solInput;
      let Kdiff = K / marketDiff;
      let amountOut = MarketData.marketVoucherBal - Kdiff;

      console.log("1", K, solInput, marketDiff, Kdiff, amountOut);

      setTopInput(value.replace(/[a-z]/gi, ""));
      setBottomInput(amountOut);
    } else if (topInput == false && fromSol == true) {
      // update sol needed to get voucher

      voucherInput = Number(value.replace(/[a-z]/gi, ""));

      let marketDiff = MarketData.marketVoucherBal - voucherInput;
      let Kdiff = K / marketDiff;
      let amountIn = (Kdiff - MarketData.marketSolBal) / LAMPORTS_PER_SOL;

      console.log("2", K, voucherInput, marketDiff, Kdiff, amountIn);

      setTopInput(amountIn);
      setBottomInput(value.replace(/[a-z]/gi, ""));
    } else if (topInput == true && fromSol == false) {
      //update sol res on user depoing voucher
      voucherInput = Number(value.replace(/[a-z]/gi, ""));

      let marketDiff = MarketData.marketVoucherBal + voucherInput;
      let Kdiff = K / marketDiff;
      let amountOut = (MarketData.marketSolBal - Kdiff) / LAMPORTS_PER_SOL;

      console.log("3", K, voucherInput, marketDiff, Kdiff, amountOut);

      setTopInput(value.replace(/[a-z]/gi, ""));
      setBottomInput(amountOut);
    } else if (topInput == false && fromSol == false) {
      //update voucher needed to get sol

      solInput = Number(value.replace(/[a-z]/gi, "")) * LAMPORTS_PER_SOL;

      let marketDiff = MarketData.marketSolBal - solInput;
      let Kdiff = K / marketDiff;
      let amountIn = Kdiff - MarketData.marketVoucherBal;

      console.log("4", K, solInput, marketDiff, Kdiff, amountIn);

      setTopInput(amountIn);
      setBottomInput(value.replace(/[a-z]/gi, ""));
    }
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Swap</h2>
        <div className="form-control">
          {fromSol ? (
            <UserSolHeader UserSolBal={MarketData.userSolBal} />
          ) : (
            <UserVoucherHeader UserVoucherBal={MarketData.userVoucherBal} />
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
            <UserSolHeader UserSolBal={MarketData.userSolBal} />
          ) : (
            <UserVoucherHeader UserVoucherBal={MarketData.userVoucherBal} />
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
          <button className="btn btn-primary">Swap</button>
        </div>
      </div>
    </div>
  );
};
export default SwapCard;
