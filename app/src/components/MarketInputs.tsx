import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

import {
  BAZAAR_PROGRAM_ID,
  decimalsVal,
  getExhibitProgramAndProvider,
} from "@/utils/constants";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getUserVoucherTokenBal } from "@/utils/retrieveData";
import { getAccount } from "@solana/spl-token";

export const SolInput = ({ userSol }: { userSol: number }) => {
  return (
    <div className="">
      <p>Sol Balance: {userSol / LAMPORTS_PER_SOL}</p>
      {/* {userSol ? ( */}
      {/*   <p>Sol Balance: {userSol / LAMPORTS_PER_SOL}</p> */}
      {/* ) : ( */}
      {/*   <p>Loading user sol bal</p> */}
      {/* )} */}
    </div>
  );
};

export const VoucherInput = ({ userVoucher }: { userVoucher: number }) => {
  console.log("user voucher", userVoucher);
  return (
    <div className="">
      <p>Voucher Balance: {userVoucher / decimalsVal}</p>
      {/* {userVoucher ? ( */}
      {/*   <p>Voucher Balance: {userVoucher / decimalsVal}</p> */}
      {/* ) : ( */}
      {/*   <p>Loading user voucher bal</p> */}
      {/* )} */}
    </div>
  );
};

export const BazaarData = ({
  marketSol,
  marketVoucher,
  exhibitSymbol,
}: {
  marketSol: number;
  marketVoucher: number;
  exhibitSymbol: string;
}) => {
  // const { connection } = useConnection();
  // const { wallet, publicKey, signTransaction } = useWallet();
  // const [marketSol, setMarketSol] = useState<number>();
  // const [marketVoucher, setMarketVoucher] = useState<number>();
  // const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  // const router = useRouter();

  // const { exhibitAddress } = router.query;

  // useEffect(() => {
  //   async function fetchData() {
  //     let exhibit = new PublicKey(exhibitAddress);

  //     let { Exhibition } = await getExhibitProgramAndProvider(wallet);

  //     let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
  //     setExhibitSymbol(exhibitInfo.exhibitSymbol);

  //     let marketTokens = new Array(2);
  //     let marketAuth;
  //     let temp;
  //     [marketAuth, temp] = await PublicKey.findProgramAddress(
  //       [Buffer.from("market_auth"), exhibit.toBuffer()],
  //       BAZAAR_PROGRAM_ID
  //     );

  //     [marketTokens[0], temp] = await PublicKey.findProgramAddress(
  //       [Buffer.from("token_voucher"), marketAuth.toBuffer()],
  //       BAZAAR_PROGRAM_ID
  //     );

  //     [marketTokens[1], temp] = await PublicKey.findProgramAddress(
  //       [Buffer.from("token_sol"), marketAuth.toBuffer()],
  //       BAZAAR_PROGRAM_ID
  //     );

  //     let marketVoucherBal = await getAccount(connection, marketTokens[0]);
  //     let marketSolBal = await connection.getBalance(marketTokens[1]);

  //     setMarketSol(Number(marketSolBal));
  //     setMarketVoucher(Number(marketVoucherBal.amount));
  //   }
  //   fetchData();
  // }, [publicKey]);

  return (
    <>
      {marketVoucher ? (
        <table className="table table-compact w-full border rounded-lg items-end">
          <tbody>
            <tr>
              <th>Base</th>
              <td>SOL</td>
            </tr>
            <tr>
              <th>Pool Liquidity (SOL)</th>
              <td>{marketSol / LAMPORTS_PER_SOL}</td>
            </tr>
            <tr>
              <th>Pool Liquidity ({exhibitSymbol})</th>
              <td>{marketVoucher / decimalsVal}</td>
            </tr>
            <tr>
              <th>LP supply</th>
              <td>temp</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p>Loading bazaar data</p>
      )}
    </>
  );
};
