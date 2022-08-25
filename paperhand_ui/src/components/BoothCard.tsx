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
    let type = Object.keys(boothInfo.boothType)[0].toString();
    if (type == "buy") {
      return "Buy " + exhibitSymbol;
    } else if (type == "sell") {
      return "Sell " + exhibitSymbol;
    } else {
      return "Trade " + exhibitSymbol;
    }
  }

  // buy / sell / trade
  // spot price
  // balance
  // bonding
  // delta
  // fee
  // volume
  //
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

          <p>{mapBoothType()}</p>
          <p className="truncate">Booth owner</p>
        </div>
        <table className="table">
          <tbody>
            <tr>
              <th>Booth ID</th>
              <td>{Number(boothInfo.boothId)}</td>
            </tr>
            <tr>
              <th>Sol</th>
              <td>{(Number(boothInfo.sol) / LAMPORTS_PER_SOL).toFixed(3)}</td>
            </tr>
            <tr>
              <th>NFTs:</th>
              <td>{Number(boothInfo.nfts)}</td>
            </tr>
            <tr>
              <th>Curve: </th>
              <td>{Object.keys(boothInfo.curve)[0].toString()}</td>
            </tr>
            <tr>
              <th>Delta: </th>
              <td>{boothInfo.delta.toString()}</td>
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
