import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const SolInput = ({ userSol }: { userSol: number }) => {
  return (
    <div className="">
      <p>Sol Balance: {userSol / LAMPORTS_PER_SOL}</p>
    </div>
  );
};

export const VoucherInput = ({ userVoucher }: { userVoucher: number }) => {
  return (
    <div className="">
      <p>Voucher Balance: {userVoucher}</p>
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
              <td>{marketVoucher}</td>
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
