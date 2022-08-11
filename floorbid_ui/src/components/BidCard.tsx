import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { HiChevronDoubleRight } from "react-icons/hi";

import {
  SolDisplay,
  VoucherDisplay,
  VoucherSlider,
} from "@/components/MarketInputs";
import { instructionSwap } from "@/utils/instructions";
import { MarketData, UserData } from "@/utils/interfaces";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";

const BidCard = () => {
  function updateInputs(newTradeButton: boolean) {
    setTradeButton(newTradeButton);
  }

  const { wallet, publicKey, signTransaction } = useWallet();
  const [tradeButton, setTradeButton] = useState<boolean>(true);

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
      <div className="card-body">
        <h2 className="card-title">Swap Vouchers</h2>

        <div className="flex flex-row w-full justify-evenly">
          <button
            className={`btn btn-success ${!tradeButton && "opacity-50"}`}
            onClick={() => {
              updateInputs(true);
            }}
          >
            Bid
          </button>
          <button
            className={`btn btn-error ${tradeButton && "opacity-50"}`}
            onClick={() => {
              updateInputs(false);
            }}
          >
            Sell
          </button>
        </div>

        <div className="flex flex-row shadow items-center">
          <div className="stat place-items-center">
            {tradeButton ? <p>buy</p> : <p>sell</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// {wallet ? (
//           <>
//             {(tradeButton ? marketData.voucher : userData.voucher) >= 1 ? (
//               <>
//                 {vouchers >= 1 ? (
//                   <button className="btn btn-primary" onClick={executeSwap}>
//                     Swap
//                   </button>
//                 ) : (
//                   <button className="btn" disabled="disabled">
//                     Choose an amount to Swap
//                   </button>
//                 )}
//               </>
//             ) : (
//               <button className="btn" disabled="disabled">
//                 Not Enough tokens to Swap
//               </button>
//             )}
//           </>
//         ) : (
//           <button className="btn" disabled="disabled">
//             Connect wallet to Swap
//           </button>
//         )}
export default BidCard;
