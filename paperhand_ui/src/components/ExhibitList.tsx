import ExhibitCard from "@/components/ExhibitCard";

import { PublicKey } from "@solana/web3.js";

interface ExhibitListProps {
  exhibits: PublicKey[];
}
export default function ExhibitList({ exhibits }: ExhibitListProps) {
  return (
    <div className="card flex-shrink-0 border border-neutral-focus shadow-lg bg-base-300 p-4">
      <h2 className="text-2xl font-extrabold">Explore Collections</h2>
      {exhibits.length > 0 ? (
        <div className="flex flex-row space-x-4">
          {exhibits.map((exhibit, ind) => (
            <ExhibitCard exhibit={exhibit} key={ind} />
          ))}
        </div>
      ) : (
        <p>No projects created yet! </p>
      )}
    </div>
  );
}
