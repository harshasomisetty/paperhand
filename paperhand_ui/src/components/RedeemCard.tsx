import { NftContext } from "@/context/NftContext";
import { instructionAcquireNft } from "@/utils/instructions/checkout";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useContext } from "react";

const RedeemCard = ({
  bidSide,
  setBidSide,
  userVoucher,
  userNftList,
}: {
  bidSide: boolean;
  setBidSide: () => {};
  userVoucher: number;
  userNftList: Nft[];
}) => {
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const router = useRouter();
  const { exhibitAddress } = router.query;

  const { chosenNfts, clearNfts } = useContext(NftContext);

  async function executeAcquireNft() {
    let exhibit = new PublicKey(exhibitAddress);
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
    // router.reload(window.location.pathname);
  }

  return (
    <div className="card w-96 bg-base-100 shadow-xl">
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
          Deposit NFT
        </button>
        <button
          className={`btn btn-ghost ${!bidSide && "border-error text-error"}`}
          onClick={() => {
            setBidSide(false);
            clearNfts();
          }}
        >
          Withdraw NFT
        </button>
      </div>
      <div className="card-body">
        <h2 className="card-title">Voucher</h2>
        {bidSide ? <p>BID</p> : <p> Sell</p>}

        <p>{userVoucher}</p>
        <div className="card-actions justify-end">
          {userVoucher ? (
            <button className="btn btn-primary" onClick={executeAcquireNft}>
              Withdraw nft
            </button>
          ) : (
            <button className="btn btn-disabled">
              Need Vouchers To Withdraw
            </button>
          )}
        </div>
      </div>
    </div>
  );

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
export default RedeemCard;
