import { getExhibitProgramAndProvider } from "@/utils/constants";
import { getUserVoucherTokenBal } from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { instructionInitSwap } from "@/utils/instructions";
import { MarketData } from "@/utils/interfaces";

const InitSwapCard = ({
  userSolBal,
  userVoucherBal,
}: {
  userSolBal: number;
  userVoucherBal: number;
}) => {
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const [topInput, setTopInput] = useState<string>();
  const [bottomInput, setBottomInput] = useState<string>();

  const { exhibitAddress } = router.query;

  async function executeInitSwap() {
    console.log("initing swap");
    // console.log(topInput, bottomInput);
    await instructionInitSwap(
      wallet,
      publicKey,
      new PublicKey(exhibitAddress),
      Number(topInput),
      Number(bottomInput),
      signTransaction,
      connection
    );
    router.reload(window.location.pathname);
  }

  return (
    <>
      {userSolBal ? (
        <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
          <div className="card-body">
            <h2 className="card-title">Init Bazaar for this Exhibit!</h2>
            <div className="form-control">
              <p>Sol Balance: {userSolBal / LAMPORTS_PER_SOL}</p>
              <input
                type="text"
                placeholder="Starting Sol Amount"
                className="input input-bordered"
                value={topInput}
                onChange={(e) =>
                  setTopInput(e.target.value.replace(/[a-z]/gi, ""))
                }
              />
            </div>

            <div className="form-control">
              <p>Voucher Balance: {userVoucherBal}</p>
              <input
                type="text"
                placeholder="Starting Voucher Amount"
                className="input input-bordered"
                value={bottomInput}
                onChange={(e) =>
                  setBottomInput(e.target.value.replace(/[a-z]/gi, ""))
                }
              />
            </div>
            <div className="form-control">
              <button className="btn btn-primary" onClick={executeInitSwap}>
                Activate Bazaar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p>sldjfLoading Market Data</p>
      )}
    </>
  );
};

export default InitSwapCard;
