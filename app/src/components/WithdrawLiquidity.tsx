import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
import { instructionWithdrawLiquidity } from "@/utils/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import {
  BazaarData,
  LiqDisplay,
  VoucherSlider,
  VoucherSolDisplay,
} from "@/components/MarketInputs";

const WithdrawLiquidity = ({
  marketData,
  exhibitSymbol,
}: {
  marketData: MarketData;
  exhibitSymbol: string;
}) => {
  const marketSol = marketData.marketSolBal;
  const marketVoucher = marketData.marketVoucherBal;
  const userSol = marketData.userSolBal;
  const userVoucher = marketData.userVoucherBal;
  const userLiq = marketData.userLiqBal;

  const [liqTokens, setLiqTokens] = useState<number>(0);
  const [vouchers, setVouchers] = useState<number>(0);
  const [solOutput, setSolOutput] = useState<number>(0);

  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  async function executeWithdrawLiq() {
    console.log("withdraw");
    await instructionWithdrawLiquidity(
      wallet,
      publicKey,
      new PublicKey(exhibitAddress),
      Number(liqTokens),
      Number(vouchers),
      signTransaction,
      connection
    );
    router.reload(window.location.pathname);
  }

  // TODO AVOID NEGATIVE VALUES
  function updateInputs(liqCount: number, voucherCount: number) {
    setLiqTokens(liqCount);
    setVouchers(voucherCount);

    let liqTokenValue = marketSol / marketData.marketLiqBal;
    setSolOutput(liqTokenValue * (liqCount - voucherCount));
  }
  return (
    <>
      <VoucherSlider
        max={userLiq}
        value={liqTokens}
        onChange={(e) => {
          updateInputs(Number(e.target.value), 0);
        }}
      />

      <div className="flex flex-col shadow items-center">
        <div className="stat place-items-center">
          <LiqDisplay
            liqTokens={liqTokens}
            userLiqTokens={userLiq}
            yesBool={false}
          />
        </div>
        <HiChevronDoubleDown />
        <p>
          {liqTokens}, {marketVoucher}
        </p>
        <VoucherSlider
          max={Math.min(liqTokens, marketVoucher)}
          value={vouchers}
          onChange={(e) => {
            updateInputs(liqTokens, Number(e.target.value));
          }}
        />
        <VoucherSolDisplay
          yesBool={true}
          solOutput={solOutput}
          userSol={userSol}
          vouchers={vouchers}
          userVoucher={userVoucher}
        />
      </div>

      {wallet ? (
        <>
          {marketVoucher > 0 ? (
            <>
              {vouchers >= 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={executeWithdrawLiq}
                >
                  Remove Liquidity
                </button>
              ) : (
                <button class="btn" disabled="disabled">
                  Choose number of Vouchers
                </button>
              )}
            </>
          ) : (
            <button class="btn" disabled="disabled">
              Not enough market vouchers
            </button>
          )}
        </>
      ) : (
        <button class="btn" disabled="disabled">
          Connect wallet to Swap
        </button>
      )}
      <BazaarData marketData={marketData} exhibitSymbol={exhibitSymbol} />
    </>
  );
};
export default WithdrawLiquidity;
