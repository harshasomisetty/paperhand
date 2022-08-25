import { BsFillFileImageFill } from "react-icons/bs";
import { GiCardExchange } from "react-icons/gi";

import { instructionExecuteCreateBooth } from "@/utils/instructions/carnival";
import { useContext, useState } from "react";
import { NftContext } from "@/context/NftContext";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

const BoothSetup = ({ exhibitSymbol }: { exhibitSymbol: string }) => {
  const [fee, setFee] = useState<number | null>(1);
  const [price, setPrice] = useState<number | null>(2);
  const [linear, setLinear] = useState<number>(0);
  const [delta, setDelta] = useState<number | null>(0.1);
  const [buyNft, setBuyNft] = useState<number | null>(2);
  const [sellNft, setSellNft] = useState<number | null>(1);

  const { chosenNfts, clearNfts } = useContext(NftContext);
  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  async function executeCreateBooth() {
    console.log("fee", fee);
    console.log("nfts", chosenNfts);

    await instructionExecuteCreateBooth(
      wallet,
      publicKey,
      Object.values(chosenNfts),
      price,
      linear,
      2,
      delta,
      fee,
      connection,
      signTransaction
    );
  }

  function getCost(times): number {
    let cost = 0;
    let tempPrice = price;

    for (let i = 0; i < times; i++) {
      cost = cost + tempPrice;
      tempPrice = tempPrice + delta;
    }

    return Number(tempPrice.toFixed(3));
  }

  return (
    <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300 items-center space-y-4">
      <h2 className="card-title font-bold text-2xl p-2">
        Create SOL / {exhibitSymbol} Trading Booth
      </h2>
      <div className="flex flex-col items-center border rounded-xl p-4">
        <label className="label">
          <span className="label-text">Fee Profit % Per Trade</span>
        </label>
        <input
          type="text"
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
          className="input input-bordered w-32"
        />
        <label className="label">
          <span className="label-text">Start Price</span>
        </label>
        <input
          type="text"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="input input-bordered w-32"
        />

        <div className="btn-group m-4 border rounded-xl">
          <button
            className={`btn ${linear == 1 && "btn-accent"}`}
            onClick={() => {
              setLinear(1);
            }}
          >
            Linear
          </button>
          <button
            className={`btn ${linear == 0 && "btn-accent"}`}
            onClick={() => {
              setLinear(0);
            }}
          >
            Exponential
          </button>
        </div>
        <label className="label">
          <span className="label-text">Delta</span>
        </label>
        <input
          type="text"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
          className="input input-bordered w-32"
        />
      </div>
      <div className="border rounded-lg p-4">
        <div className="flex flex-row space-x-4 items-center">
          <p className="font-extrabold">Buy up to </p>
          <input
            type="text"
            value={buyNft}
            onChange={(e) => setBuyNft(Number(e.target.value))}
            className="input input-bordered w-32"
          />
          <BsFillFileImageFill />
        </div>
        <GiCardExchange />

        <div className="flex flex-row space-x-4 items-center">
          <p className="font-extrabold">Sell up to </p>
          <input
            type="text"
            value={sellNft}
            onChange={(e) => setSellNft(Number(e.target.value))}
            className="input input-bordered w-32"
          />
          <BsFillFileImageFill />
        </div>
        <div className="divider"></div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">SOL</div>
            <div className="stat-value">{getCost(buyNft)}</div>
          </div>

          <div className="stat">
            <div className="stat-title">{exhibitSymbol}s</div>
            <div className="stat-value">{sellNft}</div>
          </div>
        </div>
      </div>
      {Object.keys(chosenNfts).length < sellNft ? (
        <button className="btn btn-disabled">
          Select More NFTs to deposit
        </button>
      ) : (
        <button className="btn btn-primary" onClick={executeCreateBooth}>
          Create Booth
        </button>
      )}
    </div>
  );
};

export default BoothSetup;
