import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleRight } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
import { instructionSwap } from "@/utils/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import {
  SolDisplay,
  VoucherDisplay,
  VoucherSlider,
  YesOrNoButtons,
} from "./MarketInputs";

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

    setVouchers(vouchers);
    setSolOutput(amountOut / LAMPORTS_PER_SOL);
    setBuyVouchers(newBuyVouchers);
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Swap Vouchers</h2>
        <YesOrNoButtons
          yesText={"Buy"}
          noText={"Sell"}
          yesBool={buyVouchers}
          updateInputs={updateInputs}
        />
        <VoucherSlider
          max={buyVouchers ? marketVoucher - 1 : userVoucher}
          value={vouchers}
          onChange={(e) => {
            updateInputs(Number(e.target.value), buyVouchers);
          }}
        />

        <div className="flex flex-row shadow items-center">
          <div className="stat place-items-center">
            {buyVouchers ? (
              <SolDisplay solOutput={solOutput} userSol={userSol} />
            ) : (
              <VoucherDisplay vouchers={vouchers} userVoucher={userVoucher} />
            )}
          </div>

          <HiChevronDoubleRight size={50} />

          <div className="stat place-items-center text-success">
            {!buyVouchers ? (
              <SolDisplay solOutput={solOutput} userSol={userSol} />
            ) : (
              <VoucherDisplay vouchers={vouchers} userVoucher={userVoucher} />
            )}
          </div>
        </div>
        {wallet ? (
          <>
            {(buyVouchers ? marketVoucher : userVoucher) >= 1 ? (
              <>
                {vouchers >= 1 ? (
                  <button className="btn btn-primary" onClick={executeSwap}>
                    Swap
                  </button>
                ) : (
                  <button class="btn" disabled="disabled">
                    Choose an amount to Swap
                  </button>
                )}
              </>
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
