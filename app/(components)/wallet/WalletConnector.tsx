/** @format */

"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@heroui/button"; // Using HeroUI button for consistency
import { truncateAddress } from "@/lib/utils";

export const WalletConnector = () => {
  const { connected, publicKey, disconnect } = useWallet();

  // If the user is not connected, show the standard connection button.
  if (!connected) {
    return <WalletMultiButton />;
  }

  // If the user IS connected, show their address and a disconnect button.
  return (
    <div className="flex items-center gap-4 p-2 border-2 border-neutral-700 bg-neutral-800 rounded-lg">
      <div className="flex-grow text-left">
        <p className="text-xs text-neutral-400">Connected as</p>
        <p className="text-sm font-mono font-bold">
          {publicKey ? truncateAddress(publicKey.toBase58(), 6) : "..."}
        </p>
      </div>
      <Button color="danger" variant="flat" onPress={() => disconnect()}>
        Disconnect
      </Button>
    </div>
  );
};
