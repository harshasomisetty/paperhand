import { PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleDown } from "react-icons/hi";
import {
  LiqDisplay,
  VoucherSlider,
  VoucherSolDisplay,
} from "@/components/MarketInputs";
import { instructionDepositLiquidity } from "@/utils/instructions/shop";
import { MarketData, UserData } from "@/utils/interfaces";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";

const DepositLiquidity = ({
  userData,
  marketData,
  exhibitSymbol,
}: {
  userData: UserData;
  marketData: MarketData;
  exhibitSymbol: string;
}) => {
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

  function updateInputs(value: number) {
    setVouchers(value);
    setSolOutput((marketData.sol * value) / marketData.voucher);
  }

  return (
    <>
      <VoucherSlider
        max={userData.voucher}
        value={vouchers}
        onChange={(e) => {
          updateInputs(Number(e.target.value));
        }}
      />

      <div className="flex flex-col shadow items-center">
        <VoucherSolDisplay
          yesBool={false}
          solOutput={solOutput}
          userSol={userData.sol}
          vouchers={vouchers}
          userVoucher={userData.voucher}
        />
        <HiChevronDoubleDown />
        <div className="stat place-items-center">
          <LiqDisplay
            liqTokens={vouchers}
            userLiqTokens={userData.liq}
            yesBool={true}
          />
        </div>
      </div>

      {wallet ? (
        <>
          {userData.voucher > 0 ? (
            <>
              {vouchers >= 1 ? (
                <button className="btn btn-primary" onClick={executeDepositLiq}>
                  Deposit Liquidity
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
    </>
  );
};
export default DepositLiquidity;
