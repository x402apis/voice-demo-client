import { Transaction, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Signer } from '@x402apis/client/dist/signers/signer';

export class BrowserWalletSigner implements Signer {
    private wallet: WalletContextState;

    constructor(wallet: WalletContextState) {
        if (!wallet.publicKey || !wallet.signTransaction) {
            throw new Error("Wallet not connected");
        }
        this.wallet = wallet;
    }

    get publicKey(): PublicKey {
        return this.wallet.publicKey!;
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        // The wallet adapter handles the popup to the user
        return await this.wallet.signTransaction!(transaction);
    }
}