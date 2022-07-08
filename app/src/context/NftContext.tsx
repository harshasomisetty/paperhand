import { PublicKey } from "@solana/web3.js";

import { createContext, useContext, useState } from "react";

export const NftContext = createContext({
  nftPubkey: PublicKey | null,
  // nftPubkey: number | null,
  setNftPubkey: async (nftPubkey) => null,
});

export const useNftContext = () => useContext(NftContext);

export const NftProvider = ({ children }) => {
  const [nftPubkey, setNftPubkey] = useState(null);

  return (
    <NftContext.Provider value={{ nftPubkey, setNftPubkey }}>
      {children}
    </NftContext.Provider>
  );
  // return <NftContext.Provider value={ { nftPubkey, setNftPubkey } }> { children } < /ThemeContext.Provider>
};
