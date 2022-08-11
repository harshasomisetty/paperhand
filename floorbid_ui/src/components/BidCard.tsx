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

const BidCard = ({ bidSide, setBidSide }) => {
  const { wallet, publicKey, signTransaction } = useWallet();

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
            {bidSide ? <p>buy</p> : <p>sell</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidCard;
