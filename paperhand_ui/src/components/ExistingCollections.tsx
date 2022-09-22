import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";
import DisplayImages from "./DisplayImages";

export default function ExistingCollections({ exhibits }: { exhibits: {} }) {
  if (!exhibits) {
    return <p>loading data</p>;
  }
  console.log("exhibits", exhibits);
  return (
    <tbody>
      {Object.keys(exhibits).map((pubkey, ind) => (
        <Link href={"/carnival/" + pubkey}>
          <tr className="hover cursor-pointer" key={ind}>
            <td>
              <div className="flex items-center space-x-3">
                <p>{ind + 1}</p>
                <div className="avatar">
                  <div className="mask mask-squircle w-12 h-12">
                    <DisplayImages images={exhibits[pubkey].images} />
                  </div>
                </div>
                <p>{exhibits[pubkey].symbol}</p>
              </div>
            </td>
            <td>{Number(exhibits[pubkey].nftListings)}</td>
            <td>
              {(Number(exhibits[pubkey].floor) / LAMPORTS_PER_SOL).toFixed(3)} ◎
            </td>
            <td>
              {(Number(exhibits[pubkey].ceil) / LAMPORTS_PER_SOL).toFixed(3)} ◎
            </td>
          </tr>
        </Link>
      ))}
    </tbody>
  );
}
