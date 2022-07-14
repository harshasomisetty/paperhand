import { getExhibitProgramAndProvider } from "@/utils/constants";
import { getUserVoucherTokenBal } from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { instructionInitSwap } from "@/utils/instructions";
import { MarketData } from "@/utils/interfaces";

const InitSwapCard = ({
  userSol,
  userVoucher,
}: {
  userSol: number;
  userVoucher: number;
}) => {
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const [vouchers, setVouchers] = useState<number>(0);
  const [solOutput, setSolOutput] = useState<number>(0);

  const { exhibitAddress } = router.query;

  async function executeInitSwap() {
    console.log("initing swap");
    await instructionInitSwap(
      wallet,
      publicKey,
      new PublicKey(exhibitAddress),
      solOutput,
      vouchers,
      signTransaction,
      connection
    );
    router.reload(window.location.pathname);
  }
  return (
    <>
      {userSol ? (
        <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
          <div className="card-body">
            <h2 className="card-title">Init Bazaar for this Exhibit!</h2>

            <div className="stat place-items-center">
              <div className="stat-title">Vouchers</div>
              <input
                type="range"
                min="0"
                max={userVoucher}
                value={vouchers}
                step={`${userVoucher < 10} && "1"`}
                className="range range-sm"
                onChange={(e) => {
                  setVouchers(Number(e.target.value));
                }}
              />

              {userVoucher > 0 && (
                <div className="w-full flex justify-between text-xs px-2">
                  {[...Array(userVoucher + 1)].map((i) => (
                    <span key={i}>|</span>
                  ))}
                </div>
              )}
              <div className="stat-value">{vouchers}</div>
              <div className="stat-desc">Balance: {userVoucher}</div>
              <div className="divider"></div>
              <div className="stat-title">Sol</div>
              <input
                type="range"
                min="0"
                max={userSol / LAMPORTS_PER_SOL}
                step={0.01}
                value={solOutput}
                className="range range-sm"
                onChange={(e) => {
                  setSolOutput(Number(e.target.value));
                }}
              />

              <input
                type="text"
                value={solOutput.toFixed(2)}
                onChange={(e) => setSolOutput(Number(e.target.value))}
                className="input input-bordered stat-value input-lg w-full max-w-xs"
              />
              <div className="stat-desc">
                Balance: {(userSol / LAMPORTS_PER_SOL).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="form-control">
            <button className="btn btn-primary" onClick={executeInitSwap}>
              Activate Bazaar
            </button>
          </div>
        </div>
      ) : (
        <p>sldjfLoading Market Data: {userSol}</p>
      )}
    </>
  );
};

export default InitSwapCard;
