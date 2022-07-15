import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
import { instructionDepositLiquidity } from "@/utils/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import {
  BazaarData,
  LiqDisplay,
  VoucherSlider,
  VoucherSolDisplay,
} from "@/components/MarketInputs";

const DepositLiquidity = ({
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

  const [vouchers, setVouchers] = useState<number>(0);
  const [solOutput, setSolOutput] = useState<number>(0);

  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  async function executeDepositLiq() {
    console.log("deposit");
    await instructionDepositLiquidity(
      wallet,
      publicKey,
      new PublicKey(exhibitAddress),
      Number(vouchers),
      signTransaction,
      connection
    );
    router.reload(window.location.pathname);
  }

  // TODO AVOID NEGATIVE VALUES
  function updateInputs(value: number) {
    setVouchers(value);
    setSolOutput((marketSol * value) / marketVoucher);
  }
  return (
    <>
      <VoucherSlider
        max={userVoucher}
        value={vouchers}
        onChange={(e) => {
          updateInputs(Number(e.target.value));
        }}
      />

      <div className="flex flex-col shadow items-center">
        <VoucherSolDisplay
          yesBool={false}
          solOutput={solOutput}
          userSol={userSol}
          vouchers={vouchers}
          userVoucher={userVoucher}
        />
        <HiChevronDoubleDown />
        <div className="stat place-items-center">
          <LiqDisplay
            liqTokens={vouchers}
            userLiqTokens={userLiq}
            yesBool={true}
          />
        </div>
      </div>

      {wallet ? (
        <>
          {userVoucher > 0 ? (
            <>
              {vouchers >= 1 ? (
                <button className="btn btn-primary" onClick={executeDepositLiq}>
                  Add Liquidity
                </button>
              ) : (
                <button class="btn" disabled="disabled">
                  Choose an amount to Add
                </button>
              )}
            </>
          ) : (
            <button class="btn" disabled="disabled">
              Need more balance to Add Liquidity
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
export default DepositLiquidity;
