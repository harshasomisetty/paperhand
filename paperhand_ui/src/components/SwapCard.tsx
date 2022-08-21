import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleRight } from "react-icons/hi";

import {
  SolDisplay,
  VoucherDisplay,
  VoucherSlider,
} from "@/components/MarketInputs";
import { instructionSwap } from "@/utils/instructions/shop";
import { MarketData, UserData } from "@/utils/interfaces";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";

const SwapCard = ({
  marketData,
  userData,
}: {
  marketData: MarketData;
  userData: UserData;
}) => {
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
    let K = marketData.voucher * marketData.sol;
    let marketDiff, Kdiff, amountOut;

    if (newBuyVouchers) {
      // vouchers to sol

      marketDiff = marketData.voucher - vouchers;
      Kdiff = Math.floor(K / marketDiff);
      amountOut = Kdiff - marketData.sol;
    } else {
      //sol to vouchers
      marketDiff = marketData.voucher + vouchers;
      Kdiff = Math.floor(K / marketDiff);
      amountOut = marketData.sol - Kdiff;
    }

    setVouchers(vouchers);
    setSolOutput(amountOut);
    setBuyVouchers(newBuyVouchers);
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
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

        <VoucherSlider
          max={buyVouchers ? marketData.voucher - 1 : userData.voucher}
          value={vouchers}
          onChange={(e) => {
            updateInputs(Number(e.target.value), buyVouchers);
          }}
        />

        <div className="flex flex-row shadow items-center">
          <div className="stat place-items-center">
            {buyVouchers ? (
              <SolDisplay
                solOutput={solOutput}
                userSol={userData.sol}
                yesBool={false}
              />
            ) : (
              <VoucherDisplay
                vouchers={vouchers}
                userVoucher={userData.voucher}
                yesBool={false}
              />
            )}
          </div>

          <HiChevronDoubleRight size={50} />

          <div className="stat place-items-center">
            {!buyVouchers ? (
              <SolDisplay
                solOutput={solOutput}
                userSol={marketData.sol}
                yesBool={true}
              />
            ) : (
              <VoucherDisplay
                vouchers={vouchers}
                userVoucher={userData.voucher}
                yesBool={true}
              />
            )}
          </div>
        </div>

        {wallet ? (
          <>
            {(buyVouchers ? marketData.voucher : userData.voucher) >= 1 ? (
              <>
                {vouchers >= 1 ? (
                  <button className="btn btn-primary" onClick={executeSwap}>
                    Swap
                  </button>
                ) : (
                  <button className="btn" disabled="disabled">
                    Choose an amount to Swap
                  </button>
                )}
              </>
            ) : (
              <button className="btn" disabled="disabled">
                Not Enough tokens to Swap
              </button>
            )}
          </>
        ) : (
          <button className="btn" disabled="disabled">
            Connect wallet to Swap
          </button>
        )}
      </div>
    </div>
  );
};
export default SwapCard;
