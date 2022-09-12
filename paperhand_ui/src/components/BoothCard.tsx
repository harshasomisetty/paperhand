import { Nft } from "@metaplex-foundation/js";
import { publicKey } from "@project-serum/anchor/dist/cjs/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useRouter } from "next/router";
import DisplayImages from "./DisplayImages";
import NftList from "./NftList";
import { VscArrowBoth, VscArrowLeft, VscArrowRight } from "react-icons/vsc";

export const BoothCard = ({
  boothImages,
  boothInfo,
  exhibitSymbol,
}: {
  boothImages?: string[];
  boothInfo: any;
  exhibitSymbol: string;
}) => {
  const { publicKey } = useWallet();

  const router = useRouter();
  const { exhibitAddress, boothAddress } = router.query;

  function mapBoothType() {
    let type = boothInfo.boothType;
    if (type == 0) {
      return <VscArrowRight />;
    } else if (type == 1) {
      return <VscArrowLeft />;
    } else {
      return <VscArrowBoth />;
    }
  }

  return (
    <div className="flex flex-row space-x-4 w-full p-4 items-center bg-base-200 w-min rounded-xl h-min">
      <div>
        {boothImages && (
          <div className="avatar">
            <div className="w-32 rounded-full">
              <DisplayImages images={boothImages} />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col space-y-4 ">
        <h1 className="flex flex-row space-x-4 text-3xl items-center">
          <div className="flex flex-row items-center">
            {exhibitSymbol} {mapBoothType()} SOL{" "}
          </div>
          {publicKey.toString() === boothInfo.boothOwner.toString() && (
            <div className="badge badge-primary">Your Booth</div>
          )}
        </h1>
        <h3 className="text-sm bg-info-content px-4 py-4 rounded">
          {boothAddress}
        </h3>

        <div className="flex flex-row space-x-4">
          <button className="btn btn-sm">View All Booths</button>
          <button className="btn btn-sm">View {exhibitSymbol}s</button>
        </div>
      </div>
    </div>
  );
};

export const BoothAssets = ({
  boothInfo,
  exhibitSymbol,
  boothNfts,
}: {
  boothInfo: any;
  exhibitSymbol: string;
  boothNfts: Nft[];
}) => {
  return (
    <div className="card card-compact bg-base-300 text-neutral-content h-min">
      <div className="card-body items-center text-center">
        <h2 className="card-title">Assets</h2>
        <button className="btn btn-sm">Withdraw All</button>
        <div className="stats stats-vertical">
          <div className="stat">
            <div className="stat-title">Tokens</div>
            <div className="stat-value">
              {(Number(boothInfo.sol) / LAMPORTS_PER_SOL).toFixed(3)}
            </div>
            <div className="stat-actions">
              <button className="btn btn-sm">Deposit</button>
              <button className="btn btn-sm">Withdraw</button>
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">NFTs</div>
            <div className="stat-value">{Number(boothInfo.nfts)}</div>
            <div className="stat-actions">
              <button className="btn btn-sm">Deposit</button>
              <button className="btn btn-sm">Withdraw</button>
            </div>
          </div>
          <NftList nftList={boothNfts} size={80} />
        </div>
      </div>
    </div>
  );
};

export const BoothPricing = ({
  boothInfo,
  exhibitSymbol,
}: {
  boothInfo: any;
  exhibitSymbol: string;
}) => {
  return (
    <div className="card card-compact bg-base-300 text-neutral-content h-min">
      <div className="card-body items-center text-center">
        <h2 className="card-title">Pricing</h2>
        <div className="stats shadow items-stretch">
          <div className="stat place-items-center">
            <div className="stat-title">Spot Price</div>
            <div className="stat-value">
              {Number(boothInfo.spotPrice / LAMPORTS_PER_SOL).toFixed(3)}
            </div>
          </div>
          <div className="stat place-items-center">
            <div>
              <div className="stat-title">Delta</div>
              <p> {boothInfo.curve == 0 ? "Linear ↗️" : "Exponential ⤴️"}</p>
            </div>
            <div className="stat-value">
              {Number(boothInfo.delta / LAMPORTS_PER_SOL).toFixed(3)}
            </div>
            <div className="stat-desc"></div>
          </div>
          <div className="stat place-items-center">
            <div className="stat-title">Fee</div>
            <div className="stat-value">Temp</div>
          </div>
        </div>
      </div>
    </div>
  );
};
