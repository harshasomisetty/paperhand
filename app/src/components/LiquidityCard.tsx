import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
import { instructionSwap } from "@/utils/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { decimalsVal, getExhibitProgramAndProvider } from "@/utils/constants";
const SolHeader = ({ UserSolBal }) => {
  // console.log("sol header", UserSolBal);
  return (
    <div className="">
      <p>Sol </p>
      <p>Balance: {UserSolBal / LAMPORTS_PER_SOL}</p>
    </div>
  );
};
const VoucherHeader = ({ UserVoucherBal }) => {
  // console.log("voucher header", UserVoucherBal);
  return (
    <div className="">
      <p>Voucher</p>
      <p>Balance: {UserVoucherBal / decimalsVal}</p>
    </div>
  );
};
const LiquidityCard = ({ MarketData }) => {
  const [topInput, setTopInput] = useState<number>();
  const [bottomInput, setBottomInput] = useState<number>();

  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;
  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      console.log("fetching swap view");

      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);

      let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
      setExhibitSymbol(exhibitInfo.exhibitSymbol);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

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
    // router.reload(window.location.pathname);
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
          <SolHeader UserSolBal={MarketData.userSolBal} />
          <input
            type="text"
            placeholder="From"
            className="input input-bordered"
            value={topInput}
            onChange={(e) => updateInputs(e.target.value, true)}
          />
        </div>

        <div className="form-control">
          <VoucherHeader UserVoucherBal={MarketData.userVoucherBal} />
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
        <table className="table table-compact w-full border rounded-lg items-end">
          <tbody>
            <tr>
              <th>Base</th>
              <td>SOL</td>
            </tr>
            <tr>
              <th>Pool Liquidity (SOL)</th>
              <td>{MarketData.marketSolBal / LAMPORTS_PER_SOL}</td>
            </tr>
            <tr>
              <th>Pool Liquidity ({exhibitSymbol})</th>
              <td>{MarketData.marketVoucherBal / decimalsVal}</td>
            </tr>
            <tr>
              <th>LP supply</th>
              <td>temp</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default LiquidityCard;
