import { publicKey } from "@project-serum/anchor/dist/cjs/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import DisplayImages from "./DisplayImages";

const BoothCard = ({
  boothImages,
  boothInfo,
  exhibitSymbol,
}: {
  boothImages?: string[];
  boothInfo: any;
  exhibitSymbol: string;
}) => {
  const { publicKey } = useWallet();

  function mapBoothType() {
    console.log("booth info map type", boothInfo);
    // console.log("object stuf", Object.keys(boothInfo).boothInfo);
    // let type = Object.keys(boothInfo).boothInfo;
    let type = boothInfo.boothType;
    if (type == 0) {
      return "Buy ";
    } else if (type == 1) {
      return "Sell ";
    } else {
      return "Trade ";
    }
  }

  // fee
  // volume
  return (
    <div>
      <div className="card card-side justify-between space-y-2 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
        <div>
          {boothImages && (
            <div className="avatar">
              <div className="w-32 rounded-full">
                <DisplayImages images={boothImages} />
              </div>
            </div>
          )}
        </div>
        <table className="table">
          <tbody>
            <tr>
              <th>Booth ID</th>
              <td>{Number(boothInfo.boothId)}</td>
            </tr>
            <tr>
              <th>Trade Type</th>
              <td>{mapBoothType()}</td>
            </tr>
            <tr>
              <th>SOL Value</th>
              <td>{(Number(boothInfo.sol) / LAMPORTS_PER_SOL).toFixed(3)}</td>
            </tr>
            <tr>
              <th>NFT Count</th>
              <td>{Number(boothInfo.nfts)}</td>
            </tr>
            <tr>
              <th>Curve: </th>
              <td>{boothInfo.curve == 0 ? "Linear" : "Exponential"}</td>
            </tr>
            <tr>
              <th>Start Price: </th>
              <td>
                {Number(boothInfo.spotPrice / LAMPORTS_PER_SOL).toFixed(3)}
              </td>
            </tr>
            <tr>
              <th>Delta: </th>
              <td>{Number(boothInfo.delta / LAMPORTS_PER_SOL).toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {publicKey.toString() === boothInfo.boothOwner.toString() ? (
        <button className="btn">Your Booth</button>
      ) : (
        <button className="btn">Trade with this Booth</button>
      )}
    </div>
  );
};

export default BoothCard;
