import Image from "next/image";
import { useRouter } from "next/router";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import LinkButton from "@/components/LinkButton";

const navButtonAttributes = `px-4 py-2 cursor-pointer text-black hover:text-white`;

const tabs: string[] = ["home", "exhibition"];
const Navbar = () => {
  const router = useRouter();
  return (
    <div className="grid grid-cols-3 justify-between m-2 pb-4 border-b border-solid border-gray-600">
      <div className="flex flex-row items-center space-x-4 m-2 ml-4">
        {/* <Image src={logo} alt="Logo" width="64" height="64" /> */}
        <h1 className="text-4xl">NFTAMM</h1>
      </div>
      <div className="flex flex-row space-x-4 items-center justify-self-center ring-0">
        {tabs.map((tabName) => (
          <LinkButton
            key={tabName}
            name={tabName[0].toUpperCase() + tabName.slice(1)}
            link={"/" + tabName}
            attributes={`${navButtonAttributes} ${
              router.pathname.slice(1).split("/")[0] === tabName
                ? "border-b rounded"
                : ""
            } `}
          />
        ))}
      </div>
      <div className="flex justify-self-end items-center m-2 space-x-3">
        {/* <ClearData /> */}
        <WalletMultiButton />
      </div>
    </div>
  );
};

export default Navbar;
