import Link from "next/link";

const ExplainBanner = () => {
  const tabs: Record<string, string> = {
    exhibition:
      "Vault and Accounting system that creates exhibits, where nfts belonging to a particular collection can be deposited into",
    nftamm:
      "Initial implementation of how NFT trading liquidity could be improved. Converts NFTs to tokens, which can be traded to SOL in an AMM",
    checkout:
      "Provides instant liquidity to NFT sellers. Tracks NFT bidders who commit SOL, and market sells nfts to the highest bidder.",
    carnival:
      "Sudoswap reimagined on Solana, with many of the same design principles. Composes with Exhibition to offload verification process",
  };
  return (
    <div className="m-2 p-2">
      <h1 className="text-4xl font-bold mb-2">Contract Overviews</h1>
      <div className="grid grid-cols-4 space-x-2">
        {Object.keys(tabs).map((tab, ind) => (
          <div className="card bg-base-100 border shadow-xl">
            <div className="card-body">
              <h2 className="card-title">{tab}</h2>
              <p className="text-xs">{tabs[tab]}</p>
              <div className="card-actions justify-end">
                <Link href={"/" + tab}>
                  <button className="btn btn-primary btn-sm text-sm">
                    Try {tab}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExplainBanner;
