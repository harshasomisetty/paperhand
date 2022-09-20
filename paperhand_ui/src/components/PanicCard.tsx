import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useContext, useEffect, useState } from "react";
import {
  SolDisplay,
  VoucherDisplay,
  VoucherSlider,
} from "@/components/MarketInputs";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  instructionAcquireNft,
  instructionBidFloor,
  instructionCancelBid,
  instructionPlaceBid,
} from "@/utils/instructions/checkout";
import router from "next/router";
import { NftContext } from "@/context/NftContext";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import {
  checkIfAccountExists,
  getBidOrderData,
  getFilledOrdersList,
  getUserVouchersFulfilled,
} from "@/utils/retrieveData";
import { getCheckoutAccounts } from "@/utils/accountDerivation";
import { Nft } from "@metaplex-foundation/js";

const PanicCard = ({ userNftList }: { userNftList: Nft[] }) => {
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [bidValue, setBidValue] = useState(0);
  const [userVoucher, setUserVoucher] = useState(0);
  const { exhibitAddress } = router.query;
  const [sellSlider, setSellSlider] = useState(0);
  const [allPrices, setAllPrices] = useState<number[]>([]);
  const [allBids, setAllBids] = useState([]);
  const [userSol, setUserSol] = useState(0);
  const [allBidCount, setAllBidCount] = useState(0);

  let exhibit = new PublicKey(exhibitAddress);
  const { chosenNfts, chooseNft, clearNfts, addNft, removeNft } =
    useContext(NftContext);

  useEffect(() => {
    async function fetchData() {
      clearNfts();
      let uSol = Number(await connection.getBalance(publicKey));
      setUserSol(uSol);

      let { prices, bids, bidCount } = await getBidOrderData(
        exhibit,
        connection,
        wallet
      );

      setAllPrices(prices);
      setAllBids(bids);
      setAllBidCount(bidCount);

      let uVouchers = await getUserVouchersFulfilled(
        exhibit,
        publicKey,
        wallet,
        connection
      );
      setUserVoucher(uVouchers);
    }
    if (wallet && publicKey) {
      fetchData();
    }
  }, [wallet, publicKey]);

  async function executeBidFloor() {
    console.log("bid floor");
    if (exhibitAddress) {
      await instructionBidFloor(
        wallet,
        publicKey,
        exhibit,
        signTransaction,
        connection,
        chosenNfts
      );
    }
    router.reload(window.location.pathname);
  }

  function RenderButton() {
    console.log("zeroo", allPrices);

    if (allPrices.length == 0) {
      console.log("secondddd");
      return (
        <button className="btn btn-disabled btn-lg" aria-disabled="true">
          Not Enough Orders
        </button>
      );
    }

    if (Object.keys(chosenNfts).length <= 0) {
      console.log("firsttt");
      return (
        <button className="btn btn-disabled btn-lg" aria-disabled="true">
          Pick NFT To market Sell
        </button>
      );
    }
    console.log("thirddd");
    return (
      <button className="btn btn-error btn-lg" onClick={executeBidFloor}>
        Panic Sell
      </button>
    );
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
      <div className="card-body space-y-7">
        <div className="flex flex-col space-y-7">
          <div className="shadow flex flex-row items-center">
            <div className="stat">
              <div className="stat-title">
                Market Sell {Object.keys(chosenNfts).length} NFTs
              </div>
              <div className="stat-value text-success">
                +{" "}
                {allPrices
                  .slice(0, Object.keys(chosenNfts).length)
                  .reduce((a, b) => a + b, 0)
                  .toFixed(2)}{" "}
                SOL
              </div>
              <div className="stat-title">Balance</div>
              <div className="stat-value text-info">
                ={" "}
                {(
                  userSol / LAMPORTS_PER_SOL +
                  allPrices
                    .slice(0, Object.keys(chosenNfts).length)
                    .reduce((a, b) => a + b, 0)
                ).toFixed(2)}
              </div>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={Math.min(userNftList.length, allBidCount)}
            value={sellSlider}
            className="range range-sm"
            onChange={(e) => {
              let eNum = Number(e.target.value);

              if (eNum > sellSlider) {
                eNum = sellSlider + 1;
              } else if (eNum < sellSlider) {
                eNum = sellSlider - 1;
              } else {
                return;
              }

              if (eNum > sellSlider) {
                if (!chosenNfts[userNftList[eNum - 1].mint.toString()]) {
                  addNft(userNftList[eNum - 1]);
                }
                setSellSlider(eNum);
              } else if (eNum < sellSlider) {
                if (chosenNfts[userNftList[eNum].mint.toString()]) {
                  removeNft(userNftList[eNum]);
                }
                setSellSlider(eNum);
              }
            }}
          />
          <RenderButton />
        </div>
      </div>
    </div>
  );
};

export default PanicCard;
