import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleRight } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
import { instructionSwap } from "@/utils/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";

const NewSwapCard = ({ marketData }: { marketData: MarketData }) => {
  const marketSol = marketData.marketSolBal;
  const marketVoucher = marketData.marketVoucherBal;
  const userSol = marketData.userSolBal;
  const userVoucher = marketData.userVoucherBal;

  const [vouchers, setVouchers] = useState<number>(0);
  const [solOutput, setSolOutput] = useState<number>(0);
  const [buyVouchers, setBuyVouchers] = useState<boolean>(true);

  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  async function executeSwap() {
    console.log("swapping");
    await instructionSwap(
      wallet,
      publicKey,
      new PublicKey(exhibitAddress),
      vouchers,
      buyVouchers,
      signTransaction,
      connection
    );
    router.reload(window.location.pathname);
  }

  function updateInputs(vouchers: number, newBuyVouchers: boolean) {
    let K = marketVoucher * marketSol;
    let marketDiff, Kdiff, amountOut;

    if (newBuyVouchers) {
      // vouchers to sol

      marketDiff = marketVoucher - vouchers;
      Kdiff = Math.floor(K / marketDiff);
      amountOut = Kdiff - marketSol;
    } else {
      //sol to vouchers
      marketDiff = marketVoucher + vouchers;
      Kdiff = Math.floor(K / marketDiff);
      amountOut = marketSol - Kdiff;
    }

    console.log(
      "updated inputs",
      vouchers,
      marketVoucher,
      newBuyVouchers,
      K,
      marketDiff,
      Kdiff,
      amountOut / LAMPORTS_PER_SOL
    );
    setVouchers(vouchers);
    setSolOutput(amountOut / LAMPORTS_PER_SOL);
    setBuyVouchers(newBuyVouchers);
  }

  const iconSize = 50;

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Swap Vouchers</h2>
        <div className="flex flex-row w-full justify-evenly">
          <button
            className={`btn btn-success ${!buyVouchers && "opacity-50"}`}
            onClick={() => {
              updateInputs(0, true);
            }}
          >
            Buy
          </button>
          <button
            className={`btn btn-error ${buyVouchers && "opacity-50"}`}
            onClick={() => {
              updateInputs(0, false);
            }}
          >
            Sell
          </button>
        </div>

        <input
          type="range"
          min="0"
          max={buyVouchers ? marketVoucher - 1 : userVoucher}
          value={vouchers}
          step={`${(buyVouchers ? marketVoucher : userVoucher) < 10} && "1"`}
          className="range range-sm"
          onChange={(e) => {
            updateInputs(Number(e.target.value), buyVouchers);
          }}
        />

        {(buyVouchers ? marketVoucher > 0 : userVoucher > 0) && (
          <div className="w-full flex justify-between text-xs px-2">
            {[
              ...Array((buyVouchers ? marketVoucher - 1 : userVoucher) + 1),
            ].map((i) => (
              <span key={i}>|</span>
            ))}
          </div>
        )}
        <div className="stat-desc place-self-end">
          Max: {buyVouchers ? marketVoucher - 1 : userVoucher}
        </div>
        <div className="flex flex-row shadow items-center">
          <div className="stat place-items-center">
            {buyVouchers ? (
              <>
                <div className="stat-title">Sol</div>
                <div className="stat-value">{solOutput.toFixed(2)}</div>
                <div className="stat-desc">
                  Balance: {userSol / LAMPORTS_PER_SOL}
                </div>
              </>
            ) : (
              <>
                <div className="stat-title">Vouchers</div>
                <div className="stat-value">{vouchers}</div>
                <div className="stat-desc">Balance: {userVoucher}</div>
              </>
            )}
          </div>

          <HiChevronDoubleRight size={iconSize} />

          <div className="stat place-items-center text-success">
            {!buyVouchers ? (
              <>
                <div className="stat-title">Sol</div>
                <div className="stat-value">{solOutput.toFixed(2)}</div>
                <div className="stat-desc">
                  Balance: {userSol / LAMPORTS_PER_SOL}
                </div>
              </>
            ) : (
              <>
                <div className="stat-title">Vouchers</div>
                <div className="stat-value">{vouchers}</div>
                <div className="stat-desc">Balance: {userVoucher}</div>
              </>
            )}
          </div>
        </div>
        {wallet ? (
          <>
            {(buyVouchers ? marketVoucher : userVoucher) >= 1 ? (
              <button className="btn btn-primary" onClick={executeSwap}>
                Swap
              </button>
            ) : (
              <button class="btn" disabled="disabled">
                Not Enough tokens to Swap
              </button>
            )}
          </>
        ) : (
          <button class="btn" disabled="disabled">
            Connect wallet to Swap
          </button>
        )}
      </div>
    </div>
  );
};
export default NewSwapCard;
