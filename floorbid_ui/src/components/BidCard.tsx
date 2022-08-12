import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import {
  SolDisplay,
  VoucherDisplay,
  VoucherSlider,
} from "@/components/MarketInputs";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { instructionPlaceBid } from "@/utils/instructions/checkout";
import router from "next/router";

const BidCard = ({ bidSide, setBidSide }) => {
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [bidValue, setBidValue] = useState(0);
  const [userSol, setUserSol] = useState(0);
  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      let uSol = Number(await connection.getBalance(publicKey));
      setUserSol(uSol);
    }
    if (wallet && publicKey) {
      fetchData();
    }
  }, [wallet, publicKey]);

  async function executePlaceBid() {
    if (exhibitAddress) {
      let exhibit = new PublicKey(exhibitAddress);
      console.log("placing bid");
      await instructionPlaceBid(
        wallet,
        publicKey,
        exhibit,
        bidValue,
        signTransaction,
        connection
      );
    }
    router.reload(window.location.pathname);
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
      <div className="card-body">
        <h2 className="card-title">Swap Vouchers</h2>

        <div className="flex flex-row w-full justify-evenly">
          <button
            className={`btn btn-success ${!bidSide && "opacity-50"}`}
            onClick={() => {
              setBidSide(true);
            }}
          >
            Bid
          </button>
          <button
            className={`btn btn-error ${bidSide && "opacity-50"}`}
            onClick={() => {
              setBidSide(false);
            }}
          >
            Sell
          </button>
        </div>

        <div className="flex flex-row shadow items-center">
          <div className="stat place-items-center">
            {bidSide ? (
              <div>
                <input
                  type="range"
                  min={0}
                  max={userSol}
                  value={bidValue}
                  className="range range-sm"
                  onChange={(e) => setBidValue(e.target.value)}
                />
                <button onClick={executePlaceBid}>Buy</button>
                <p>value{bidValue / LAMPORTS_PER_SOL}</p>
              </div>
            ) : (
              <p>sell</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidCard;
