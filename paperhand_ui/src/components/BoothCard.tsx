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
  function mapBoothType(boothInfo) {
    let type = Object.keys(boothInfo.data.boothType)[0].toString();
    if (type == "buy") {
      return "Buy " + exhibitSymbol;
    } else if (type == "sell") {
      return "Sell " + exhibitSymbol;
    } else {
      return "Trade " + exhibitSymbol;
    }
  }

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

          <p>{exhibitSymbol}</p>
        </div>
        <table className="table">
          <tbody>
            <tr>
              <th>Booth ID</th>
              <th>{Number(boothInfo.boothId)}</th>
            </tr>
            <tr>
              <th>Sol</th>
              <th>{(Number(boothInfo.sol) / LAMPORTS_PER_SOL).toFixed(3)}</th>
            </tr>
            <tr>
              <th>NFTs:</th>
              <th>{Number(boothInfo.nfts)}</th>
            </tr>
            <tr>
              <th>Curve: </th>
              <th>{Object.keys(boothInfo.curve)[0].toString()}</th>
            </tr>
            <tr>
              <th>Delta: </th>
              <th>{boothInfo.delta.toString()}</th>
            </tr>
          </tbody>
        </table>

        {Object.keys(boothInfo.boothType)[0].toString() == 0 && (
          <p>Booth type: Buy </p>
        )}
      </div>
    </div>
  );
};

export default BoothCard;
