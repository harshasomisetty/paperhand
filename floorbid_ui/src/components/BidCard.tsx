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
import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import {
  checkIfAccountExists,
  getBidOrderData,
  getFilledOrdersList,
} from "@/utils/retrieveData";
import { getCheckoutAccounts } from "@/utils/accountDerivation";

const BidCard = ({
  bidSide,
  setBidSide,
  userNftList,
}: {
  bidSide: boolean;
  setBidSide: () => {};
  userNftList: Nft[];
}) => {
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [bidValue, setBidValue] = useState(0);
  const [userSol, setUserSol] = useState(0);
  const [userVoucher, setUserVoucher] = useState(0);
  const { exhibitAddress } = router.query;
  const [sellSlider, setSellSlider] = useState(0);
  const [allPrices, setAllPrices] = useState<number[]>([]);

  let exhibit = new PublicKey(exhibitAddress);
  const { chosenNfts, chooseNft, clearNfts, addNft, removeNft } =
    useContext(NftContext);

  useEffect(() => {
    async function fetchData() {
      let uSol = Number(await connection.getBalance(publicKey));
      setUserSol(uSol);

      let { voucherMint, matchedStorage } = await getCheckoutAccounts(exhibit);

      let userVoucherWallet = await getAssociatedTokenAddress(
        voucherMint,
        publicKey
      );

      let { prices } = await getBidOrderData(exhibit, connection, wallet);

      setAllPrices(prices);

      let uVoucher = 0;
      if (await checkIfAccountExists(userVoucherWallet, connection)) {
        uVoucher = Number(
          (await getAccount(connection, userVoucherWallet)).amount
        );
      }
      let orderFilled: Record<string, number> = await getFilledOrdersList(
        matchedStorage,
        wallet
      );

      // console.log("order filled", orderFilled);
      setUserVoucher(uVoucher + orderFilled[publicKey.toString()]);
    }
    if (wallet && publicKey) {
      fetchData();
    }
  }, [wallet, publicKey]);

  // TODO place multiple bids
  async function executePlaceBid() {
    console.log("placing bid");
    if (exhibitAddress) {
      await instructionPlaceBid(
        wallet,
        publicKey,
        exhibit,
        bidValue,
        signTransaction,
        connection
      );
    }
    // router.reload(window.location.pathname);
  }

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
    // router.reload(window.location.pathname);
  }

  async function executeAcquireNft() {
    if (exhibitAddress) {
      console.log("acquire nft");
      await instructionAcquireNft(
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

  async function executeCancelBid() {
    if (exhibitAddress) {
      console.log("cancel bid");
      await instructionCancelBid(wallet, publicKey, exhibit, connection);
    }
    router.reload(window.location.pathname);
  }

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
      <div className="card-body space-y-7">
        <div className="btn-group justify-center">
          <button
            className={`btn btn-ghost ${
              bidSide && "border-success text-success"
            }`}
            onClick={() => {
              setBidSide(true);
              clearNfts();
            }}
          >
            Buy NFT
          </button>
          <button
            className={`btn btn-ghost ${!bidSide && "border-error text-error"}`}
            onClick={() => {
              setBidSide(false);
              clearNfts();
            }}
          >
            Sell NFT
          </button>
        </div>

        {bidSide ? (
          <div className="flex flex-col space-y-7">
            <div className="shadow flex flex-row items-center">
              <div className="stat">
                <div className="stat-title">Price</div>
                <div className="stat-value">
                  {(bidValue / LAMPORTS_PER_SOL).toFixed(2)} SOL
                </div>
                <div className="stat-desc">
                  Sol Balance: {(userSol / LAMPORTS_PER_SOL).toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <button className="btn btn-success" onClick={executePlaceBid}>
                  Place Bid
                </button>
                <button className="btn btn-warning" onClick={executeCancelBid}>
                  Cancel Bid
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={userSol}
              value={bidValue}
              className="range range-sm"
              onChange={(e) => setBidValue(e.target.value)}
            />
            {userVoucher > 0 ? (
              <>
                <button
                  className="btn btn-outline btn-success"
                  onClick={executeAcquireNft}
                >
                  Pick NFT
                </button>
                <p>Your vouchers: {userVoucher}</p>
              </>
            ) : (
              <button className="btn" disabled="disabled">
                Not enough vouchers!
              </button>
            )}
          </div>
        ) : (
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
                    .reduce((a, b) => a + b, 0)}{" "}
                  SOL
                </div>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={userNftList.length}
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
            {chosenNfts ? (
              <button className="btn btn-error" onClick={executeBidFloor}>
                Market Sell
              </button>
            ) : (
              <button className="btn" disabled="disabled">
                Pick NFT To market Sell
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BidCard;
