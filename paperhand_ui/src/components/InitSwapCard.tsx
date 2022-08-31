import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useState } from "react";

import { instructionInitSwap } from "@/utils/instructions/shop";
import { UserData } from "@/utils/interfaces";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const InitSwapCard = ({ userData }: { userData: UserData }) => {
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

  if (!userData) return <p>sldjfLoading Market Data:</p>;
  return (
    <>
      <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-300">
        <div className="card-body">
          <h2 className="card-title">Init voucher/sol swap</h2>

          <div className="stat place-items-center">
            <div className="stat-title">Vouchers</div>
            <input
              type="range"
              min="0"
              max={userData.voucher}
              value={vouchers}
              step={`${userData.voucher < 10} && "1"`}
              className="range range-sm"
              onChange={(e) => {
                setVouchers(Number(e.target.value));
              }}
            />

            {userData.voucher > 0 && (
              <div className="w-full flex justify-between text-xs px-2">
                {[...Array(userData.voucher + 1)].map((i) => (
                  <span key={i}>|</span>
                ))}
              </div>
            )}
            <div className="stat-value">{vouchers}</div>
            <div className="stat-desc">Balance: {userData.voucher}</div>
            <div className="divider"></div>
            <div className="stat-title">Sol</div>
            <input
              type="range"
              min="0"
              max={userData.sol / LAMPORTS_PER_SOL}
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
              Balance: {(userData.sol / LAMPORTS_PER_SOL).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="form-control">
          {vouchers > 0 ? (
            <button className="btn btn-primary" onClick={executeInitSwap}>
              Activate Shop
            </button>
          ) : (
            <button className="btn btn-disabled">Get More vouchers!</button>
          )}
        </div>
      </div>
    </>
  );
};

export default InitSwapCard;
