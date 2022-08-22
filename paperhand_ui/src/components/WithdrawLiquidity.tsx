import { PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData, UserData } from "@/utils/interfaces";
import { instructionWithdrawLiquidity } from "@/utils/instructions/shop";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import {
  LiqDisplay,
  VoucherSlider,
  VoucherSolDisplay,
} from "@/components/MarketInputs";

const WithdrawLiquidity = ({
  userData,
  marketData,
  exhibitSymbol,
}: {
  userData: UserData;
  marketData: MarketData;
  exhibitSymbol: string;
}) => {
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
    // router.reload(window.location.pathname);
  }

  function updateInputs(liqCount: number, voucherCount: number) {
    setLiqTokens(liqCount);
    setVouchers(voucherCount);

    let liqTokenValue = marketData.sol / marketData.liq;
    setSolOutput(liqTokenValue * (2 * liqCount - voucherCount));
    // console.log("output stuff", liqCount, voucherCount, 2*liq)
  }
  return (
    <>
      <VoucherSlider
        max={userData.liq}
        value={liqTokens}
        onChange={(e) => {
          updateInputs(Number(e.target.value), 0);
        }}
      />

      <div className="flex flex-col shadow items-center">
        <div className="stat place-items-center">
          <LiqDisplay
            liqTokens={liqTokens}
            userLiqTokens={userData.liq}
            yesBool={false}
          />
        </div>
        <HiChevronDoubleDown />
        <VoucherSlider
          max={Math.min(liqTokens, marketData.voucher)}
          value={vouchers}
          onChange={(e) => {
            updateInputs(liqTokens, Number(e.target.value));
          }}
        />
        <VoucherSolDisplay
          yesBool={true}
          solOutput={solOutput}
          userSol={userData.sol}
          vouchers={vouchers}
          userVoucher={userData.voucher}
        />
      </div>

      {wallet ? (
        <>
          {marketData.voucher > 0 ? (
            <>
              <button className="btn btn-primary" onClick={executeWithdrawLiq}>
                Withdraw Liquidity
              </button>
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
    </>
  );
};
export default WithdrawLiquidity;
