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
}: {
  bidSide: boolean;
  setBidSide: () => {};
}) => {
  const { wallet, publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [bidValue, setBidValue] = useState(0);
  const [userSol, setUserSol] = useState(0);
  const [userVoucher, setUserVoucher] = useState(0);
  const { exhibitAddress } = router.query;
  const [floorBid, setFloorBid] = useState(0);

  let exhibit = new PublicKey(exhibitAddress);
  const { chosenNfts, chooseNft, setChosenNfts } = useContext(NftContext);

  useEffect(() => {
    async function fetchData() {
      let uSol = Number(await connection.getBalance(publicKey));
      setUserSol(uSol);

      let { voucherMint, matchedStorage } = await getCheckoutAccounts(exhibit);

      let userVoucherWallet = await getAssociatedTokenAddress(
        voucherMint,
        publicKey
      );

      let { labels } = await getBidOrderData(exhibit, connection, wallet);

      if (labels[0]) {
        setFloorBid(labels[0]);
      }

      let uVoucher = 0;
      if (await checkIfAccountExists(userVoucherWallet, connection)) {
        uVoucher = Number(
          (await getAccount(connection, userVoucherWallet)).amount
        );
      }
      let orderFilled = await getFilledOrdersList(matchedStorage, wallet);

      setUserVoucher(uVoucher + orderFilled[publicKey]);
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
              setChosenNfts({});
            }}
          >
            Buy NFT
          </button>
          <button
            className={`btn btn-ghost ${!bidSide && "border-error text-error"}`}
            onClick={() => {
              setBidSide(false);
              setChosenNfts({});
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
                <div className="stat-title">Floor Bid Price</div>
                <div className="stat-value">{floorBid} SOL</div>
                <div className="stat-desc">Sol Received for Market Selling</div>
              </div>
            </div>
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
