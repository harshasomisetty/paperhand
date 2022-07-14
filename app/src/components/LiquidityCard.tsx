import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { VscArrowBoth } from "react-icons/vsc";
import { HiChevronDoubleDown } from "react-icons/hi";

import { MarketData } from "@/utils/interfaces";
import {
  instructionDepositLiquidity,
  instructionSwap,
} from "@/utils/instructions";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { getExhibitProgramAndProvider } from "@/utils/constants";
import {
  BazaarData,
  LiqDisplay,
  SolDisplay,
  SolInput,
  VoucherDisplay,
  VoucherInput,
  VoucherSlider,
  YesOrNoButtons,
} from "@/components/MarketInputs";

const LiquidityCard = ({
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
  const [depositLiq, setDepositLiq] = useState<boolean>(true);

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
    // router.reload(window.location.pathname);
  }

  async function executeWithdrawLiq() {
    console.log("withdraw");
    // await instructionDepositLiquidity(
    //   wallet,
    //   publicKey,
    //   new PublicKey(exhibitAddress),
    //   Number(vouchers),
    //   signTransaction,
    //   connection
    // );
    // router.reload(window.location.pathname);
  }

  // TODO AVOID NEGATIVE VALUES
  function updateInputs(value: number, deposit: boolean) {
    if (deposit) {
      setVouchers(value);
      setSolOutput((marketSol * value) / marketVoucher);
      setDepositLiq(deposit);
    } else {
      setVouchers(value);
      setSolOutput((marketSol * value) / marketVoucher);
      setDepositLiq(deposit);
    }
  }

  const VoucherSolDisplay = ({ yesBool }: { yesBool: boolean }) => {
    return (
      <div className={`flex flex-row items-center `}>
        <div className="stat place-items-center">
          <SolDisplay
            solOutput={solOutput}
            userSol={userSol}
            yesBool={yesBool}
          />
        </div>
        <VscArrowBoth size={50} />
        <div className="stat place-items-center">
          <VoucherDisplay
            vouchers={vouchers}
            userVoucher={userVoucher}
            yesBool={yesBool}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Liquidity</h2>

        <YesOrNoButtons
          yesText={"Deposit"}
          noText={"Withdraw"}
          yesBool={depositLiq}
          updateInputs={updateInputs}
        />

        <VoucherSlider
          max={depositLiq ? userVoucher : userLiq}
          value={vouchers}
          onChange={(e) => {
            updateInputs(Number(e.target.value), depositLiq);
          }}
        />

        <div className="flex flex-col shadow items-center">
          {depositLiq ? (
            <VoucherSolDisplay yesBool={false} />
          ) : (
            <div className={`stat place-items-center `}>
              <LiqDisplay
                liqTokens={vouchers}
                userLiqTokens={userLiq}
                yesBool={false}
              />
            </div>
          )}
          <HiChevronDoubleDown />
          {!depositLiq ? (
            <VoucherSolDisplay yesBool={true} />
          ) : (
            <div
              className={`stat place-items-center
              `}
            >
              <LiqDisplay
                liqTokens={vouchers}
                userLiqTokens={userLiq}
                yesBool={true}
              />
            </div>
          )}
        </div>

        {wallet ? (
          <>
            {(depositLiq ? userVoucher : marketVoucher) > 0 ? (
              <>
                {vouchers >= 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={
                      depositLiq ? executeDepositLiq : executeWithdrawLiq
                    }
                  >
                    {depositLiq ? "Add Liquidity" : "Remove Liquidity"}
                  </button>
                ) : (
                  <button class="btn" disabled="disabled">
                    Choose an amount to {depositLiq ? "Add" : "Remove"}
                  </button>
                )}
              </>
            ) : (
              <button class="btn" disabled="disabled">
                Need more balance to {depositLiq ? "Add" : "Remove"} Liquidity
              </button>
            )}
          </>
        ) : (
          <button class="btn" disabled="disabled">
            Connect wallet to Swap
          </button>
        )}
        <BazaarData marketData={marketData} exhibitSymbol={exhibitSymbol} />
      </div>
    </div>
  );
};
export default LiquidityCard;
